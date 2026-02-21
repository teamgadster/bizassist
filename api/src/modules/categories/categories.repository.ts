// BizAssist_api
// path: src/modules/categories/categories.repository.ts

import type { PrismaClient } from "@prisma/client";

import type { CategoryDTO } from "@/modules/categories/categories.types";

function normalizeCategoryNameForKey(name: string): string {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function toCategoryDTO(row: any): CategoryDTO {
	return {
		id: row.id,
		businessId: row.businessId,
		name: row.name,
		color: row.color,
		sortOrder: row.sortOrder,
		isActive: row.isActive,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		productCount: typeof row?._count?.Products === "number" ? row._count.Products : (row.productCount ?? 0),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export class CategoriesRepository {
	constructor(private prisma: PrismaClient) {}

	async list(params: { businessId: string; q?: string; isActive?: boolean; limit: number }): Promise<CategoryDTO[]> {
		const { businessId, q, isActive, limit } = params;

		const rows = await this.prisma.category.findMany({
			where: {
				businessId,
				...(typeof isActive === "boolean" ? { isActive } : {}),
				...(q
					? {
							name: {
								contains: q,
								mode: "insensitive",
							},
						}
					: {}),
			},
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
			take: limit,
			include: { _count: { select: { Products: true } } },
		});

		return rows.map(toCategoryDTO);
	}

	async getById(params: { businessId: string; id: string }) {
		return this.prisma.category.findFirst({
			where: { id: params.id, businessId: params.businessId },
			include: { _count: { select: { Products: true } } },
		});
	}

	async getByName(params: { businessId: string; name: string }) {
		const normalized = normalizeCategoryNameForKey(params.name);
		return this.prisma.category.findFirst({
			where: { businessId: params.businessId, nameNormalized: normalized },
			include: { _count: { select: { Products: true } } },
		});
	}

	async countByBusiness(params: { businessId: string }) {
		return this.prisma.category.count({
			where: { businessId: params.businessId },
		});
	}

	async create(params: {
		businessId: string;
		name: string;
		color: string | null;
		sortOrder: number;
		isActive: boolean;
	}) {
		const created = await this.prisma.category.create({
			data: {
				businessId: params.businessId,
				name: params.name,
				nameNormalized: normalizeCategoryNameForKey(params.name),
				color: params.color,
				sortOrder: params.sortOrder,
				isActive: params.isActive,
				archivedAt: params.isActive ? null : new Date(),
			},
			include: { _count: { select: { Products: true } } },
		});

		return toCategoryDTO(created);
	}

	async updateScoped(params: {
		businessId: string;
		id: string;
		data: { name?: string; color?: string | null; sortOrder?: number; isActive?: boolean; archivedAt?: Date | null };
	}) {
		// Defensive scoping: ensure update cannot cross businesses even if called incorrectly.
		return this.prisma.$transaction(async (tx) => {
			const existing = await tx.category.findFirst({
				where: { id: params.id, businessId: params.businessId },
			});
			if (!existing) return null;

			const updated = await tx.category.update({
				where: { id: params.id },
				data: {
					...params.data,
					...(params.data.name !== undefined ? { nameNormalized: normalizeCategoryNameForKey(params.data.name) } : {}),
				},
				include: { _count: { select: { Products: true } } },
			});

			return toCategoryDTO(updated);
		});
	}
}
