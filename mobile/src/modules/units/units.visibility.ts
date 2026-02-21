// BizAssist_mobile
// path: src/modules/units/units.visibility.ts

import type { Unit, UnitCategory } from "@/modules/units/units.types";
import { isEachUnitLike } from "@/modules/units/units.display";

const EACH_ABBR = "ea";
const PER_PIECE_ABBR = "pc";

function normalizeKey(value: unknown): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toHiddenSet(hiddenUnitIds?: Set<string> | string[]): Set<string> {
	if (!hiddenUnitIds) return new Set();
	if (hiddenUnitIds instanceof Set) return hiddenUnitIds;
	return new Set(hiddenUnitIds.filter((id) => typeof id === "string" && id.trim()));
}

export function isProtectedEach(unit: Unit | null | undefined): boolean {
	if (!unit) return false;
	if (unit.category !== "COUNT") return false;
	if (isEachUnitLike(unit)) return true;

	const abbr = normalizeKey(unit.abbreviation);
	const name = normalizeKey(unit.name);
	const source = normalizeKey((unit as any).source);

	if (abbr === EACH_ABBR && source === "catalog") return true;
	if (abbr === EACH_ABBR) return true;
	if (name === "each") return true;
	if (abbr === PER_PIECE_ABBR) return true;
	if (name === "per piece") return true;
	return false;
}

export function getEachUnit(units: Unit[]): Unit | null {
	if (!Array.isArray(units) || units.length === 0) return null;

	const protectedMatch = units.find((u) => isProtectedEach(u));
	if (protectedMatch) return protectedMatch;

	const abbrMatch = units.find((u) => normalizeKey(u.abbreviation) === EACH_ABBR);
	if (abbrMatch) return abbrMatch;

	const perPieceAbbrMatch = units.find((u) => normalizeKey(u.abbreviation) === PER_PIECE_ABBR);
	if (perPieceAbbrMatch) return perPieceAbbrMatch;

	const nameMatch = units.find((u) => normalizeKey(u.name) === "each");
	if (nameMatch) return nameMatch;

	const perPieceNameMatch = units.find((u) => normalizeKey(u.name) === "per piece");
	return perPieceNameMatch ?? null;
}

export function applyVisibilityFilter(
	units: Unit[],
	opts: {
		hiddenUnitIds?: Set<string> | string[];
		selectedUnitId?: string;
		allowedCategories?: UnitCategory[];
		includeInactive?: boolean;
	},
): Unit[] {
	const hiddenSet = toHiddenSet(opts.hiddenUnitIds);
	const selectedId = (opts.selectedUnitId ?? "").trim();
	const allowed = opts.allowedCategories;
	const includeInactive = !!opts.includeInactive;

	return units.filter((unit) => {
		if (!includeInactive && !unit.isActive) return false;
		if (allowed && !allowed.includes(unit.category)) return false;
		if (isProtectedEach(unit)) return true;
		if (selectedId && unit.id === selectedId) return true;
		return !hiddenSet.has(unit.id);
	});
}
