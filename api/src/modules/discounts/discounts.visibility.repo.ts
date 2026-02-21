// BizAssist_api
// path: src/modules/discounts/discounts.visibility.repo.ts

import type { PrismaClient } from "@prisma/client";

export class DiscountsVisibilityRepository {
	constructor(private prisma: PrismaClient) {}

	async findHiddenIds(args: { userId: string; businessId: string }) {
		const rows = await this.prisma.discountVisibility.findMany({
			where: {
				userId: args.userId,
				businessId: args.businessId,
			},
			select: { discountId: true },
		});

		return rows.map((row) => row.discountId);
	}

	async upsertHiddenRow(args: { userId: string; businessId: string; discountId: string }) {
		return this.prisma.discountVisibility.upsert({
			where: {
				userId_businessId_discountId: {
					userId: args.userId,
					businessId: args.businessId,
					discountId: args.discountId,
				},
			},
			create: {
				userId: args.userId,
				businessId: args.businessId,
				discountId: args.discountId,
			},
			update: {},
		});
	}

	async deleteHiddenRow(args: { userId: string; businessId: string; discountId: string }) {
		return this.prisma.discountVisibility.deleteMany({
			where: {
				userId: args.userId,
				businessId: args.businessId,
				discountId: args.discountId,
			},
		});
	}

	async findDiscountById(args: { businessId: string; discountId: string }) {
		return this.prisma.discount.findFirst({
			where: {
				id: args.discountId,
				businessId: args.businessId,
			},
		});
	}

	async listVisibleDiscountsForPicker(args: { userId: string; businessId: string; q?: string }) {
		return this.prisma.discount.findMany({
			where: {
				businessId: args.businessId,
				isActive: true,
				archivedAt: null,
				...(args.q
					? {
							name: {
								contains: args.q,
								mode: "insensitive",
							},
					  }
					: {}),
				DiscountVisibility: {
					none: {
						userId: args.userId,
						businessId: args.businessId,
					},
				},
			},
			orderBy: [{ createdAt: "desc" }],
		});
	}
}
