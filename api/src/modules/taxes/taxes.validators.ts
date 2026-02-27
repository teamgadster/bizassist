import { z } from "zod";

import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { trimmedStringBase, uuidSchema, zSanitizedString } from "@/shared/validators/zod.shared";

const nameSchema = zSanitizedString(
	trimmedStringBase()
		.min(1, "Name is required.")
		.max(FIELD_LIMITS.discountName, `Name must be ${FIELD_LIMITS.discountName} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
);

const percentageSchema = zSanitizedString(
	trimmedStringBase()
		.regex(/^\d+(?:\.\d{1,2})?$/, "Percentage must be a number with up to 2 decimals.")
		.max(6, "Percentage is too long."),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
).refine((value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100;
}, "Percentage must be between 0 and 100.");

const idsArraySchema = z.array(uuidSchema).max(500, "Too many selections.");

export const listSalesTaxesQuerySchema = z.object({
	q: zSanitizedString(
		trimmedStringBase().max(FIELD_LIMITS.search, `Search must be ${FIELD_LIMITS.search} characters or less.`),
		{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
	).optional(),
	isEnabled: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().optional()).optional(),
	includeArchived: z.union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")]).optional(),
	limit: z
		.preprocess((v) => (typeof v === "string" ? parseInt(v, 10) : v), z.number().int().min(1).max(500).optional())
		.optional(),
});

export const createSalesTaxBodySchema = z
	.object({
		name: nameSchema,
		percentage: percentageSchema,
		isEnabled: z.boolean().optional(),
		applicationMode: z.enum(["ALL_TAXABLE", "SELECT_ITEMS"]),
		customAmounts: z.boolean().optional(),
		itemPricingMode: z.enum(["ADD_TO_ITEM_PRICE", "INCLUDE_IN_ITEM_PRICE"]),
		itemIds: idsArraySchema.optional(),
		serviceIds: idsArraySchema.optional(),
	})
	.strict();

export const updateSalesTaxBodySchema = z
	.object({
		name: nameSchema.optional(),
		percentage: percentageSchema.optional(),
		isEnabled: z.boolean().optional(),
		applicationMode: z.enum(["ALL_TAXABLE", "SELECT_ITEMS"]).optional(),
		customAmounts: z.boolean().optional(),
		itemPricingMode: z.enum(["ADD_TO_ITEM_PRICE", "INCLUDE_IN_ITEM_PRICE"]).optional(),
		itemIds: idsArraySchema.optional(),
		serviceIds: idsArraySchema.optional(),
	})
	.strict();
