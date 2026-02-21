// BizAssist_api path: src/modules/categories/categories.validators.ts
import { z } from "zod";
import { optionalTrimmedString, safeLabelSchema, uuidSchema, zSanitizedString } from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

const HEX_COLOR = zSanitizedString(
	z
		.string({ invalid_type_error: "Color must be text." })
		.trim()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color. Use hex format like #RRGGBB."),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
);

export const listCategoriesQuerySchema = z.object({
	q: optionalTrimmedString({
		collapseWhitespace: true,
		max: FIELD_LIMITS.search,
		maxMessage: `Search must be ${FIELD_LIMITS.search} characters or less.`,
	}),

	isActive: z
		.union([z.literal("true"), z.literal("false")])
		.optional()
		.transform((v) => (v === undefined ? undefined : v === "true")),

	limit: zSanitizedString(z.string(), {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	})
		.optional()
		.transform((v) => (v ? Number(v) : undefined))
		.refine((n) => n === undefined || Number.isFinite(n), "limit must be a number.")
		.refine((n) => n === undefined || (n >= 1 && n <= 500), "limit must be 1..500"),
});

export const createCategoryBodySchema = z.object({
	name: safeLabelSchema(FIELD_LIMITS.categoryNameMin, FIELD_LIMITS.categoryName, "Category name"),
	color: HEX_COLOR.optional().nullable(),
	sortOrder: z
		.number()
		.int()
		.min(0, "sortOrder must be 0 or greater.")
		.max(1_000_000, "sortOrder is too large.")
		.optional(),
	isActive: z.boolean().optional(),
});

export const updateCategoryBodySchema = z.object({
	name: safeLabelSchema(FIELD_LIMITS.categoryNameMin, FIELD_LIMITS.categoryName, "Category name").optional(),
	color: HEX_COLOR.optional().nullable(),
	sortOrder: z
		.number()
		.int()
		.min(0, "sortOrder must be 0 or greater.")
		.max(1_000_000, "sortOrder is too large.")
		.optional(),
	isActive: z.boolean().optional(),
});

export const categoryVisibilityPatchSchema = z.object({
	action: z.enum(["HIDE", "RESTORE"]),
	categoryId: uuidSchema,
});
