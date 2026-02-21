// BizAssist_api
// path: src/modules/units/units.validators.ts

import { z } from "zod";
import { trimmedStringBase, uuidSchema, zSanitizedString } from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

export const UNIT_CATEGORIES = ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME", "CUSTOM"] as const;
export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

const precisionScale = z.number().int().min(0).max(5);
const unitNameSchema = zSanitizedString(
	trimmedStringBase()
		.min(FIELD_LIMITS.unitNameMin, `Unit name must be at least ${FIELD_LIMITS.unitNameMin} characters.`)
		.max(FIELD_LIMITS.unitName, `Unit name must be ${FIELD_LIMITS.unitName} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true }
);
const unitAbbreviationSchema = zSanitizedString(
	trimmedStringBase()
		.min(FIELD_LIMITS.unitAbbreviationMin, `Abbreviation must be at least ${FIELD_LIMITS.unitAbbreviationMin} character.`)
		.max(
			FIELD_LIMITS.unitAbbreviation,
			`Abbreviation must be ${FIELD_LIMITS.unitAbbreviation} characters or less.`
		),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true }
);

// Custom-create categories include COUNT and measurement categories.
const CUSTOM_CREATE_CATEGORIES = ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME", "CUSTOM"] as const;

export const listUnitsQuerySchema = z.object({
	includeArchived: z.union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")]).optional(),
	category: z.enum(UNIT_CATEGORIES).optional(),
});

export const listUnitsPickerQuerySchema = z.object({
	category: z.enum(UNIT_CATEGORIES).optional(),
	includeHiddenSelectedUnitId: uuidSchema.optional(),
});

export const createUnitBodySchema = z.discriminatedUnion("intent", [
	z.object({
		intent: z.literal("ENABLE_CATALOG"),
		catalogId: zSanitizedString(
			trimmedStringBase().min(FIELD_LIMITS.unitCatalogIdMin, "catalogId is required."),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
		),
		precisionScale: precisionScale.optional(),
	}),
	z.object({
		intent: z.literal("CREATE_CUSTOM"),
		category: z.enum(CUSTOM_CREATE_CATEGORIES),
		name: unitNameSchema,
		abbreviation: unitAbbreviationSchema,
		precisionScale,
	}),
]);

export const updateUnitBodySchema = z
	.object({
		name: unitNameSchema.optional(),
		abbreviation: unitAbbreviationSchema.optional(),
		precisionScale: precisionScale.optional(),
	})
	.refine((v) => Object.keys(v).length > 0, "At least one field must be provided.");

export const visibilityPatchSchema = z.object({
	action: z.enum(["HIDE", "RESTORE"]),
	unitId: uuidSchema,
});
