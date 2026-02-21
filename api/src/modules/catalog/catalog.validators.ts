// BizAssist_api
// path: src/modules/catalog/catalog.validators.ts

import { z } from "zod";
import { PosTileMode, ProductType } from "@prisma/client";
import {
	barcodeSchema,
	nullishTrimmedString,
	optionalTrimmedString,
	safeLabelSchema,
	skuSchema,
	trimmedStringBase,
	uuidSchema,
	zSanitizedString,
} from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { CATALOG_LIST_MAX_LIMIT, MAX_VARIANTS_PER_PRODUCT } from "@/shared/catalogLimits";

const nonNegativeDecimalString = zSanitizedString(
	z
		.string()
		.trim()
		.min(1)
		.regex(/^\d+(?:\.\d+)?$/, "Must be a decimal number")
		.refine((v) => !/[eE]/.test(v), "Exponent notation is not allowed"),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const minorUnitsString = zSanitizedString(
	trimmedStringBase().regex(/^\d+$/, "Minor units must be a digit string.").max(24, "Minor units is too long."),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const legacyMoneyDecimal = z
	.union([
		zSanitizedString(
			trimmedStringBase()
				.regex(/^\d+(\.\d{1,2})?$/, "Invalid money format. Use decimals up to 2 places.")
				.max(FIELD_LIMITS.price, `Money value must be ${FIELD_LIMITS.price} characters or less.`),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
		),
		z.number().finite().min(0, "Money value cannot be negative.").transform((v) => String(v)),
	])
	.refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Invalid money format. Use decimals up to 2 places.");

const HEX_COLOR = zSanitizedString(
	z
		.string({ invalid_type_error: "Color must be text." })
		.trim()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color. Use hex format like #RRGGBB."),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const POS_TILE_LABEL_REGEX = /^[A-Za-z0-9 ]+$/;
const posTileLabelSchema = nullishTrimmedString({ collapseWhitespace: true })
	.refine((v) => v == null || v.length >= FIELD_LIMITS.posTileLabelMin, {
		message: `POS tile label must be at least ${FIELD_LIMITS.posTileLabelMin} characters.`,
	})
	.refine((v) => v == null || v.length <= FIELD_LIMITS.posTileLabel, {
		message: `POS tile label must be ${FIELD_LIMITS.posTileLabel} characters or less.`,
	})
	.refine((v) => v == null || POS_TILE_LABEL_REGEX.test(v), {
		message: "POS tile label contains invalid characters.",
	});

const SERVICE_DURATION_MAX_MINUTES = 1440;

const serviceDurationMinutesSchema = z.coerce
	.number()
	.int("Duration must be a whole number of minutes.")
	.min(0, "Duration cannot be negative.")
	.max(SERVICE_DURATION_MAX_MINUTES, `Duration cannot exceed ${SERVICE_DURATION_MAX_MINUTES} minutes.`)
	.optional()
	.nullable();

const optionSelectionSchema = z.object({
	optionSetId: uuidSchema,
	selectedValueIds: z.array(uuidSchema).min(1, "Select at least one option value."),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const variationValueMapSchema = z.record(z.string(), uuidSchema).superRefine((valueMap, ctx) => {
	const keys = Object.keys(valueMap);
	if (keys.length === 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Variation valueMap must include at least one option set/value pair.",
		});
		return;
	}

	for (const optionSetId of keys) {
		const parsed = uuidSchema.safeParse(optionSetId);
		if (!parsed.success) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [optionSetId],
				message: "Variation optionSetId must be a valid UUID.",
			});
		}
	}
});

const variationSchema = z.object({
	label: nullishTrimmedString({ collapseWhitespace: true })
		.optional()
		.refine((value) => value == null || value.length <= 160, {
			message: "Variation label must be 160 characters or less.",
		}),
	valueMap: variationValueMapSchema,
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

type ServiceValidationInput = {
	type?: ProductType;
	trackInventory?: boolean;
	reorderPoint?: string | null;
	initialOnHand?: string | null;
	processingEnabled?: boolean;
	durationInitialMinutes?: number | null;
	durationProcessingMinutes?: number | null;
	durationFinalMinutes?: number | null;
};

function hasAnyServiceDurationField(val: ServiceValidationInput): boolean {
	return (
		val.processingEnabled !== undefined ||
		val.durationInitialMinutes !== undefined ||
		val.durationProcessingMinutes !== undefined ||
		val.durationFinalMinutes !== undefined
	);
}

function validateServiceDurationRules(
	val: ServiceValidationInput,
	ctx: z.RefinementCtx,
	options: { isCreate: boolean },
) {
	if (val.trackInventory === true) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["trackInventory"],
			message: "Services cannot track inventory.",
		});
	}

	if (val.reorderPoint != null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["reorderPoint"],
			message: "reorderPoint is not applicable to services.",
		});
	}

	if (val.initialOnHand != null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["initialOnHand"],
			message: "initialOnHand is not applicable to services.",
		});
	}

	if (options.isCreate) {
		if (val.durationInitialMinutes == null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["durationInitialMinutes"],
				message: "durationInitialMinutes is required for services.",
			});
		}
		if (val.durationFinalMinutes == null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["durationFinalMinutes"],
				message: "durationFinalMinutes is required for services.",
			});
		}
	}

	if (val.processingEnabled === true && val.durationProcessingMinutes == null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["durationProcessingMinutes"],
			message: "durationProcessingMinutes is required when processingEnabled is true.",
		});
	}
}

function validateMoneyInput(
	val: { priceMinor?: string | null; price?: string | null; costMinor?: string | null; cost?: string | null },
	ctx: z.RefinementCtx,
): void {
	if (val.priceMinor != null && val.price != null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["price"],
			message: "Provide either priceMinor or price, not both.",
		});
	}
	if (val.costMinor != null && val.cost != null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["cost"],
			message: "Provide either costMinor or cost, not both.",
		});
	}
}

export const listProductsQuerySchema = z.object({
	q: optionalTrimmedString({
		collapseWhitespace: true,
		max: FIELD_LIMITS.search,
		maxMessage: `Search must be ${FIELD_LIMITS.search} characters or less.`,
	}),
	type: z.nativeEnum(ProductType).optional(),
	limit: z.coerce
		.number()
		.int()
		.min(1, "limit must be at least 1.")
		.max(CATALOG_LIST_MAX_LIMIT, `limit must be ${CATALOG_LIST_MAX_LIMIT} or less.`)
		.optional(),
	cursor: optionalTrimmedString({ collapseWhitespace: false }),
	isActive: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().optional()).optional(),
	includeArchived: z
		.preprocess(
			(v) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : v),
			z.boolean().optional(),
		)
		.optional(),
});

const createProductBodyBase = z.object({
	type: z.nativeEnum(ProductType).optional(),
	name: safeLabelSchema(FIELD_LIMITS.productNameMin, FIELD_LIMITS.productName, "Product name"),
	sku: skuSchema
		.optional()
		.nullable()
		.transform((v: string | null | undefined) => (v == null || v === "" ? null : v)),
	barcode: barcodeSchema
		.optional()
		.nullable()
		.transform((v: string | null | undefined) => (v == null || v === "" ? null : v)),
	unitId: uuidSchema.optional().nullable(),
	categoryId: uuidSchema.optional().nullable(),
	categoryLegacy: nullishTrimmedString({ collapseWhitespace: true })
		.optional()
		.refine((v: string | null | undefined) => v == null || v.length <= FIELD_LIMITS.categoryName, {
			message: `categoryLegacy must be ${FIELD_LIMITS.categoryName} characters or less.`,
		}),
	description: nullishTrimmedString({ collapseWhitespace: true, allowNewlines: true, allowTabs: false })
		.optional()
		.refine((v: string | null | undefined) => v == null || v.length <= FIELD_LIMITS.productDescription, {
			message: `Description must be ${FIELD_LIMITS.productDescription} characters or less.`,
		}),
	priceMinor: minorUnitsString.optional().nullable(),
	costMinor: minorUnitsString.optional().nullable(),
	price: legacyMoneyDecimal.optional().nullable(),
	cost: legacyMoneyDecimal.optional().nullable(),
	trackInventory: z.boolean().optional(),
	processingEnabled: z.boolean().optional(),
	durationInitialMinutes: serviceDurationMinutesSchema,
	durationProcessingMinutes: serviceDurationMinutesSchema,
	durationFinalMinutes: serviceDurationMinutesSchema,
	reorderPoint: nonNegativeDecimalString.optional().nullable(),
	storeId: uuidSchema.optional().nullable(),
	posTileMode: z.nativeEnum(PosTileMode).optional(),
	posTileColor: HEX_COLOR.optional().nullable(),
	posTileLabel: posTileLabelSchema.optional(),
	initialOnHand: nonNegativeDecimalString.optional().nullable(),
	optionSelections: z.array(optionSelectionSchema).min(1, "Select at least one option set.").optional(),
	variations: z
		.array(variationSchema)
		.min(1, "Add at least one variation.")
		.max(MAX_VARIANTS_PER_PRODUCT, `You can add up to ${MAX_VARIANTS_PER_PRODUCT} variations.`)
		.optional(),
});

export const createProductSchema = createProductBodyBase.superRefine((val, ctx) => {
	validateMoneyInput(val, ctx);
	const type = val.type ?? ProductType.PHYSICAL;
	if (type === ProductType.SERVICE) {
		validateServiceDurationRules(val, ctx, { isCreate: true });
	}

	if (val.optionSelections && val.optionSelections.length > 0 && (!val.variations || val.variations.length === 0)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["variations"],
			message: "Variations are required when option selections are provided.",
		});
	}

	if ((!val.optionSelections || val.optionSelections.length === 0) && val.variations && val.variations.length > 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["optionSelections"],
			message: "Option selections are required when variations are provided.",
		});
	}
});

const updateProductBodyBase = createProductBodyBase
	.partial()
	.omit({ initialOnHand: true, optionSelections: true, variations: true })
	.extend({
		isActive: z.boolean().optional(),
		primaryImageUrl: zSanitizedString(trimmedStringBase().url("primaryImageUrl must be a valid URL."), {
			allowNewlines: false,
			allowTabs: false,
			normalizeWhitespace: false,
		})
			.optional()
			.nullable(),
	});

export const updateProductSchema = updateProductBodyBase.superRefine((val, ctx) => {
	validateMoneyInput(val, ctx);
	const hasDurationFields = hasAnyServiceDurationField(val);
	const type = val.type;
	const shouldValidateAsService = type === ProductType.SERVICE || (type === undefined && hasDurationFields);
	if (!shouldValidateAsService) return;

	validateServiceDurationRules({ ...val, initialOnHand: null }, ctx, { isCreate: false });
});
