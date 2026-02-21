// BizAssist_api
// path: src/shared/quantity/quantityDecimal.ts

const DECIMAL_REGEX = /^-?\d+(?:\.\d+)?$/;

export function normalizeDecimalString(input: string): string {
	const raw = String(input ?? "").trim();
	if (!raw) throw new Error("Decimal value is required.");
	if (!DECIMAL_REGEX.test(raw) || /[eE]/.test(raw)) {
		throw new Error("Invalid decimal format.");
	}

	const sign = raw.startsWith("-") ? "-" : "";
	const unsigned = sign ? raw.slice(1) : raw;
	const [wholeRaw = "0", fracRaw = ""] = unsigned.split(".");
	const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
	const frac = fracRaw.replace(/0+$/, "");
	return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

export function parseDecimalStringToScaledInt(input: string, scale: number): bigint {
	if (!Number.isInteger(scale) || scale < 0) throw new Error("Invalid scale.");

	const normalized = normalizeDecimalString(input);
	const sign = normalized.startsWith("-") ? -1n : 1n;
	const unsigned = sign < 0n ? normalized.slice(1) : normalized;

	const [wholeRaw = "0", fracRaw = ""] = unsigned.split(".");
	if (fracRaw.length > scale) {
		throw new Error(`Too many decimal places. Max allowed is ${scale}.`);
	}

	const whole = BigInt(wholeRaw || "0");
	const fracPadded = (fracRaw + "0".repeat(scale)).slice(0, scale);
	const frac = BigInt(fracPadded || "0");
	const factor = 10n ** BigInt(scale);
	const value = whole * factor + frac;
	return sign < 0n ? -value : value;
}

export function formatScaledIntToDecimalString(value: bigint, scale: number): string {
	if (!Number.isInteger(scale) || scale < 0) throw new Error("Invalid scale.");

	const sign = value < 0n ? "-" : "";
	const abs = value < 0n ? -value : value;
	const factor = 10n ** BigInt(scale);

	const whole = abs / factor;
	const frac = abs % factor;
	if (scale === 0) return `${sign}${whole.toString()}`;

	const fracStr = frac.toString().padStart(scale, "0");
	const trimmedFrac = fracStr.replace(/0+$/, "");
	return trimmedFrac ? `${sign}${whole.toString()}.${trimmedFrac}` : `${sign}${whole.toString()}`;
}

