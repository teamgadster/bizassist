// BizAssist_api
// path: src/modules/units/units.visibility.repo.ts

import type { PrismaClient, UnitCategory } from "@prisma/client";
import { UnitSource } from "@prisma/client";

export class UnitsVisibilityRepository {
	constructor(private prisma: PrismaClient) {}

	async findHiddenIds(args: { userId: string; businessId: string }) {
		const rows = await this.prisma.unitVisibility.findMany({
			where: {
				userId: args.userId,
				businessId: args.businessId,
			},
			select: { unitId: true },
		});

		return rows.map((row) => row.unitId);
	}

	async upsertHiddenRow(args: { userId: string; businessId: string; unitId: string }) {
		return this.prisma.unitVisibility.upsert({
			where: {
				userId_businessId_unitId: {
					userId: args.userId,
					businessId: args.businessId,
					unitId: args.unitId,
				},
			},
			create: {
				userId: args.userId,
				businessId: args.businessId,
				unitId: args.unitId,
			},
			update: {},
		});
	}

	async deleteHiddenRow(args: { userId: string; businessId: string; unitId: string }) {
		return this.prisma.unitVisibility.deleteMany({
			where: {
				userId: args.userId,
				businessId: args.businessId,
				unitId: args.unitId,
			},
		});
	}

	async findUnitById(args: { businessId: string; unitId: string }) {
		return this.prisma.unit.findFirst({
			where: {
				id: args.unitId,
				businessId: args.businessId,
			},
		});
	}

	async findEachUnit(args: { businessId: string }) {
		return this.prisma.unit.findFirst({
			where: {
				businessId: args.businessId,
				source: UnitSource.CATALOG,
				abbreviation: { equals: "ea", mode: "insensitive" },
				name: { in: ["Each", "Per Item"], mode: "insensitive" },
			},
		});
	}

	async listVisibleUnitsForPicker(args: {
		userId: string;
		businessId: string;
		category?: UnitCategory;
	}) {
		return this.prisma.unit.findMany({
			where: {
				businessId: args.businessId,
				isActive: true,
				...(args.category ? { category: args.category } : {}),
				UnitVisibility: {
					none: {
						userId: args.userId,
						businessId: args.businessId,
					},
				},
			},
			orderBy: [{ category: "asc" }, { name: "asc" }],
		});
	}
}
