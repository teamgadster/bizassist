// BizAssist_mobile
// path: src/shared/decimal/decimal.ts
//
// Dependency-free decimal-string helpers for UDQI quantities (scale <= 5).
// Goals:
// - Avoid floating point comparisons (no JS Number).
// - Work with decimal strings (and best-effort tolerate null/undefined).
// - Support negatives (used for adjustments elsewhere, and safe here).
//
// NOTE: This is intentionally small and local. Do not expand into a big math library.

const MAX_SCALE = 5;

function clampScale(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(MAX_SCALE, Math.trunc(n)));
}

function splitDecimal(raw: string): { sign: 1 | -1; int: string; frac: string } {
	const s = raw.trim();
	if (!s) return { sign: 1, int: "0", frac: "" };

	let sign: 1 | -1 = 1;
	let v = s;

	if (v.startsWith("-")) {
		sign = -1;
		v = v.slice(1);
	} else if (v.startsWith("+")) {
		v = v.slice(1);
	}

	const parts = v.split(".");
	const intPartRaw = (parts[0] ?? "").replace(/\s+/g, "");
	const fracRaw = parts.length > 1 ? (parts[1] ?? "").replace(/\s+/g, "") : "";

	const int = intPartRaw.replace(/^0+(?=\d)/, "") || "0";
	const frac = fracRaw;

	return { sign, int, frac };
}

function resolveCommonScale(a: string, b: string): number {
	const fa = splitDecimal(a).frac.length;
	const fb = splitDecimal(b).frac.length;
	return clampScale(Math.max(fa, fb));
}

function toScaledBigInt(raw: string, scale: number): bigint {
	const { sign, int, frac } = splitDecimal(raw);
	const sc = clampScale(scale);

	const fracPadded = (frac ?? "").slice(0, sc).padEnd(sc, "0");
	const digits = `${int}${fracPadded}`.replace(/^0+(?=\d)/, "") || "0";

	const n = BigInt(digits);
	return sign === -1 ? -n : n;
}

export function compareDecimalStrings(a: string | null | undefined, b: string | null | undefined): -1 | 0 | 1 {
	const sa = (a ?? "0").trim() || "0";
	const sb = (b ?? "0").trim() || "0";

	const scale = resolveCommonScale(sa, sb);

	const A = toScaledBigInt(sa, scale);
	const B = toScaledBigInt(sb, scale);

	if (A === B) return 0;
	return A < B ? -1 : 1;
}

export function isZeroOrLessDecimal(v: string | null | undefined): boolean {
	return compareDecimalStrings(v, "0") <= 0;
}

export function formatDecimalForDisplay(v: string | null | undefined): string {
	const raw = (v ?? "").trim();
	if (!raw) return "0";

	const { sign, int, frac } = splitDecimal(raw);

	let f = (frac ?? "").replace(/0+$/, "");
	let out = f ? `${int}.${f}` : int;

	if (!out) out = "0";
	if (sign === -1 && out !== "0") out = `-${out}`;

	return out;
}
