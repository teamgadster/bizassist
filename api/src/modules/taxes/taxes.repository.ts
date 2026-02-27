import { Prisma, type PrismaClient, type ProductType } from "@prisma/client";

import type { SalesTaxDTO } from "@/modules/taxes/taxes.types";

function normalizeTaxNameForKey(name: string): string {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function jsonToStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
}

export function toSalesTaxDTO(row: any): SalesTaxDTO {
	return {
		id: row.id,
		businessId: row.businessId,
		name: row.name,
		percentage: row.percentage.toString(),
		isEnabled: row.isEnabled,
		applicationMode: row.applicationMode,
		customAmounts: row.customAmounts,
		itemPricingMode: row.itemPricingMode,
		itemIds: jsonToStringArray(row.itemIds),
		serviceIds: jsonToStringArray(row.serviceIds),
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export class SalesTaxesRepository {
	constructor(private prisma: PrismaClient) {}

	async list(params: {
		businessId: string;
		q?: string;
		isEnabled?: boolean;
		includeArchived?: boolean;
		limit: number;
	}) {
		const rows = await this.prisma.salesTax.findMany({
			where: {
				businessId: params.businessId,
				...(params.includeArchived ? {} : { archivedAt: null }),
				...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
				...(typeof params.isEnabled === "boolean" ? { isEnabled: params.isEnabled } : {}),
			},
			orderBy: [{ createdAt: "desc" }],
			take: params.limit,
		});

		return rows.map(toSalesTaxDTO);
	}

	async getById(params: { businessId: string; id: string }) {
		const row = await this.prisma.salesTax.findFirst({
			where: { businessId: params.businessId, id: params.id },
		});
		return row ? toSalesTaxDTO(row) : null;
	}

	async getRecordById(params: { businessId: string; id: string }) {
		return this.prisma.salesTax.findFirst({
			where: { businessId: params.businessId, id: params.id },
		});
	}

	async create(params: {
		businessId: string;
		name: string;
		percentage: string;
		isEnabled: boolean;
		applicationMode: "ALL_TAXABLE" | "SELECT_ITEMS";
		customAmounts: boolean;
		itemPricingMode: "ADD_TO_ITEM_PRICE" | "INCLUDE_IN_ITEM_PRICE";
		itemIds: string[];
		serviceIds: string[];
	}) {
		const row = await this.prisma.salesTax.create({
			data: {
				businessId: params.businessId,
				name: params.name,
				nameNormalized: normalizeTaxNameForKey(params.name),
				percentage: new Prisma.Decimal(params.percentage),
				isEnabled: params.isEnabled,
				applicationMode: params.applicationMode,
				customAmounts: params.customAmounts,
				itemPricingMode: params.itemPricingMode,
				itemIds: params.itemIds,
				serviceIds: params.serviceIds,
			},
		});

		return toSalesTaxDTO(row);
	}

	async updateScoped(params: {
		businessId: string;
		id: string;
		data: {
			name?: string;
			percentage?: string;
			isEnabled?: boolean;
			applicationMode?: "ALL_TAXABLE" | "SELECT_ITEMS";
			customAmounts?: boolean;
			itemPricingMode?: "ADD_TO_ITEM_PRICE" | "INCLUDE_IN_ITEM_PRICE";
			itemIds?: string[];
			serviceIds?: string[];
			archivedAt?: Date | null;
		};
	}) {
		return this.prisma.$transaction(async (tx) => {
			const existing = await tx.salesTax.findFirst({
				where: { businessId: params.businessId, id: params.id },
			});
			if (!existing) return null;

			const updated = await tx.salesTax.update({
				where: { id: params.id },
				data: {
					...(params.data.name !== undefined ? { name: params.data.name } : {}),
					...(params.data.name !== undefined ? { nameNormalized: normalizeTaxNameForKey(params.data.name) } : {}),
					...(params.data.percentage !== undefined ? { percentage: new Prisma.Decimal(params.data.percentage) } : {}),
					...(params.data.isEnabled !== undefined ? { isEnabled: params.data.isEnabled } : {}),
					...(params.data.applicationMode !== undefined ? { applicationMode: params.data.applicationMode } : {}),
					...(params.data.customAmounts !== undefined ? { customAmounts: params.data.customAmounts } : {}),
					...(params.data.itemPricingMode !== undefined ? { itemPricingMode: params.data.itemPricingMode } : {}),
					...(params.data.itemIds !== undefined ? { itemIds: params.data.itemIds } : {}),
					...(params.data.serviceIds !== undefined ? { serviceIds: params.data.serviceIds } : {}),
					...(params.data.archivedAt !== undefined ? { archivedAt: params.data.archivedAt } : {}),
				},
			});

			return toSalesTaxDTO(updated);
		});
	}

	async archive(params: { businessId: string; id: string }) {
		return this.updateScoped({
			businessId: params.businessId,
			id: params.id,
			data: { archivedAt: new Date(), isEnabled: false },
		});
	}

	async restore(params: { businessId: string; id: string }) {
		return this.updateScoped({
			businessId: params.businessId,
			id: params.id,
			data: { archivedAt: null },
		});
	}

	async countProductsByIds(params: { businessId: string; ids: string[]; type: ProductType }) {
		if (!params.ids.length) return 0;
		return this.prisma.product.count({
			where: {
				businessId: params.businessId,
				type: params.type,
				isActive: true,
				id: { in: params.ids },
			},
		});
	}
}
