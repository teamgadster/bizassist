// BizAssist_mobile
// path: src/shared/validation/gtin.ts

export const GTIN_MAX_LENGTH = 14;
export const GTIN_ALLOWED_LENGTHS = [8, 12, 13, 14] as const;

export function sanitizeGtinInput(raw: string): string {
	if (!raw) return "";
	return String(raw).replace(/\D/g, "").slice(0, GTIN_MAX_LENGTH);
}

export function isValidGtinLength(gtin: string): boolean {
	return GTIN_ALLOWED_LENGTHS.includes(gtin.length as (typeof GTIN_ALLOWED_LENGTHS)[number]);
}

export function isValidGtinChecksum(gtin: string): boolean {
	if (!/^\d+$/.test(gtin)) return false;
	if (!isValidGtinLength(gtin)) return false;

	let sum = 0;
	let shouldUseThree = false;

	for (let i = gtin.length - 1; i >= 0; i -= 1) {
		const digit = Number(gtin[i]);
		sum += shouldUseThree ? digit * 3 : digit;
		shouldUseThree = !shouldUseThree;
	}

	return sum % 10 === 0;
}

export function validateGtinValue(raw: string): { ok: true } | { ok: false; message: string } {
	const gtin = sanitizeGtinInput(raw).trim();
	if (!gtin) return { ok: true };
	if (!isValidGtinLength(gtin)) {
		return { ok: false, message: "GTIN must be 8, 12, 13, or 14 digits." };
	}
	if (!isValidGtinChecksum(gtin)) {
		return { ok: false, message: "Invalid GTIN. Please check the barcode digits." };
	}
	return { ok: true };
}
