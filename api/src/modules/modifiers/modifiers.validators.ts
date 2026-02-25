import { z } from "zod";
import { ModifierSelectionType } from "@prisma/client";
import { uuidSchema, zSanitizedString, trimmedStringBase } from "@/shared/validators/zod.shared";
import { MAX_MODIFIER_GROUPS_PER_PRODUCT, MAX_MODIFIER_OPTIONS_PER_GROUP } from "@/shared/catalogLimits";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

const modifierSetNameSchema = zSanitizedString(
	trimmedStringBase().min(FIELD_LIMITS.modifierSetNameMin).max(FIELD_LIMITS.modifierSetName),
	{
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: true,
	},
);

const modifierOptionNameSchema = zSanitizedString(
	trimmedStringBase().min(FIELD_LIMITS.modifierNameMin).max(FIELD_LIMITS.modifierName),
	{
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: true,
	},
);

const minorUnitsString = zSanitizedString(trimmedStringBase().regex(/^\d+$/, "Must be a digit string.").max(24), {
	allowNewlines: false,
	allowTabs: false,
	normalizeWhitespace: false,
});

export const productIdParamSchema = z.object({ id: uuidSchema });
export const groupIdParamSchema = z.object({ id: uuidSchema });
export const optionIdParamSchema = z.object({ id: uuidSchema });
export const listModifierGroupsQuerySchema = z.object({
	includeArchived: z
		.preprocess(
			(v) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : v),
			z.boolean().optional(),
		)
		.optional(),
});

export const createModifierGroupSchema = z.object({
	name: modifierSetNameSchema,
	selectionType: z.nativeEnum(ModifierSelectionType),
	isRequired: z.boolean().default(false),
	minSelected: z.number().int().min(0).max(MAX_MODIFIER_OPTIONS_PER_GROUP).default(0),
	maxSelected: z.number().int().min(1).max(MAX_MODIFIER_OPTIONS_PER_GROUP).default(1),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const updateModifierGroupSchema = z
	.object({
		name: modifierSetNameSchema.optional(),
		selectionType: z.nativeEnum(ModifierSelectionType).optional(),
		isRequired: z.boolean().optional(),
		minSelected: z.number().int().min(0).max(MAX_MODIFIER_OPTIONS_PER_GROUP).optional(),
		maxSelected: z.number().int().min(1).max(MAX_MODIFIER_OPTIONS_PER_GROUP).optional(),
		sortOrder: z.number().int().min(0).max(10_000).optional(),
	})
	.refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });

export const createModifierOptionSchema = z.object({
	name: modifierOptionNameSchema,
	priceDeltaMinor: minorUnitsString,
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const updateModifierOptionSchema = z
	.object({
		name: modifierOptionNameSchema.optional(),
		priceDeltaMinor: minorUnitsString.optional(),
		isSoldOut: z.boolean().optional(),
		sortOrder: z.number().int().min(0).max(10_000).optional(),
	})
	.refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });

export const applySharedModifierAvailabilitySchema = z.object({
	isSoldOut: z.boolean(),
	modifierGroupIds: z.array(uuidSchema).min(1).max(5_000),
});

export const replaceProductModifierGroupsSchema = z.object({
	modifierGroupIds: z.array(uuidSchema).max(MAX_MODIFIER_GROUPS_PER_PRODUCT),
});

export const syncModifierGroupProductsSchema = z.object({
	modifierGroupId: uuidSchema,
	selectedProductIds: z.array(uuidSchema).max(5_000),
});
