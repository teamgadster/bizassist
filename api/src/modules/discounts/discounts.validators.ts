// BizAssist_api
// path: src/modules/discounts/discounts.validators.ts

import { z } from "zod";
import { percentStringToBasisPoints } from "@/shared/money/percentMath";
import { parseMinorUnitsStringToBigInt } from "@/shared/money/moneyMinor";
import { trimmedStringBase, uuidSchema, zSanitizedString } from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

const nameSchema = zSanitizedString(
	trimmedStringBase()
		.min(FIELD_LIMITS.discountNameMin, `Name must be at least ${FIELD_LIMITS.discountNameMin} characters.`)
		.max(FIELD_LIMITS.discountName, `Name must be ${FIELD_LIMITS.discountName} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
);

const noteSchema = zSanitizedString(
	trimmedStringBase().max(FIELD_LIMITS.discountNote, `Note must be ${FIELD_LIMITS.discountNote} characters or less.`),
	{ allowNewlines: true, allowTabs: false, normalizeWhitespace: true },
);

const discountTypeSchema = z.enum(["PERCENT", "FIXED"]);

const legacyDecimalString = zSanitizedString(
	trimmedStringBase()
		.regex(/^\d+(\.\d{1,2})?$/, "Invalid value format. Use decimals up to 2 places.")
		.max(FIELD_LIMITS.price, `Value must be ${FIELD_LIMITS.price} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const minorUnitsString = zSanitizedString(
	trimmedStringBase().regex(/^\d+$/, "Minor-unit value must be a digit string.").max(24, "Minor-unit value is too long."),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

export const listDiscountsQuerySchema = z.object({
	q: zSanitizedString(
		trimmedStringBase().max(FIELD_LIMITS.search, `Search must be ${FIELD_LIMITS.search} characters or less.`),
		{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
	).optional(),
	type: discountTypeSchema.optional(),
	isActive: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().optional()).optional(),
	includeArchived: z.union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")]).optional(),
	limit: z
		.preprocess((v) => (typeof v === "string" ? parseInt(v, 10) : v), z.number().int().min(1).max(500).optional())
		.optional(),
});

export const listDiscountsPickerQuerySchema = z.object({
	q: zSanitizedString(
		trimmedStringBase().max(FIELD_LIMITS.search, `Search must be ${FIELD_LIMITS.search} characters or less.`),
		{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
	).optional(),
});

const createOrUpdateBodyBase = z.object({
	name: nameSchema.optional(),
	note: noteSchema.optional(),
	type: discountTypeSchema.optional(),
	value: legacyDecimalString.optional(),
	valueMinor: minorUnitsString.optional(),
	isStackable: z.boolean().optional(),
	isActive: z.boolean().optional(),
});

function validateValueSemantics(
	val: { type?: "PERCENT" | "FIXED"; value?: string; valueMinor?: string },
	ctx: z.RefinementCtx,
	options: { isCreate: boolean },
): void {
	if (!val.type) {
		if (options.isCreate) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: "type is required." });
		}
		return;
	}

	if (val.type === "PERCENT") {
		if (!val.value) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["value"],
				message: "Percent discounts require value (e.g. \"10.25\").",
			});
			return;
		}
		try {
			const bps = percentStringToBasisPoints(val.value);
			if (bps <= 0n) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["value"],
					message: "Percent discounts must be greater than 0 and at most 100.00.",
				});
			}
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["value"],
				message: "Percent discounts must be between 0 and 100.00 with up to 2 decimals.",
			});
		}
		if (val.valueMinor != null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["valueMinor"],
				message: "valueMinor is not accepted for PERCENT. Use value.",
			});
		}
		return;
	}

	// FIXED
	if (!val.valueMinor && !val.value) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["valueMinor"],
			message: "Fixed discounts require valueMinor (preferred) or legacy value.",
		});
		return;
	}

	if (val.valueMinor) {
		try {
			const minor = parseMinorUnitsStringToBigInt(val.valueMinor, "valueMinor");
			if (minor <= 0n) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["valueMinor"],
					message: "Fixed discounts must be greater than 0.",
				});
			}
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["valueMinor"],
				message: "valueMinor must be a positive digit string.",
			});
		}
	}
}

export const createDiscountBodySchema = createOrUpdateBodyBase
	.required({ name: true, type: true })
	.superRefine((val, ctx) => validateValueSemantics(val, ctx, { isCreate: true }));

export const updateDiscountBodySchema = createOrUpdateBodyBase
	.strict()
	.superRefine((val, ctx) => validateValueSemantics(val, ctx, { isCreate: false }));

export const discountVisibilityPatchSchema = z.object({
	action: z.enum(["HIDE", "RESTORE"]),
	discountId: uuidSchema,
});

