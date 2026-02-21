import type { Unit } from "@/modules/units/units.types";

export const EACH_CATALOG_ID = "ea" as const;
export const EACH_DISPLAY_NAME = "Per Piece";
export const EACH_DISPLAY_ABBR = "pc";

function normalizeUnitKey(value: unknown): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

type UnitLike = Pick<Unit, "id" | "catalogId" | "name" | "abbreviation">;

export function isEachUnitLike(unit: UnitLike | null | undefined): boolean {
	if (!unit) return false;
	const id = normalizeUnitKey(unit.id);
	const catalogId = normalizeUnitKey(unit.catalogId);
	const name = normalizeUnitKey(unit.name);
	const abbr = normalizeUnitKey(unit.abbreviation);

	return (
		id === EACH_CATALOG_ID ||
		catalogId === EACH_CATALOG_ID ||
		name === "each" ||
		name === "per piece" ||
		abbr === EACH_CATALOG_ID ||
		abbr === EACH_DISPLAY_ABBR
	);
}

export function displayUnitName(unit: UnitLike): string {
	return isEachUnitLike(unit) ? EACH_DISPLAY_NAME : unit.name;
}

export function displayUnitAbbreviation(unit: UnitLike): string {
	return isEachUnitLike(unit) ? EACH_DISPLAY_ABBR : (unit.abbreviation ?? "").trim();
}

export function displayUnitLabel(unit: UnitLike): string {
	return displayUnitName(unit).trim();
}
