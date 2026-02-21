// BizAssist_api
// path: src/modules/discounts/discounts.repository.ts

import type { PrismaClient, DiscountType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { decimalLikeToMinorUnitsBigInt, formatBigIntToMinorUnitsString } from "@/shared/money/moneyMinor";
import { percentStringToBasisPoints } from "@/shared/money/percentMath";
import type { DiscountDTO } from "@/modules/discounts/discounts.types";

function normalizeDiscountNameForKey(name: string): string {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveDiscountValueMinor(row: any): bigint {
	if (row.valueMinor != null) return BigInt(row.valueMinor);
	if (row.type === "PERCENT") {
		return percentStringToBasisPoints(row.value.toString());
	}
	return decimalLikeToMinorUnitsBigInt(row.value);
}

export function toDiscountDTO(row: any): DiscountDTO {
	const valueMinor = resolveDiscountValueMinor(row);
	return {
		id: row.id,
		businessId: row.businessId,
		name: row.name,
		note: row.description ?? null,
		type: row.type,
		value: row.value.toString(), // compatibility field
		valueMinor: formatBigIntToMinorUnitsString(valueMinor),
		isStackable: row.isStackable,
		isActive: row.isActive,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export class DiscountsRepository {
	constructor(private prisma: PrismaClient) {}

	async countByBusiness(params: { businessId: string }) {
		return this.prisma.discount.count({
			where: { businessId: params.businessId },
		});
	}

	async list(params: {
		businessId: string;
		q?: string;
		type?: DiscountType;
		isActive?: boolean;
		includeArchived?: boolean;
		limit: number;
	}) {
		const { businessId, q, type, isActive, includeArchived, limit } = params;

		const rows = await this.prisma.discount.findMany({
			where: {
				businessId,
				...(type ? { type } : {}),
				...(includeArchived ? {} : typeof isActive === "boolean" ? { isActive } : { isActive: true }),
				...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
			},
			orderBy: [{ createdAt: "desc" }],
			take: limit,
		});

		return rows.map(toDiscountDTO);
	}

	async getById(params: { businessId: string; id: string }) {
		return this.prisma.discount.findFirst({
			where: { businessId: params.businessId, id: params.id },
		});
	}

	async getDtoById(params: { businessId: string; id: string }) {
		const row = await this.prisma.discount.findFirst({
			where: { businessId: params.businessId, id: params.id },
		});
		return row ? toDiscountDTO(row) : null;
	}

	async getByNameInsensitive(params: { businessId: string; name: string }) {
		const normalized = normalizeDiscountNameForKey(params.name);
		return this.prisma.discount.findFirst({
			where: {
				businessId: params.businessId,
				nameNormalized: normalized,
			},
		});
	}

	async create(params: {
		businessId: string;
		name: string;
		note: string | null;
		type: DiscountType;
		valueLegacyDecimal: string;
		valueMinor: bigint;
		isStackable: boolean;
		isActive: boolean;
	}) {
		const row = await this.prisma.discount.create({
			data: {
				businessId: params.businessId,
				name: params.name,
				nameNormalized: normalizeDiscountNameForKey(params.name),
				description: params.note,
				type: params.type,
				value: new Prisma.Decimal(params.valueLegacyDecimal),
				valueMinor: params.valueMinor,
				isStackable: params.isStackable,
				isActive: params.isActive,
			},
		});

		return toDiscountDTO(row);
	}

	async updateScoped(params: {
		businessId: string;
		id: string;
		data: {
			name?: string;
			note?: string | null;
			type?: DiscountType;
			valueLegacyDecimal?: string;
			valueMinor?: bigint;
			isStackable?: boolean;
			isActive?: boolean;
			archivedAt?: Date | null;
		};
	}) {
		return this.prisma.$transaction(async (tx) => {
			const existing = await tx.discount.findFirst({
				where: { businessId: params.businessId, id: params.id },
			});
			if (!existing) return null;

			const updated = await tx.discount.update({
				where: { id: params.id },
				data: {
					...(params.data.name !== undefined ? { name: params.data.name } : {}),
					...(params.data.name !== undefined ? { nameNormalized: normalizeDiscountNameForKey(params.data.name) } : {}),
					...(params.data.note !== undefined ? { description: params.data.note } : {}),
					...(params.data.type !== undefined ? { type: params.data.type } : {}),
					...(params.data.valueLegacyDecimal !== undefined
						? { value: new Prisma.Decimal(params.data.valueLegacyDecimal) }
						: {}),
					...(params.data.valueMinor !== undefined ? { valueMinor: params.data.valueMinor } : {}),
					...(params.data.isStackable !== undefined ? { isStackable: params.data.isStackable } : {}),
					...(params.data.isActive !== undefined ? { isActive: params.data.isActive } : {}),
					...(params.data.archivedAt !== undefined ? { archivedAt: params.data.archivedAt } : {}),
				},
			});

			return toDiscountDTO(updated);
		});
	}

	async archive(params: { businessId: string; id: string }) {
		return this.updateScoped({
			businessId: params.businessId,
			id: params.id,
			data: { isActive: false, archivedAt: new Date() },
		});
	}

	async restore(params: { businessId: string; id: string }) {
		return this.updateScoped({
			businessId: params.businessId,
			id: params.id,
			data: { isActive: true, archivedAt: null },
		});
	}
}
