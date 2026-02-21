// BizAssist_api
// path: src/shared/money/moneyMinor.ts

import { normalizeDecimalString, parseDecimalStringToScaledInt } from "@/shared/quantity/quantityDecimal";

type DecimalLike = { toString(): string };

const DIGIT_STRING_REGEX = /^\d+$/;

export function parseMinorUnitsStringToBigInt(input: string, fieldName = "amount"): bigint {
	const raw = String(input ?? "").trim();
	if (!raw) throw new Error(`${fieldName} is required.`);
	if (!DIGIT_STRING_REGEX.test(raw)) {
		throw new Error(`${fieldName} must be a digit string in minor units.`);
	}
	return BigInt(raw);
}

export function formatBigIntToMinorUnitsString(value: bigint): string {
	return value.toString();
}

export function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
	if (denominator <= 0n) throw new Error("denominator must be positive.");

	const sign = numerator < 0n ? -1n : 1n;
	const abs = numerator < 0n ? -numerator : numerator;
	const q = abs / denominator;
	const r = abs % denominator;
	const rounded = r * 2n >= denominator ? q + 1n : q;
	return sign < 0n ? -rounded : rounded;
}

export function decimalStringToMinorUnitsBigInt(input: string): bigint {
	const normalized = normalizeDecimalString(input);
	const sign = normalized.startsWith("-") ? -1n : 1n;
	const unsigned = sign < 0n ? normalized.slice(1) : normalized;
	const [wholeRaw = "0", fracRaw = ""] = unsigned.split(".");

	const whole = BigInt(wholeRaw || "0");
	const fractional = (fracRaw + "000").slice(0, 3);
	const cents = BigInt(fractional.slice(0, 2) || "0");
	const thousandth = fractional[2] ?? "0";

	let minor = whole * 100n + cents;
	if (thousandth >= "5") minor += 1n;
	return sign < 0n ? -minor : minor;
}

export function decimalLikeToMinorUnitsBigInt(value: DecimalLike | string | number | bigint): bigint {
	if (typeof value === "bigint") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("Invalid money number.");
		return decimalStringToMinorUnitsBigInt(String(value));
	}
	if (typeof value === "string") return decimalStringToMinorUnitsBigInt(value);
	return decimalStringToMinorUnitsBigInt(value.toString());
}

export function minorUnitsToDecimalString(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const abs = value < 0n ? -value : value;
	const whole = abs / 100n;
	const cents = abs % 100n;
	return `${sign}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

export function multiplyMinorByQuantityDecimal(
	unitPriceMinor: bigint,
	quantityDecimal: string,
	quantityScale = 5,
): bigint {
	if (unitPriceMinor < 0n) throw new Error("unitPriceMinor cannot be negative.");
	const qtyScaled = parseDecimalStringToScaledInt(quantityDecimal, quantityScale);
	if (qtyScaled < 0n) throw new Error("quantity cannot be negative.");
	const denominator = 10n ** BigInt(quantityScale);
	return divideRoundHalfUp(unitPriceMinor * qtyScaled, denominator);
}
