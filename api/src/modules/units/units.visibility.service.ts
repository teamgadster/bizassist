// BizAssist_api
// path: src/modules/units/units.visibility.service.ts

import type { PrismaClient, Unit, UnitCategory } from "@prisma/client";
import { UnitSource } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { UnitsVisibilityRepository } from "@/modules/units/units.visibility.repo";

const UNIT_NOT_FOUND_CODE = "UNIT_NOT_FOUND";
const UNIT_NOT_FOUND_MESSAGE = "Unit not found.";
const UNIT_VISIBILITY_PROTECTED_CODE = "UNIT_VISIBILITY_PROTECTED";
const UNIT_VISIBILITY_PROTECTED_MESSAGE = "The protected Each (ea) unit cannot be hidden.";

const PROTECTED_EACH_NAMES = new Set(["each", "per item"]);

function normalizeLabel(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function isProtectedEachUnit(unit: { source: UnitSource; name: string; abbreviation: string }): boolean {
	if (unit.source !== UnitSource.CATALOG) return false;
	if (normalizeLabel(unit.abbreviation) !== "ea") return false;
	return PROTECTED_EACH_NAMES.has(normalizeLabel(unit.name));
}

function sortUnits(a: Unit, b: Unit): number {
	const categoryCompare = a.category.localeCompare(b.category);
	if (categoryCompare !== 0) return categoryCompare;
	return a.name.localeCompare(b.name);
}

export class UnitsVisibilityService {
	private repo: UnitsVisibilityRepository;

	constructor(private prisma: PrismaClient) {
		this.repo = new UnitsVisibilityRepository(prisma);
	}

	async listHiddenUnitIds(userId: string, businessId: string): Promise<string[]> {
		const rows = await this.repo.findHiddenIds({ userId, businessId });
		return Array.from(new Set(rows));
	}

	async hideUnit(userId: string, businessId: string, unitId: string): Promise<void> {
		const unit = await this.repo.findUnitById({ businessId, unitId });
		if (!unit) {
			throw new AppError(StatusCodes.NOT_FOUND, UNIT_NOT_FOUND_MESSAGE, UNIT_NOT_FOUND_CODE);
		}

		if (isProtectedEachUnit(unit)) {
			throw new AppError(
				StatusCodes.FORBIDDEN,
				UNIT_VISIBILITY_PROTECTED_MESSAGE,
				UNIT_VISIBILITY_PROTECTED_CODE
			);
		}

		await this.repo.upsertHiddenRow({ userId, businessId, unitId });
	}

	async restoreUnit(userId: string, businessId: string, unitId: string): Promise<void> {
		const unit = await this.repo.findUnitById({ businessId, unitId });
		if (!unit) {
			throw new AppError(StatusCodes.NOT_FOUND, UNIT_NOT_FOUND_MESSAGE, UNIT_NOT_FOUND_CODE);
		}

		await this.repo.deleteHiddenRow({ userId, businessId, unitId });
	}

	async listPickerUnits(
		userId: string,
		businessId: string,
		opts?: { category?: UnitCategory; includeHiddenSelectedUnitId?: string }
	): Promise<Unit[]> {
		const items = await this.repo.listVisibleUnitsForPicker({
			userId,
			businessId,
			category: opts?.category,
		});

		const itemMap = new Map(items.map((item) => [item.id, item]));

		const eachUnit = await this.repo.findEachUnit({ businessId });
		if (eachUnit && !itemMap.has(eachUnit.id)) {
			itemMap.set(eachUnit.id, eachUnit);
		}

		const selectedId = opts?.includeHiddenSelectedUnitId;
		if (selectedId) {
			const selected = await this.repo.findUnitById({ businessId, unitId: selectedId });
			if (selected && !itemMap.has(selected.id)) {
				itemMap.set(selected.id, selected);
			}
		}

		return Array.from(itemMap.values()).sort(sortUnits);
	}
}
