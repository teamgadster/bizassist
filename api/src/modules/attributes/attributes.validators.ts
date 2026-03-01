import { AttributeSelectionType } from "@prisma/client";
import { z } from "zod";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { trimmedStringBase, uuidSchema, zSanitizedString } from "@/shared/validators/zod.shared";

const attributeNameSchema = zSanitizedString(
	trimmedStringBase().min(FIELD_LIMITS.modifierSetNameMin).max(FIELD_LIMITS.modifierSetName),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
);

const optionNameSchema = zSanitizedString(
	trimmedStringBase().min(FIELD_LIMITS.modifierNameMin).max(FIELD_LIMITS.modifierName),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
);

const parseBoolQuery = z.preprocess(
	(v) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : v),
	z.boolean().optional(),
);

export const attributeIdParamSchema = z.object({ id: uuidSchema });
export const productIdParamSchema = z.object({ id: uuidSchema });

export const listAttributesQuerySchema = z.object({
	includeArchived: parseBoolQuery,
});

export const optionInputSchema = z.object({
	id: uuidSchema.optional(),
	name: optionNameSchema,
	sortOrder: z.number().int().min(0).max(10_000).optional(),
	isArchived: z.boolean().optional(),
});

export const createAttributeSchema = z.object({
	name: attributeNameSchema,
	selectionType: z.nativeEnum(AttributeSelectionType),
	isRequired: z.boolean().default(false),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
	options: z.array(optionInputSchema).min(1).max(250),
});

export const updateAttributeSchema = z
	.object({
		name: attributeNameSchema.optional(),
		selectionType: z.nativeEnum(AttributeSelectionType).optional(),
		isRequired: z.boolean().optional(),
		sortOrder: z.number().int().min(0).max(10_000).optional(),
		options: z.array(optionInputSchema).max(250).optional(),
	})
	.refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });

const productAttributeLinkSchema = z.object({
	attributeId: uuidSchema,
	isRequired: z.boolean().optional(),
});

export const replaceProductAttributesSchema = z.object({
	attributes: z.array(productAttributeLinkSchema).max(100),
});

export const checkoutSelectedAttributeSchema = z.object({
	attributeId: uuidSchema,
	optionId: uuidSchema,
	attributeNameSnapshot: optionNameSchema.optional(),
	optionNameSnapshot: optionNameSchema.optional(),
});
