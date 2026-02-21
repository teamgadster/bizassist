// BizAssist_mobile
// path: src/modules/pos/pos.quantity.ts
//
// POS UDQI Quantity helpers (locked)
// - Quantity is a DECIMAL STRING.
// - precisionScale (0..5) defines allowed decimals + unitStep.
// - Cart +/- are precision controls: +/- unitStep.
// - Add-to-cart uses +1 MAJOR UNIT (fast): + (10^scale) steps.
// - All math is scaled-int BigInt; no floats.

const MAX_SCALE = 5;

export type QuantityScale = 0 | 1 | 2 | 3 | 4 | 5;

export function clampPrecisionScale(scale: unknown): QuantityScale {
	const n = typeof scale === "number" ? scale : Number(scale);
	if (!Number.isFinite(n)) return 0;
	const s = Math.max(0, Math.min(MAX_SCALE, Math.trunc(n))) as QuantityScale;
	return s;
}

/**
 * Strict, transport-safe quantity validation.
 * - Only digits + optional single dot.
 * - No sign (POS cart quantities are always positive)
 * - No exponent.
 */
export function isValidQuantityString(raw: unknown): raw is string {
	if (typeof raw !== "string") return false;
	const s = raw.trim();
	if (!s) return false;
	return /^\d+(\.\d+)?$/.test(s);
}

export function normalizeQuantityString(raw: unknown, precisionScale: unknown): string {
	const scale = clampPrecisionScale(precisionScale);
	const s0 = typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
	const s = s0 || "0";

	if (!/^\d+(\.\d+)?$/.test(s)) return "0";

	const [iRaw, fRaw = ""] = s.split(".");
	const i = (iRaw ?? "0").replace(/^0+(?=\d)/, "") || "0";
	const f = (fRaw ?? "").slice(0, scale);

	const fTrim = f.replace(/0+$/, "");
	return fTrim ? `${i}.${fTrim}` : i;
}

export function toScaledInt(qty: unknown, precisionScale: unknown): bigint {
	const scale = clampPrecisionScale(precisionScale);
	const s = normalizeQuantityString(qty, scale);
	const [iRaw, fRaw = ""] = s.split(".");
	const i = (iRaw ?? "0").replace(/^0+(?=\d)/, "") || "0";
	const f = (fRaw ?? "").padEnd(scale, "0");
	const digits = `${i}${f}`.replace(/^0+(?=\d)/, "") || "0";
	return BigInt(digits);
}

export function fromScaledInt(qtyScaled: bigint, precisionScale: unknown): string {
	const scale = clampPrecisionScale(precisionScale);
	if (qtyScaled <= 0n) return "0";

	if (scale === 0) return qtyScaled.toString();

	const s = qtyScaled.toString();
	const pad = s.padStart(scale + 1, "0");
	const i = pad.slice(0, -scale) || "0";
	const f = pad.slice(-scale);
	const fTrim = f.replace(/0+$/, "");
	return fTrim ? `${i}.${fTrim}` : i;
}

export function stepScaled(precisionScale: unknown): bigint {
	clampPrecisionScale(precisionScale);
	return 1n;
}

export function majorStepScaled(precisionScale: unknown): bigint {
	const scale = clampPrecisionScale(precisionScale);
	let n = 1n;
	for (let i = 0; i < scale; i++) n *= 10n;
	return n;
}

export function addQuantityStep(qty: unknown, precisionScale: unknown, direction: 1 | -1): string {
	const scale = clampPrecisionScale(precisionScale);
	const cur = toScaledInt(qty, scale);
	const next = cur + BigInt(direction) * stepScaled(scale);
	if (next <= 0n) return "0";
	return fromScaledInt(next, scale);
}

export function addQuantityMajor(qty: unknown, precisionScale: unknown): string {
	const scale = clampPrecisionScale(precisionScale);
	const cur = toScaledInt(qty, scale);
	const next = cur + majorStepScaled(scale);
	return fromScaledInt(next, scale);
}

/**
 * Money math: (unitPriceMinor * qtyScaled) / 10^scale with HALF-UP rounding.
 */
export function lineTotalMinor(args: {
	unitPrice: string | number | null | undefined;
	quantity: string | null | undefined;
	precisionScale: unknown;
}): bigint {
	const scale = clampPrecisionScale(args.precisionScale);
	const priceMinor = toMoneyMinor(args.unitPrice);
	const qtyScaled = toScaledInt(args.quantity ?? "0", scale);
	if (qtyScaled <= 0n) return 0n;

	const numerator = priceMinor * qtyScaled;
	const denom = majorStepScaled(scale);
	return divRoundHalfUp(numerator, denom);
}

export function sumMinor(values: bigint[]): bigint {
	return values.reduce((acc, v) => acc + v, 0n);
}

export function minorToDecimalString(minor: bigint, scale = 2): string {
	const sc = Math.max(0, Math.min(6, Math.trunc(scale)));
	const sign = minor < 0n ? "-" : "";
	const abs = minor < 0n ? -minor : minor;

	if (sc === 0) return `${sign}${abs.toString()}`;
	const s = abs.toString().padStart(sc + 1, "0");
	const i = s.slice(0, -sc) || "0";
	const f = s.slice(-sc);
	return `${sign}${i}.${f}`;
}

/* ------------------------------ internals ------------------------------ */

function toMoneyMinor(v: string | number | null | undefined): bigint {
	if (v === null || v === undefined) return 0n;
	const s = typeof v === "number" ? v.toFixed(2) : String(v).trim();
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return 0n;
	const [iRaw, fRaw = ""] = s.split(".");
	const i = (iRaw ?? "0").replace(/^0+(?=\d)/, "") || "0";
	const f = (fRaw ?? "").padEnd(2, "0").slice(0, 2);
	return BigInt(`${i}${f}`.replace(/^0+(?=\d)/, "") || "0");
}

function divRoundHalfUp(numerator: bigint, denom: bigint): bigint {
	if (denom === 0n) return 0n;
	const q = numerator / denom;
	const r = numerator % denom;
	if (r === 0n) return q;

	const twoR = r < 0n ? -r * 2n : r * 2n;
	if (twoR < denom) return q;
	return numerator >= 0n ? q + 1n : q - 1n;
}
