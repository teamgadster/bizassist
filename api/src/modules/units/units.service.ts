// BizAssist_api
// path: src/modules/units/units.service.ts

import { Prisma, UnitCategory } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { env } from "@/core/config/env";
import { UnitsRepository } from "@/modules/units/units.repository";
import type { CreateBusinessUnitInput, ListUnitsQuery, UpdateBusinessUnitInput } from "@/modules/units/units.types";
import { getCatalogSeedById } from "@/modules/units/unitCatalog.seed";

const CATALOG_ALREADY_ENABLED_CODE = "UNIT_ALREADY_ENABLED";
const UNIT_NOT_FOUND_CODE = "UNIT_NOT_FOUND";
const UNIT_IN_USE_CODE = "UNIT_IN_USE";
const UNIT_NOT_FOUND_MESSAGE = "Unit not found.";
const UNIT_NAME_EXISTS_CODE = "UNIT_NAME_EXISTS";
const UNIT_NAME_EXISTS_MESSAGE = "Unit name already exists.";
const UNIT_ABBREVIATION_EXISTS_CODE = "UNIT_ABBREVIATION_EXISTS";
const UNIT_ABBREVIATION_EXISTS_MESSAGE = "Abbreviation already exists.";
const UNIT_PRECISION_OUT_OF_RANGE_CODE = "UNIT_PRECISION_OUT_OF_RANGE";

function isP2002(err: unknown): err is Prisma.PrismaClientKnownRequestError {
	return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Robust unique target detection:
 * Prisma meta.target can be:
 * - ["businessId", "name"]
 * - "businessId_name"
 * - "Unit_businessId_name_key"
 * - or a constraint identifier depending on version/provider
 */
function p2002TargetIncludes(err: Prisma.PrismaClientKnownRequestError, needle: string): boolean {
	const target = (err.meta as any)?.target;
	if (!target) return false;

	if (Array.isArray(target)) {
		return target.some((t) => String(t).toLowerCase().includes(needle));
	}
	return String(target).toLowerCase().includes(needle);
}

function normalizeUnitNameForKey(name: string): string {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function maxPrecisionByCategory(category: UnitCategory): number {
	if (category === UnitCategory.COUNT) return 0;
	if (category === UnitCategory.TIME) return 3;
	return 5;
}

function assertPrecisionAllowed(category: UnitCategory, precisionScale: number): void {
	const max = maxPrecisionByCategory(category);
	if (precisionScale < 0 || precisionScale > max) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			`Precision scale for ${category} must be between 0 and ${max}.`,
			UNIT_PRECISION_OUT_OF_RANGE_CODE,
			{ category, maxAllowed: max, received: precisionScale },
		);
	}
}

export class UnitsService {
	private repo: UnitsRepository;

	constructor(private prisma: PrismaClient) {
		this.repo = new UnitsRepository(prisma);
	}

	async listCatalog() {
		return this.repo.listCatalog();
	}

	async listBusinessUnits(businessId: string, query: ListUnitsQuery) {
		return this.repo.listBusinessUnits({
			businessId,
			includeArchived: !!query.includeArchived,
			category: query.category,
		});
	}

	async create(businessId: string, input: CreateBusinessUnitInput) {
		if (input.intent === "ENABLE_CATALOG") {
			const seed = getCatalogSeedById(input.catalogId);
			if (!seed) {
				throw new AppError(StatusCodes.NOT_FOUND, "Catalog unit not found.", UNIT_NOT_FOUND_CODE);
			}

			if (typeof input.precisionScale === "number") {
				assertPrecisionAllowed(seed.category, input.precisionScale);
			}

			// Ensure catalog entry exists (migration resets can wipe seed rows).
			await this.repo.upsertCatalogEntry({
				id: seed.id,
				category: seed.category,
				name: seed.name,
				abbreviation: seed.abbreviation,
				precisionScale: seed.precisionScale,
				isActive: seed.isActive,
			});

			const existingEnabled = await this.repo.findEnabledCatalogUnit({
				businessId,
				catalogId: input.catalogId,
			});
			if (existingEnabled) {
				throw new AppError(StatusCodes.CONFLICT, "Unit already enabled.", CATALOG_ALREADY_ENABLED_CODE);
			}

			try {
				return await this.repo.createEnabledCatalogUnit({
					businessId,
					catalogId: seed.id,
					category: seed.category,
					name: seed.name,
					abbreviation: seed.abbreviation,
					// FIX: UnitCatalogSeed uses "precisionScale"
					precisionScale: input.precisionScale ?? seed.precisionScale,
				});
			} catch (err) {
				// If catalog enable races, normalize as conflict
				throw new AppError(StatusCodes.CONFLICT, "Unit already enabled.", CATALOG_ALREADY_ENABLED_CODE);
			}
		}

		// CREATE_CUSTOM (idempotent in repo; revives archived units)
		assertPrecisionAllowed(input.category, input.precisionScale);

		const existingByAbbreviation = await this.repo.getBusinessUnitByAbbreviation({
			businessId,
			abbreviation: input.abbreviation,
		});
		if (
			existingByAbbreviation &&
			existingByAbbreviation.name.trim().toLowerCase() !== input.name.trim().toLowerCase()
		) {
			throw new AppError(StatusCodes.CONFLICT, UNIT_ABBREVIATION_EXISTS_MESSAGE, UNIT_ABBREVIATION_EXISTS_CODE);
		}

		const existing = await this.repo.getBusinessUnitByName({ businessId, name: input.name });
		if (!existing) {
			const totalCustom = await this.repo.countCustomUnits({ businessId });
			if (totalCustom >= env.maxCustomUnitsPerBusiness) {
				throw new AppError(
					StatusCodes.CONFLICT,
					`Custom unit limit reached (max ${env.maxCustomUnitsPerBusiness}).`,
					"CUSTOM_UNIT_LIMIT_REACHED",
					{ limit: env.maxCustomUnitsPerBusiness },
				);
			}
		}

		try {
			return await this.repo.createCustomUnitIdempotent({
				businessId,
				category: input.category,
				name: input.name,
				abbreviation: input.abbreviation,
				precisionScale: input.precisionScale,
			});
		} catch (err) {
			if (isP2002(err) && p2002TargetIncludes(err, "name")) {
				// Governance: treat duplicates as "return existing" (idempotent UX)
				const existing = await this.repo.getBusinessUnitByName({ businessId, name: input.name });
				if (existing) return existing;
				throw new AppError(StatusCodes.CONFLICT, UNIT_NAME_EXISTS_MESSAGE, UNIT_NAME_EXISTS_CODE);
			}
			throw err;
		}
	}

	async update(businessId: string, unitId: string, input: UpdateBusinessUnitInput) {
		const existing = await this.repo.getBusinessUnitById({ businessId, unitId });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, UNIT_NOT_FOUND_MESSAGE, UNIT_NOT_FOUND_CODE);
		}

		if (!existing.isActive) {
			throw new AppError(StatusCodes.CONFLICT, "Archived units are read-only.", "UNIT_ARCHIVED_READ_ONLY");
		}

		if (typeof input.precisionScale === "number") {
			assertPrecisionAllowed(existing.category, input.precisionScale);
		}

		if (typeof input.abbreviation === "string") {
			const existingByAbbreviation = await this.repo.getBusinessUnitByAbbreviation({
				businessId,
				abbreviation: input.abbreviation,
			});
			if (existingByAbbreviation && existingByAbbreviation.id !== existing.id) {
				throw new AppError(StatusCodes.CONFLICT, UNIT_ABBREVIATION_EXISTS_MESSAGE, UNIT_ABBREVIATION_EXISTS_CODE);
			}
		}

		try {
			return await this.repo.updateUnit({
				businessId,
				unitId,
				data: {
					...(typeof input.name === "string"
						? { name: input.name.trim(), nameNormalized: normalizeUnitNameForKey(input.name) }
						: {}),
					...(typeof input.abbreviation === "string" ? { abbreviation: input.abbreviation.trim() } : {}),
					...(typeof input.precisionScale === "number" ? { precisionScale: input.precisionScale } : {}),
				},
			});
		} catch (err) {
			if (isP2002(err) && (p2002TargetIncludes(err, "name") || p2002TargetIncludes(err, "namenormalized"))) {
				throw new AppError(StatusCodes.CONFLICT, UNIT_NAME_EXISTS_MESSAGE, UNIT_NAME_EXISTS_CODE);
			}
			if (isP2002(err) && p2002TargetIncludes(err, "abbreviation")) {
				throw new AppError(StatusCodes.CONFLICT, UNIT_ABBREVIATION_EXISTS_MESSAGE, UNIT_ABBREVIATION_EXISTS_CODE);
			}
			throw err;
		}
	}

	async restore(businessId: string, unitId: string) {
		const existing = await this.repo.getBusinessUnitById({ businessId, unitId });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, UNIT_NOT_FOUND_MESSAGE, UNIT_NOT_FOUND_CODE);
		}

		// Idempotent: if already active, return as-is.
		if (existing.isActive) {
			return existing;
		}

		return this.repo.restoreUnit({ businessId, unitId });
	}

	async archive(businessId: string, unitId: string) {
		const existing = await this.repo.getBusinessUnitById({ businessId, unitId });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, UNIT_NOT_FOUND_MESSAGE, UNIT_NOT_FOUND_CODE);
		}

		const inUse = await this.repo.unitIsUsedByActiveProducts({ businessId, unitId });
		if (inUse) {
			throw new AppError(
				StatusCodes.CONFLICT,
				"Unit is used by active products and cannot be archived.",
				UNIT_IN_USE_CODE,
			);
		}

		return this.repo.archiveUnit({ businessId, unitId });
	}
}
