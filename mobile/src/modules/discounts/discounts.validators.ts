// path: src/modules/discounts/discounts.validators.ts
import type { DiscountType } from "./discounts.types";
import { isPercentType } from "./discounts.constants";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeTextInput } from "@/shared/text/sanitizeText";

export function normalizeName(raw: string) {
	return sanitizeTextInput(raw, {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: true,
	});
}

export function validateName(raw: string) {
	const v = normalizeName(raw);
	if (v.length < FIELD_LIMITS.discountNameMin)
		return { ok: false as const, message: `Name must be at least ${FIELD_LIMITS.discountNameMin} characters.` };
	if (v.length > FIELD_LIMITS.discountName)
		return { ok: false as const, message: `Name must be ${FIELD_LIMITS.discountName} characters or less.` };
	return { ok: true as const, value: v };
}

export function normalizeNote(raw: string) {
	return sanitizeTextInput(raw, {
		allowNewlines: true,
		allowTabs: false,
		normalizeWhitespace: true,
	});
}

const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

export function parseDecimalString(raw: string, maxLength: number = FIELD_LIMITS.price) {
	const cleaned = raw.replace(/,/g, "").trim();
	if (!cleaned) return { ok: false as const, message: "Value is required." };
	if (!DECIMAL_RE.test(cleaned)) {
		return { ok: false as const, message: "Enter a valid number (up to 2 decimals)." };
	}
	if (cleaned.length > maxLength) {
		return { ok: false as const, message: `Value must be ${maxLength} characters or less.` };
	}
	return { ok: true as const, value: cleaned };
}

export function validateValueByType(type: DiscountType | null, value: string) {
	if (!type) return { ok: false as const, message: "Amount type is required." };

	const maxLength = isPercentType(type) ? FIELD_LIMITS.discountPercent : FIELD_LIMITS.discountAmount;
	const parsed = parseDecimalString(value, maxLength);
	if (!parsed.ok) return parsed;

	const n = Number(parsed.value);
	if (!Number.isFinite(n) || n <= 0) return { ok: false as const, message: "Value must be greater than 0." };

	if (isPercentType(type)) {
		if (n > 100) return { ok: false as const, message: "Percentage cannot exceed 100%." };
	}

	return { ok: true as const, value: parsed.value };
}
