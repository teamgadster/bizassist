// BizAssist_api
// path: src/modules/categories/categories.visibility.repo.ts

import type { PrismaClient } from "@prisma/client";

export class CategoriesVisibilityRepository {
	constructor(private prisma: PrismaClient) {}

	async findHiddenIds(args: { userId: string; businessId: string }) {
		const rows = await this.prisma.categoryVisibility.findMany({
			where: {
				userId: args.userId,
				businessId: args.businessId,
			},
			select: { categoryId: true },
		});

		return rows.map((row) => row.categoryId);
	}

	async upsertHiddenRow(args: { userId: string; businessId: string; categoryId: string }) {
		return this.prisma.categoryVisibility.upsert({
			where: {
				userId_businessId_categoryId: {
					userId: args.userId,
					businessId: args.businessId,
					categoryId: args.categoryId,
				},
			},
			create: {
				userId: args.userId,
				businessId: args.businessId,
				categoryId: args.categoryId,
			},
			update: {},
		});
	}

	async deleteHiddenRow(args: { userId: string; businessId: string; categoryId: string }) {
		return this.prisma.categoryVisibility.deleteMany({
			where: {
				userId: args.userId,
				businessId: args.businessId,
				categoryId: args.categoryId,
			},
		});
	}

	async findCategoryById(args: { businessId: string; categoryId: string }) {
		return this.prisma.category.findFirst({
			where: {
				id: args.categoryId,
				businessId: args.businessId,
			},
		});
	}

	async listVisibleCategoriesForPicker(args: { userId: string; businessId: string; q?: string }) {
		return this.prisma.category.findMany({
			where: {
				businessId: args.businessId,
				isActive: true,
				...(args.q
					? {
							name: {
								contains: args.q,
								mode: "insensitive",
							},
					  }
					: {}),
				CategoryVisibility: {
					none: {
						userId: args.userId,
						businessId: args.businessId,
					},
				},
			},
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		});
	}
}
