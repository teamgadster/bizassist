// BizAssist_api
// path: src/modules/pos/pos.repository.ts

import { PrismaClient, Prisma, DiscountType } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/core/errors/AppError";
import { minorUnitsToDecimalString } from "@/shared/money/moneyMinor";

export type PosRepoDeps = {
	prisma: PrismaClient;
};

export async function findSaleByIdempotency(deps: PosRepoDeps, businessId: string, idempotencyKey: string) {
	return deps.prisma.sale.findFirst({
		where: { businessId, idempotencyKey },
		include: { lineItems: true, payments: true, discounts: true },
	});
}

export async function getDeviceById(deps: PosRepoDeps, businessId: string, deviceId: string) {
	return deps.prisma.device.findFirst({
		where: { id: deviceId, businessId },
		select: { id: true },
	});
}

export type PosProductRow = {
	id: string;
	name: string;
	trackInventory: boolean;
	isActive: boolean;
	onHandCached: Prisma.Decimal;
	priceMinor: bigint | null;
	price: Prisma.Decimal | null;
};

export async function getProductsByIds(
	deps: PosRepoDeps,
	businessId: string,
	productIds: string[],
): Promise<PosProductRow[]> {
	if (productIds.length === 0) return [];

	return deps.prisma.product.findMany({
		where: { businessId, id: { in: productIds } },
		select: {
			id: true,
			name: true,
			trackInventory: true,
			isActive: true,
			onHandCached: true,
			priceMinor: true,
			price: true,
		},
	});
}

export type PosDiscountRow = {
	id: string;
	name: string;
	type: DiscountType;
	value: Prisma.Decimal;
	valueMinor: bigint | null;
	isActive: boolean;
	archivedAt: Date | null;
};

export async function getActiveDiscountsByIds(
	deps: PosRepoDeps,
	businessId: string,
	discountIds: string[],
): Promise<PosDiscountRow[]> {
	if (discountIds.length === 0) return [];

	return deps.prisma.discount.findMany({
		where: {
			businessId,
			id: { in: discountIds },
			isActive: true,
			archivedAt: null,
		},
		select: {
			id: true,
			name: true,
			type: true,
			value: true,
			valueMinor: true,
			isActive: true,
			archivedAt: true,
		},
	});
}

/**
 * Inventory is Decimal (UDQI Phase-1).
 */
export async function getStockByProductIds(
	deps: PosRepoDeps,
	businessId: string,
	productIds: string[],
): Promise<Record<string, Prisma.Decimal>> {
	if (productIds.length === 0) return {};

	const grouped = await deps.prisma.inventoryMovement.groupBy({
		by: ["productId"],
		where: { businessId, productId: { in: productIds } },
		_sum: { quantityDelta: true },
	});

	const map: Record<string, Prisma.Decimal> = {};
	for (const pid of productIds) map[pid] = new Prisma.Decimal(0);

	for (const row of grouped) {
		map[row.productId] = row._sum.quantityDelta ?? new Prisma.Decimal(0);
	}

	return map;
}

export type CreateCheckoutTxInput = {
	businessId: string;
	deviceId?: string;
	idempotencyKey: string;

	subtotalMinor: bigint;
	totalMinor: bigint;
	discountTotalMinor: bigint;
	taxTotalMinor: bigint;

	lineItems: Array<{
		productId: string;
		productName: string;
		quantityDecimal: Prisma.Decimal;
		quantityLegacyInt: number;
		unitPriceMinor: bigint;
		lineTotalMinor: bigint;
		selectedModifierOptionIds: string[];
		selectedAttributes: Array<{
			attributeId: string;
			optionId: string;
			attributeNameSnapshot: string;
			optionNameSnapshot: string;
		}>;
		totalModifiersDeltaMinor: bigint;
		modifiers: Array<{
			modifierOptionId: string;
			optionName: string;
			priceDeltaMinor: bigint;
		}>;
	}>;

	payments: Array<{
		method: "CASH" | "EWALLET" | "BANK_TRANSFER" | "OTHER";
		amountMinor: bigint;
	}>;

	discounts: Array<{
		discountId: string | null;
		scope: "SALE" | "LINE_ITEM";
		nameSnapshot: string;
		typeSnapshot: "PERCENT" | "FIXED";
		valueSnapshotMinor: bigint;
		amountAppliedMinor: bigint;
		valueSnapshotLegacyDecimal: string;
		amountAppliedLegacyDecimal: string;
	}>;

	movements: Array<{
		productId: string;
		quantityDelta: Prisma.Decimal;
		reason: "SALE";
		idempotencyKey: string;
		enforceNonNegative: boolean;
	}>;
};

export async function createCheckoutTransaction(deps: PosRepoDeps, input: CreateCheckoutTxInput) {
	return deps.prisma.$transaction(async (tx) => {
		const sale = await tx.sale.create({
			data: {
				businessId: input.businessId,
				deviceId: input.deviceId ?? null,
				idempotencyKey: input.idempotencyKey,
				subtotalMinor: input.subtotalMinor,
				totalMinor: input.totalMinor,
				discountTotalMinor: input.discountTotalMinor,
				taxTotalMinor: input.taxTotalMinor,
				// Legacy dual-write fields.
				subtotal: new Prisma.Decimal(minorUnitsToDecimalString(input.subtotalMinor)),
				total: new Prisma.Decimal(minorUnitsToDecimalString(input.totalMinor)),
				discountTotal: new Prisma.Decimal(minorUnitsToDecimalString(input.discountTotalMinor)),
				taxTotal: new Prisma.Decimal(minorUnitsToDecimalString(input.taxTotalMinor)),
				status: "COMPLETED",
				lineItems: {
					create: input.lineItems.map((li) => ({
						product: { connect: { id: li.productId } },
						productName: li.productName,
						quantityV2: li.quantityDecimal,
						quantity: li.quantityLegacyInt,
						unitPrice: new Prisma.Decimal(minorUnitsToDecimalString(li.unitPriceMinor)),
						lineTotal: new Prisma.Decimal(minorUnitsToDecimalString(li.lineTotalMinor)),
						selectedModifierOptionIds: li.selectedModifierOptionIds,
						selectedAttributes: li.selectedAttributes,
						totalModifiersDeltaMinor: li.totalModifiersDeltaMinor,
						modifiers: {
							create: li.modifiers.map((modifier) => ({
								businessId: input.businessId,
								modifierOptionId: modifier.modifierOptionId,
								optionName: modifier.optionName,
								priceDeltaMinor: modifier.priceDeltaMinor,
							})),
						},
					})),
				},
				payments: {
					create: input.payments.map((p) => ({
						method: p.method,
						amountMinor: p.amountMinor,
						amount: new Prisma.Decimal(minorUnitsToDecimalString(p.amountMinor)),
					})),
				},
				discounts: {
					create: input.discounts.map((d) => ({
						businessId: input.businessId,
						discountId: d.discountId,
						scope: d.scope,
						nameSnapshot: d.nameSnapshot,
						typeSnapshot: d.typeSnapshot,
						valueSnapshotMinor: d.valueSnapshotMinor,
						amountAppliedMinor: d.amountAppliedMinor,
						valueSnapshot: new Prisma.Decimal(d.valueSnapshotLegacyDecimal),
						amountApplied: new Prisma.Decimal(d.amountAppliedLegacyDecimal),
					})),
				},
			},
			include: { lineItems: true, payments: true, discounts: true },
		});

		for (const movement of input.movements) {
			const updateWhere: Prisma.ProductWhereInput = {
				id: movement.productId,
				businessId: input.businessId,
			};

			if (movement.enforceNonNegative && movement.quantityDelta.isNegative()) {
				updateWhere.onHandCached = { gte: movement.quantityDelta.abs() };
			}

			const updated = await tx.product.updateMany({
				where: updateWhere,
				data: { onHandCached: { increment: movement.quantityDelta } },
			});

			if (updated.count !== 1) {
				throw new AppError(
					StatusCodes.CONFLICT,
					`Insufficient stock for productId=${movement.productId}.`,
					"OUT_OF_STOCK",
				);
			}
		}

		await tx.inventoryMovement.createMany({
			data: input.movements.map((m) => ({
				businessId: input.businessId,
				productId: m.productId,
				quantityDelta: m.quantityDelta,
				reason: "SALE",
				idempotencyKey: m.idempotencyKey,
				relatedSaleId: sale.id,
			})),
		});

		return sale;
	});
}
