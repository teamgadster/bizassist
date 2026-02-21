// BizAssist_api path: src/shared/validators/zod.shared.ts
import { z } from "zod";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { sanitizeTextInput } from "@/shared/text/sanitizeText";

type ZSanitizedStringOptions = {
	allowNewlines?: boolean;
	allowTabs?: boolean;
	normalizeWhitespace?: boolean;
};

export function zSanitizedString<TSchema extends z.ZodTypeAny>(
	schema: TSchema,
	options?: ZSanitizedStringOptions
) {
	return z.preprocess((value) => {
		if (typeof value !== "string") return value;
		return sanitizeTextInput(value, {
			allowNewlines: options?.allowNewlines,
			allowTabs: options?.allowTabs,
			normalizeWhitespace: options?.normalizeWhitespace ?? false,
		});
	}, schema);
}

/**
 * Base trimmed string WITHOUT transform effects.
 * Safe to chain .min/.max/.regex on.
 */
export function trimmedStringBase() {
	return z.string({ invalid_type_error: "Value must be text." }).trim();
}

/**
 * Trim + optional collapse whitespace (transform LAST).
 * Note: returns ZodEffects, so do NOT chain .min/.max on its return.
 * Apply constraints before calling this, or use safeLabelSchema/etc. below.
 */
export function trimmedString(opts?: { collapseWhitespace?: boolean }) {
	const collapse = opts?.collapseWhitespace ?? true;
	return zSanitizedString(trimmedStringBase(), { normalizeWhitespace: false }).transform((v: string) =>
		collapse ? v.replace(/\s+/g, " ") : v
	);
}

/**
 * Optional trimmed string: empty -> undefined
 * Output type: string | undefined
 */
export function optionalTrimmedString(opts?: {
	collapseWhitespace?: boolean;
	max?: number;
	maxMessage?: string;
	allowNewlines?: boolean;
	allowTabs?: boolean;
}) {
	const collapse = opts?.collapseWhitespace ?? true;

	// Keep base string constraints possible before transform
	let schema = trimmedStringBase();
	if (typeof opts?.max === "number") {
		schema = schema.max(opts.max, opts.maxMessage ?? `Value must be ${opts.max} characters or less.`);
	}

	return zSanitizedString(schema, {
		allowNewlines: opts?.allowNewlines ?? false,
		allowTabs: opts?.allowTabs ?? false,
		normalizeWhitespace: false,
	})
		.transform((v: string) => (collapse ? v.replace(/\s+/g, " ") : v))
		.transform((v: string) => (v === "" ? undefined : v))
		.optional();
}

/**
 * Nullish trimmed string: empty -> null
 *
 * IMPORTANT: Output type is (string | null) — no undefined.
 * If you need it optional too, call .optional() at the field site.
 *
 * This avoids the recurring TS issue where refine predicates must accept undefined.
 */
export function nullishTrimmedString(opts?: { collapseWhitespace?: boolean; allowNewlines?: boolean; allowTabs?: boolean }) {
	const collapse = opts?.collapseWhitespace ?? true;

	return zSanitizedString(trimmedStringBase(), {
		allowNewlines: opts?.allowNewlines ?? false,
		allowTabs: opts?.allowTabs ?? false,
		normalizeWhitespace: false,
	})
		.transform((v: string) => (collapse ? v.replace(/\s+/g, " ") : v))
		.transform((v: string) => (v === "" ? null : v))
		.nullable();
}

export const uuidSchema = zSanitizedString(z.string().trim().uuid("Invalid id."), {
	normalizeWhitespace: false,
});

export const iso2Schema = zSanitizedString(
	z
		.string({ invalid_type_error: `Country must be a valid ${FIELD_LIMITS.countryCode}-letter code.` })
		.trim()
		.transform((v: string) => v.toUpperCase())
		.refine(
			(v: string) => v.length === FIELD_LIMITS.countryCode && /^[A-Z]+$/.test(v),
			{ message: `Country must be a valid ${FIELD_LIMITS.countryCode}-letter code.` }
		),
	{ normalizeWhitespace: false }
);

export const iso4217Schema = zSanitizedString(
	z
		.string({ invalid_type_error: `Currency must be a valid ${FIELD_LIMITS.currencyCode}-letter code.` })
		.trim()
		.transform((v: string) => v.toUpperCase())
		.refine(
			(v: string) => v.length === FIELD_LIMITS.currencyCode && /^[A-Z]+$/.test(v),
			{ message: `Currency must be a valid ${FIELD_LIMITS.currencyCode}-letter code.` }
		),
	{ normalizeWhitespace: false }
);

/**
 * Conservative “human label” character set.
 * Allows letters, numbers, spaces, and common punctuation.
 */
export const safeLabelSchema = (min: number, max: number, fieldLabel: string) =>
	zSanitizedString(
		trimmedStringBase()
			.min(min, `${fieldLabel} must be at least ${min} characters long.`)
			.max(max, `${fieldLabel} must be ${max} characters or less.`)
			.transform((v: string) => v.replace(/\s+/g, " "))
			.refine((v: string) => /^[\p{L}\p{N}][\p{L}\p{N} .,'()&/@-]*$/u.test(v), {
				message: `${fieldLabel} contains invalid characters.`,
			}),
		{
			allowNewlines: false,
			allowTabs: false,
			normalizeWhitespace: true,
		}
	);

/**
 * SKU: business-safe identifier. No spaces by default.
 */
export const skuSchema = zSanitizedString(
	trimmedStringBase()
		.min(FIELD_LIMITS.skuMin, `SKU must be at least ${FIELD_LIMITS.skuMin} character.`)
		.max(FIELD_LIMITS.sku, `SKU must be ${FIELD_LIMITS.sku} characters or less.`)
		.refine((v: string) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v), {
			message: "SKU contains invalid characters. Use letters, numbers, dot, underscore, or dash.",
		}),
	{ normalizeWhitespace: false }
);

/**
 * Barcode: allow digits and common separators.
 */
export const barcodeSchema = zSanitizedString(
	trimmedStringBase()
		.min(FIELD_LIMITS.barcodeMin, `Barcode must be at least ${FIELD_LIMITS.barcodeMin} character.`)
		.max(FIELD_LIMITS.barcode, `Barcode must be ${FIELD_LIMITS.barcode} characters or less.`)
		.refine((v: string) => /^[0-9A-Za-z][0-9A-Za-z._:-]*$/.test(v), {
			message: "Barcode contains invalid characters.",
		}),
	{ normalizeWhitespace: false }
);

/**
 * Money governance:
 * - Accept string or number
 * - Reject scientific notation (e.g., "1e9")
 * - Enforce up to 2 decimal places
 * - Enforce non-negative
 * - Enforce max cap (prevents absurd payloads / overflow scenarios)
 *
 * Returns: number | null
 */
const MONEY_MAX = 10_000_000; // adjust as needed for your product economics

function parseMoneyStrict(raw: string): number | null {
	const s = raw.trim();
	if (s === "") return null;

	// Strict decimal format only (no commas, no scientific notation)
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;

	const n = Number(s);
	return n;
}

export const moneySchema = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((v: string | number | null | undefined) => {
		if (v == null) return null;

		if (typeof v === "number") {
			// numbers are allowed, but still enforce finite + 2dp below
			return v;
		}

		const sanitized = sanitizeTextInput(v, {
			allowNewlines: false,
			allowTabs: false,
			normalizeWhitespace: false,
		});
		const n = parseMoneyStrict(sanitized);
		return n;
	})
	.refine((n: number | null) => n === null || (Number.isFinite(n) && n >= 0), {
		message: "Amount must be a valid non-negative number.",
	})
	.refine((n: number | null) => n === null || n <= MONEY_MAX, {
		message: `Amount must be ${MONEY_MAX.toLocaleString()} or less.`,
	})
	.refine((n: number | null) => n === null || Number.isInteger(Math.round(n * 100)), {
		message: "Amount must have at most 2 decimal places.",
	});

/**
 * Idempotency key: keep it strict and log-safe.
 */
export const idempotencyKeySchema = zSanitizedString(
	trimmedStringBase()
		.min(FIELD_LIMITS.idempotencyKeyMin, `idempotencyKey must be at least ${FIELD_LIMITS.idempotencyKeyMin} characters.`)
		.max(FIELD_LIMITS.idempotencyKey, `idempotencyKey must be ${FIELD_LIMITS.idempotencyKey} characters or less.`)
		.refine((v: string) => /^[A-Za-z0-9._:-]+$/.test(v), {
			message: "idempotencyKey contains invalid characters.",
		}),
	{ normalizeWhitespace: false }
);
