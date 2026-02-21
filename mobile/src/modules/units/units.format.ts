// BizAssist_mobile
// path: src/modules/units/units.format.ts
//
// Enterprise-grade hardening:
// - Add a tiny type guard for UnitDisplayInput shapes.
// - Make unit meta resolution resilient across DTO variants.
// - Keep existing behavior for "Each (ea)" mapping to pc/pcs for display tokens.
// - Add precisionPlaceholder() (safe "0.00" style) while keeping precisionHint() for legacy uses.

export function precisionHint(scale: number): string {
	const s = Math.max(0, Math.min(5, Math.trunc(scale)));
	if (s === 0) return "1";
	return "." + "0".repeat(s);
}

/**
 * Use this for input placeholders (e.g., "0", "0.00", "0.00000").
 * Keeps UX unambiguous vs precisionHint() which historically returned "1" for scale=0.
 */
export function precisionPlaceholder(scale: number): string {
	const s = Math.max(0, Math.min(5, Math.trunc(scale)));
	if (s === 0) return "0";
	return "0." + "0".repeat(s);
}

export function unitLabel(name: string, abbr?: string | null): string {
	const normalizedName = name.trim().toLowerCase();
	const normalizedAbbr = (abbr ?? "").trim().toLowerCase();
	const displayName = normalizedName === "each" || normalizedAbbr === "ea" ? "Each" : name;
	return displayName;
}

export type UnitDisplayContext = "quantity" | "pricing";

export type UnitDisplayInput = {
	// Common flat DTO shapes
	unitId?: string | null;
	unitName?: string | null;
	unitAbbreviation?: string | null;

	// Nested relation shape (sometimes returned by API/mapper)
	unit?: { id?: string | null; name?: string | null; abbreviation?: string | null } | null;

	// Alternate flat names (other DTOs)
	id?: string | null;
	name?: string | null;
	abbreviation?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Tiny type guard so callers can explicitly validate before formatting.
 * This prevents “random object” shapes from silently producing weird tokens.
 */
export function isUnitDisplayInput(value: unknown): value is UnitDisplayInput {
	if (!isRecord(value)) return false;

	// Allow empty object (callers may progressively fill fields), but only if no obviously wrong types exist.
	const hasKnownKey =
		"unitId" in value ||
		"unitName" in value ||
		"unitAbbreviation" in value ||
		"unit" in value ||
		"id" in value ||
		"name" in value ||
		"abbreviation" in value;

	if (!hasKnownKey) return false;

	// If present, ensure scalar fields are string/null/undefined
	const scalarOk = (k: string) => {
		const v = (value as any)[k];
		return v === undefined || v === null || typeof v === "string";
	};

	if (!scalarOk("unitId")) return false;
	if (!scalarOk("unitName")) return false;
	if (!scalarOk("unitAbbreviation")) return false;
	if (!scalarOk("id")) return false;
	if (!scalarOk("name")) return false;
	if (!scalarOk("abbreviation")) return false;

	// Nested "unit" can be null/undefined/object with optional scalar strings
	const u = (value as any).unit;
	if (u === undefined || u === null) return true;
	if (!isRecord(u)) return false;

	const nestedOk =
		(u.id === undefined || u.id === null || typeof u.id === "string") &&
		(u.name === undefined || u.name === null || typeof u.name === "string") &&
		(u.abbreviation === undefined || u.abbreviation === null || typeof u.abbreviation === "string");

	return nestedOk;
}

function normalizeToken(value: unknown): string {
	if (typeof value !== "string") return "";
	return value.trim();
}

function resolveUnitMeta(input: UnitDisplayInput | null | undefined) {
	const base = input && typeof input === "object" ? input : null;
	const nested = base?.unit && typeof base.unit === "object" ? base.unit : null;

	const idRaw = normalizeToken(base?.unitId ?? base?.id ?? nested?.id);
	const name = normalizeToken(base?.unitName ?? base?.name ?? nested?.name);
	const abbr = normalizeToken(base?.unitAbbreviation ?? base?.abbreviation ?? nested?.abbreviation);

	// Normalize id token for comparisons only; preserve original strings elsewhere.
	const id = idRaw.toLowerCase();

	return { id, name, abbr };
}

function isEachUnit(meta: { id: string; name: string; abbr: string }): boolean {
	// Protected canonical id token
	if (meta.id === "ea") return true;

	const normalizedName = meta.name.toLowerCase();
	const normalizedAbbr = meta.abbr.toLowerCase();

	return normalizedName === "each" || normalizedAbbr === "ea" || normalizedAbbr === "each";
}

function isSingularQuantity(value: unknown): boolean {
	if (value === null || value === undefined) return false;

	if (typeof value === "bigint") return value === 1n || value === -1n;

	if (typeof value === "number") {
		if (!Number.isFinite(value)) return false;
		if (!Number.isInteger(value)) return false;
		return Math.abs(value) === 1;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return false;

		// decimals are plural (including "1.0")
		if (/^-?\d+\.\d+$/.test(trimmed)) return false;

		if (!/^-?\d+$/.test(trimmed)) return false;

		const n = Number(trimmed);
		return Number.isFinite(n) && Math.abs(n) === 1;
	}

	return false;
}

/**
 * Returns the unit token to display.
 * - context="pricing": returns a consistent pricing unit token
 * - context="quantity": returns pluralization-aware token for "Each"
 *
 * Special policy:
 * - "Each (ea)" displays as "pc/pcs" (legacy BizAssist rule).
 */
export function unitDisplayToken(
	input: UnitDisplayInput | null | undefined,
	context: UnitDisplayContext,
	quantity?: unknown,
): string | null {
	const meta = resolveUnitMeta(input);
	const hasAny = !!(meta.id || meta.name || meta.abbr);
	if (!hasAny) return null;

	if (isEachUnit(meta)) {
		if (context === "pricing") return "pc";
		return isSingularQuantity(quantity) ? "pc" : "pcs";
	}

	if (meta.abbr) return meta.abbr;
	if (meta.name) return meta.name;

	return null;
}
