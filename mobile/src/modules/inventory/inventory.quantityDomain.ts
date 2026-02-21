// BizAssist_mobile
// path: src/modules/inventory/inventory.quantityDomain.ts
//
// Enterprise-grade quantity domain typing:
// - Distinguish *scaled-int* (legacy API compatibility) vs *decimal string* (UDQI transport).
// - Branded types prevent accidental cross-wiring.
// - Keep helpers tiny, predictable, and dependency-free.

export type Brand<K, T> = K & { readonly __brand: T };

// Legacy compatibility representation (e.g., int stored or sent for older endpoints)
export type ScaledIntQuantity = Brand<number, "ScaledIntQuantity">;

// UDQI representation (exact decimal string, e.g., "12", "12.00", "0.125")
export type DecimalQuantityString = Brand<string, "DecimalQuantityString">;

export function asScaledIntQuantity(value: number): ScaledIntQuantity {
	// Intentionally minimal: callers enforce scale separately.
	// This is purely to prevent “string masquerading as scaled int” mistakes.
	const n = Number(value);
	return (Number.isFinite(n) ? n : 0) as ScaledIntQuantity;
}

const DECIMAL_STRING_RE = /^-?\d+(?:\.\d+)?$/;

export function isDecimalQuantityString(value: unknown): value is DecimalQuantityString {
	if (typeof value !== "string") return false;
	const s = value.trim();
	if (!s) return false;
	return DECIMAL_STRING_RE.test(s);
}

export function asDecimalQuantityString(value: string): DecimalQuantityString {
	const s = String(value ?? "").trim();
	if (!DECIMAL_STRING_RE.test(s)) return "0" as DecimalQuantityString;
	return s as DecimalQuantityString;
}

/**
 * Convenience helpers for naming clarity at the domain boundary.
 * Use these when shaping DTOs so field names make the unit obvious.
 */
export type OnHandScaledInt = ScaledIntQuantity;
export type ReorderPointScaledInt = ScaledIntQuantity;
export type QuantityDeltaScaledInt = ScaledIntQuantity;

export type OnHandDecimal = DecimalQuantityString;
export type ReorderPointDecimal = DecimalQuantityString;
export type QuantityDeltaDecimal = DecimalQuantityString;
