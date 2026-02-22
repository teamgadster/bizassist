// path: src/modules/catalog/catalog.repository.ts
import { Prisma, InventoryMovementReason } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { CATALOG_LIST_MAX_LIMIT } from "@/shared/catalogLimits";

const SKU_PAD_LENGTH = 6;

function formatSku(prefix: string, n: number): string {
	const safe = Number.isFinite(n) ? Math.trunc(n) : 0;
	return `${prefix}${String(Math.max(0, safe)).padStart(SKU_PAD_LENGTH, "0")}`;
}

const PRODUCT_INCLUDE = {
	Unit: true,
	Category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{
	include: typeof PRODUCT_INCLUDE;
}>;

export class CatalogRepository {
	constructor(private prisma: PrismaClient) {}

	private async replaceProductModifierGroupsTx(params: {
		tx: Prisma.TransactionClient;
		businessId: string;
		productId: string;
		modifierGroupIds?: string[];
	}) {
		if (!Array.isArray(params.modifierGroupIds)) return;
		await params.tx.productModifierGroup.deleteMany({ where: { businessId: params.businessId, productId: params.productId } });
		if (params.modifierGroupIds.length === 0) return;
		await params.tx.productModifierGroup.createMany({
			data: params.modifierGroupIds.map((modifierGroupId, idx) => ({
				businessId: params.businessId,
				productId: params.productId,
				modifierGroupId,
				sortOrder: idx,
			})),
		});
	}

	async listProducts(params: {
		businessId: string;
		q?: string;
		type?: "PHYSICAL" | "SERVICE";
		limit: number;
		cursor?: string | null;
		isActive?: boolean;
		includeArchived?: boolean;
	}) {
		const where: Prisma.ProductWhereInput = {
			businessId: params.businessId,
		};

		// Lifecycle filtering governance:
		// - default: active only
		// - includeArchived=true: include both active + archived unless isActive is explicitly provided
		if (typeof params.isActive === "boolean") {
			where.isActive = params.isActive;
		} else if (!params.includeArchived) {
			where.isActive = true;
		}
		if (params.type === "PHYSICAL" || params.type === "SERVICE") {
			where.type = params.type;
		}

		const search = params.q?.trim();
		if (search) {
			// Keep search index-friendly for large catalogs:
			// - name: prefix match (businessId + name index)
			// - sku/barcode: exact + prefix (business-scoped unique indexes)
			where.OR = [
				{ name: { startsWith: search } },
				{ sku: { equals: search } },
				{ sku: { startsWith: search } },
				{ barcode: { equals: search } },
				{ barcode: { startsWith: search } },
			];
		}

		const take = Math.min(Math.max(params.limit, 1), CATALOG_LIST_MAX_LIMIT);

		const items = await this.prisma.product.findMany({
			where,
			include: PRODUCT_INCLUDE,
			orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
			take: take + 1,
			...(params.cursor
				? {
						cursor: { id: params.cursor },
						skip: 1,
					}
				: {}),
		});

		let nextCursor: string | null = null;
		if (items.length > take) {
			const next = items.pop()!;
			nextCursor = next.id;
		}

		return { items: items as ProductWithRelations[], nextCursor };
	}

	async countProductsByBusiness(params: { businessId: string }): Promise<number> {
		return this.prisma.product.count({
			where: { businessId: params.businessId },
		});
	}

	async getProductById(params: { businessId: string; id: string }): Promise<ProductWithRelations | null> {
		return this.prisma.product.findFirst({
			where: { businessId: params.businessId, id: params.id },
			include: PRODUCT_INCLUDE,
		});
	}

	async findProductBySku(params: { businessId: string; sku: string }) {
		return this.prisma.product.findFirst({
			where: { businessId: params.businessId, sku: params.sku },
			select: { id: true },
		});
	}

	async findProductByBarcode(params: { businessId: string; barcode: string }) {
		return this.prisma.product.findFirst({
			where: { businessId: params.businessId, barcode: params.barcode },
			select: { id: true },
		});
	}

	async ensureBusinessScopedUniqueness(params: {
		businessId: string;
		sku: string | null;
		barcode: string | null;
		excludeProductId: string;
	}) {
		const or: Prisma.ProductWhereInput[] = [];

		if (params.sku) {
			or.push({ businessId: params.businessId, sku: params.sku, NOT: { id: params.excludeProductId } });
		}
		if (params.barcode) {
			or.push({ businessId: params.businessId, barcode: params.barcode, NOT: { id: params.excludeProductId } });
		}

		if (or.length === 0) return { ok: true as const };

		const hit = await this.prisma.product.findFirst({
			where: { OR: or },
			select: { id: true, sku: true, barcode: true },
		});

		if (!hit) return { ok: true as const };

		return {
			ok: false as const,
			conflict: {
				productId: hit.id,
				sku: hit.sku ?? null,
				barcode: hit.barcode ?? null,
			},
		};
	}

	async updateProduct(params: {
		id: string;
		data: Prisma.ProductUncheckedUpdateInput;
		modifierGroupIds?: string[];
	}): Promise<ProductWithRelations> {
		return this.prisma.$transaction(async (tx) => {
			const updated = await tx.product.update({
				where: { id: params.id },
				data: params.data,
				include: PRODUCT_INCLUDE,
			});
			await this.replaceProductModifierGroupsTx({
				tx,
				businessId: updated.businessId,
				productId: updated.id,
				modifierGroupIds: params.modifierGroupIds,
			});
			return updated;
		});
	}

	async createProductWithInitialStock(params: {
		product: Prisma.ProductUncheckedCreateInput;
		initialOnHand: string | null; // decimal string
		modifierGroupIds?: string[];
	}): Promise<ProductWithRelations> {
		return this.prisma.$transaction(async (tx) => {
			const created = await tx.product.create({
				data: params.product,
				// NOTE: we intentionally DO NOT rely on include here; we refetch after stock movement.
				select: { id: true, businessId: true, storeId: true },
			});

			if (params.initialOnHand && params.initialOnHand !== "0") {
				// Create STOCK_IN movement + apply increment to onHandCached (Decimal)
				await tx.inventoryMovement.create({
					data: {
						businessId: created.businessId,
						productId: created.id,
						storeId: created.storeId ?? null,
						quantityDelta: new Prisma.Decimal(params.initialOnHand),
						reason: InventoryMovementReason.STOCK_IN,
						idempotencyKey: null,
						relatedSaleId: null,
					},
				});

				await tx.product.update({
					where: { id: created.id },
					data: {
						onHandCached: { increment: new Prisma.Decimal(params.initialOnHand) },
						updatedAt: new Date(),
					},
					select: { id: true },
				});
			}

			await this.replaceProductModifierGroupsTx({
				tx,
				businessId: created.businessId,
				productId: created.id,
				modifierGroupIds: params.modifierGroupIds,
			});

			// ✅ Hard guarantee: mapper always gets Unit + Category, never “half a product”
			const full = await tx.product.findUnique({
				where: { id: created.id },
				include: PRODUCT_INCLUDE,
			});

			// Should never be null inside the transaction; keep a defensive guard.
			if (!full) {
				throw new Error("Invariant violated: created product not found after create.");
			}

			return full as ProductWithRelations;
		});
	}

	async createProductWithAutoSku(params: {
		businessId: string;
		product: Omit<Prisma.ProductUncheckedCreateInput, "sku">;
		initialOnHand: string | null; // decimal string
		modifierGroupIds?: string[];
		skuPrefix: string;
	}): Promise<ProductWithRelations | null> {
		return this.prisma.$transaction(async (tx) => {
			// Business-scoped counter (deterministic SKU generation)
			const counter = await tx.businessCounter.upsert({
				where: { businessId: params.businessId },
				create: { businessId: params.businessId, nextProductSkuNumber: 2 },
				update: { nextProductSkuNumber: { increment: 1 } },
				select: { nextProductSkuNumber: true },
			});

			// If we created with next=2, the SKU number we just reserved is 1.
			const reservedNumber = counter.nextProductSkuNumber - 1;
			const sku = formatSku(params.skuPrefix, reservedNumber);

			const created = await tx.product.create({
				data: {
					...params.product,
					businessId: params.businessId,
					sku,
				},
				select: { id: true, businessId: true, storeId: true },
			});

			if (params.initialOnHand && params.initialOnHand !== "0") {
				await tx.inventoryMovement.create({
					data: {
						businessId: created.businessId,
						productId: created.id,
						storeId: created.storeId ?? null,
						quantityDelta: new Prisma.Decimal(params.initialOnHand),
						reason: InventoryMovementReason.STOCK_IN,
						idempotencyKey: null,
						relatedSaleId: null,
					},
				});

				await tx.product.update({
					where: { id: created.id },
					data: {
						onHandCached: { increment: new Prisma.Decimal(params.initialOnHand) },
						updatedAt: new Date(),
					},
					select: { id: true },
				});
			}

			await this.replaceProductModifierGroupsTx({
				tx,
				businessId: created.businessId,
				productId: created.id,
				modifierGroupIds: params.modifierGroupIds,
			});

			const full = await tx.product.findUnique({
				where: { id: created.id },
				include: PRODUCT_INCLUDE,
			});

			if (!full) {
				throw new Error("Invariant violated: created product not found after create.");
			}

			return full as ProductWithRelations;
		});
	}

	async getWatermark(params: { businessId: string }) {
		const [p, m] = await this.prisma.$transaction([
			this.prisma.product.aggregate({
				where: { businessId: params.businessId },
				_max: { updatedAt: true },
			}),
			this.prisma.inventoryMovement.aggregate({
				where: { businessId: params.businessId },
				_max: { createdAt: true },
			}),
		]);

		return {
			lastProductUpdatedAt: p._max.updatedAt ?? null,
			lastInventoryMovementAt: m._max.createdAt ?? null,
		};
	}
}
