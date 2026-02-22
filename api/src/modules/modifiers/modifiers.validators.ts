import { z } from "zod";
import { ModifierSelectionType } from "@prisma/client";
import { uuidSchema, zSanitizedString, trimmedStringBase } from "@/shared/validators/zod.shared";
import { MAX_MODIFIER_GROUPS_PER_PRODUCT, MAX_MODIFIER_OPTIONS_PER_GROUP } from "@/shared/catalogLimits";

const labelSchema = zSanitizedString(trimmedStringBase().min(1).max(120), {
	allowNewlines: false,
	allowTabs: false,
	normalizeWhitespace: true,
});

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
	name: labelSchema,
	selectionType: z.nativeEnum(ModifierSelectionType),
	isRequired: z.boolean().default(false),
	minSelected: z.number().int().min(0).max(MAX_MODIFIER_OPTIONS_PER_GROUP).default(0),
	maxSelected: z.number().int().min(1).max(MAX_MODIFIER_OPTIONS_PER_GROUP).default(1),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const updateModifierGroupSchema = z
	.object({
		name: labelSchema.optional(),
		selectionType: z.nativeEnum(ModifierSelectionType).optional(),
		isRequired: z.boolean().optional(),
		minSelected: z.number().int().min(0).max(MAX_MODIFIER_OPTIONS_PER_GROUP).optional(),
		maxSelected: z.number().int().min(1).max(MAX_MODIFIER_OPTIONS_PER_GROUP).optional(),
		sortOrder: z.number().int().min(0).max(10_000).optional(),
	})
	.refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });

export const createModifierOptionSchema = z.object({
	name: labelSchema,
	priceDeltaMinor: minorUnitsString,
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const updateModifierOptionSchema = z
	.object({
		name: labelSchema.optional(),
		priceDeltaMinor: minorUnitsString.optional(),
		isSoldOut: z.boolean().optional(),
		sortOrder: z.number().int().min(0).max(10_000).optional(),
	})
	.refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });

export const replaceProductModifierGroupsSchema = z.object({
	modifierGroupIds: z.array(uuidSchema).max(MAX_MODIFIER_GROUPS_PER_PRODUCT),
});
