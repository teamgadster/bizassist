// BizAssist_api
// path: src/modules/units/units.repository.ts

import { PrismaClient, UnitCategory, UnitSource } from "@prisma/client";

function normalizeUnitNameForKey(name: string): string {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export class UnitsRepository {
	constructor(private prisma: PrismaClient) {}

	async listCatalog() {
		return this.prisma.unitCatalog.findMany({
			where: { isActive: true },
			orderBy: [{ category: "asc" }, { name: "asc" }],
		});
	}

	async getCatalogById(args: { catalogId: string }) {
		return this.prisma.unitCatalog.findUnique({
			where: { id: args.catalogId },
		});
	}

	async upsertCatalogEntry(args: {
		id: string;
		category: UnitCategory;
		name: string;
		abbreviation: string;
		precisionScale: number;
		isActive: boolean;
	}) {
		return this.prisma.unitCatalog.upsert({
			where: { id: args.id },
			create: {
				id: args.id,
				category: args.category,
				name: args.name,
				abbreviation: args.abbreviation,
				precisionScale: args.precisionScale,
				isActive: args.isActive,
			},
			update: {
				category: args.category,
				name: args.name,
				abbreviation: args.abbreviation,
				precisionScale: args.precisionScale,
				isActive: args.isActive,
			},
		});
	}

	async listBusinessUnits(args: { businessId: string; includeArchived: boolean; category?: UnitCategory }) {
		return this.prisma.unit.findMany({
			where: {
				businessId: args.businessId,
				...(args.includeArchived ? {} : { isActive: true }),
				...(args.category ? { category: args.category } : {}),
			},
			orderBy: [{ category: "asc" }, { name: "asc" }],
		});
	}

	async countCustomUnits(args: { businessId: string }) {
		return this.prisma.unit.count({
			where: {
				businessId: args.businessId,
				source: UnitSource.CUSTOM,
			},
		});
	}

	async getBusinessUnitById(args: { businessId: string; unitId: string }) {
		return this.prisma.unit.findFirst({
			where: {
				id: args.unitId,
				businessId: args.businessId,
			},
		});
	}

	/**
	 * IMPORTANT:
	 * - We treat Unit.name as unique per business (db constraint).
	 * - Use case-insensitive match to prevent "Each" vs "each" duplicates (Postgres supports this via Prisma mode: "insensitive").
	 */
	async getBusinessUnitByName(args: { businessId: string; name: string }) {
		const name = args.name.trim();
		if (!name) return null;

		return this.prisma.unit.findFirst({
			where: {
				businessId: args.businessId,
				nameNormalized: normalizeUnitNameForKey(name),
			},
		});
	}

	async getBusinessUnitByAbbreviation(args: { businessId: string; abbreviation: string }) {
		const abbreviation = args.abbreviation.trim();
		if (!abbreviation) return null;

		return this.prisma.unit.findFirst({
			where: {
				businessId: args.businessId,
				abbreviation: { equals: abbreviation, mode: "insensitive" },
			},
		});
	}

	async findEnabledCatalogUnit(args: { businessId: string; catalogId: string }) {
		return this.prisma.unit.findFirst({
			where: {
				businessId: args.businessId,
				catalogId: args.catalogId,
				isActive: true,
			},
		});
	}

	async createEnabledCatalogUnit(args: {
		businessId: string;
		catalogId: string;
		category: UnitCategory;
		name: string;
		abbreviation: string;
		precisionScale: number;
	}) {
		return this.prisma.unit.create({
			data: {
				businessId: args.businessId,
				source: UnitSource.CATALOG,
				catalogId: args.catalogId,
				category: args.category,
				name: args.name,
				nameNormalized: normalizeUnitNameForKey(args.name),
				abbreviation: args.abbreviation,
				precisionScale: args.precisionScale,
				isActive: true,
			},
		});
	}

	/**
	 * Idempotent custom-unit create:
	 * - If unit with same name already exists:
	 *   - If archived: revive + update fields (category/abbr/precision)
	 *   - If active: return existing as-is (or update mutables if desired)
	 */
	async createCustomUnitIdempotent(args: {
		businessId: string;
		category: UnitCategory;
		name: string;
		abbreviation: string;
		precisionScale: number;
	}) {
		const name = args.name.trim();
		const abbr = args.abbreviation.trim();

		const existing = await this.getBusinessUnitByName({ businessId: args.businessId, name });
		if (existing) {
			if (!existing.isActive) {
				return this.prisma.unit.update({
					where: { id: existing.id },
					data: {
						isActive: true,
						category: args.category,
						name: name,
						nameNormalized: normalizeUnitNameForKey(name),
						abbreviation: abbr,
						precisionScale: args.precisionScale,
					},
				});
			}
			return existing;
		}

		return this.prisma.unit.create({
			data: {
				businessId: args.businessId,
				source: UnitSource.CUSTOM,
				catalogId: null,
				category: args.category,
				name,
				nameNormalized: normalizeUnitNameForKey(name),
				abbreviation: abbr,
				precisionScale: args.precisionScale,
				isActive: true,
			},
		});
	}

	async updateUnit(args: {
		businessId: string;
		unitId: string;
		data: { name?: string; nameNormalized?: string; abbreviation?: string; precisionScale?: number };
	}) {
		return this.prisma.unit.update({
			where: { id: args.unitId },
			data: args.data,
		});
	}

	async archiveUnit(args: { businessId: string; unitId: string }) {
		const existing = await this.getBusinessUnitById({ businessId: args.businessId, unitId: args.unitId });
		if (!existing) return null;

		return this.prisma.unit.update({
			where: { id: args.unitId },
			data: { isActive: false },
		});
	}

	async restoreUnit(args: { businessId: string; unitId: string }) {
		const existing = await this.getBusinessUnitById({ businessId: args.businessId, unitId: args.unitId });
		if (!existing) return null;

		return this.prisma.unit.update({
			where: { id: args.unitId },
			data: { isActive: true },
		});
	}

	async unitIsUsedByActiveProducts(args: { businessId: string; unitId: string }) {
		const count = await this.prisma.product.count({
			where: {
				businessId: args.businessId,
				unitId: args.unitId,
				isActive: true,
			},
		});
		return count > 0;
	}
}
