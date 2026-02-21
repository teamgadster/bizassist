// BizAssist_api path: src/modules/media/media.validators.ts
import { z } from "zod";
import {
	MEDIA_MAX_BYTES,
	MEDIA_ALLOWED_EXT,
	MEDIA_ALLOWED_MIME_TYPES,
	EXT_TO_MIME,
	type MediaExt,
	type MediaMimeType,
	type MediaKind,
} from "@/modules/media/media.constants";
import { uuidSchema, trimmedStringBase, zSanitizedString } from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

const extEnum = z.enum(MEDIA_ALLOWED_EXT);
const mimeEnum = z.enum(MEDIA_ALLOWED_MIME_TYPES);
const kindEnum = z.enum(["product-image", "user-avatar", "user-cover", "business-logo", "business-cover"]);

export const createSignedUploadSchema = z
	.object({
		bucket: zSanitizedString(
			trimmedStringBase()
				.min(FIELD_LIMITS.mediaBucketMin, `bucket must be at least ${FIELD_LIMITS.mediaBucketMin} characters.`)
				.max(FIELD_LIMITS.mediaBucket, `bucket must be ${FIELD_LIMITS.mediaBucket} characters or less.`),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
		).optional(),

		kind: kindEnum,
		ext: extEnum,
		contentType: mimeEnum,

		bytes: z.number().int().positive().max(MEDIA_MAX_BYTES).optional(),

		productId: uuidSchema.optional(),
		userId: uuidSchema.optional(),

		// product-image (optional hint for stable path)
		isPrimary: z.boolean().optional(),

		businessId: uuidSchema.optional(),
	})
	.superRefine((val, ctx) => {
		const ext = val.ext as MediaExt;
		const expected = EXT_TO_MIME[ext];

		if (val.contentType !== expected) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["contentType"],
				message: `contentType does not match ext. Expected ${expected} for .${val.ext}`,
			});
		}

		if (val.kind === "product-image") {
			if (!val.productId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["productId"],
					message: "productId is required for kind=product-image",
				});
			}
			if (val.userId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["userId"],
					message: "userId is not applicable for kind=product-image",
				});
			}
		} else if (val.isPrimary !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["isPrimary"],
				message: "isPrimary is only allowed for kind=product-image",
			});
		} else {
			if (val.productId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["productId"],
					message: "productId is only allowed for kind=product-image",
				});
			}
		}

		if (val.businessId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["businessId"],
				message: "businessId is derived from activeBusinessId and must not be provided",
			});
		}
	});

export type CreateSignedUploadDto = z.infer<typeof createSignedUploadSchema>;

export const commitUploadedObjectSchema = z
	.object({
		kind: z.literal("product-image"),

		bucket: zSanitizedString(
			trimmedStringBase()
				.min(FIELD_LIMITS.mediaBucketMin, `bucket must be at least ${FIELD_LIMITS.mediaBucketMin} characters.`)
				.max(FIELD_LIMITS.mediaBucket, `bucket must be ${FIELD_LIMITS.mediaBucket} characters or less.`),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
		),
		path: zSanitizedString(
			trimmedStringBase()
				.min(FIELD_LIMITS.mediaPathMin, `path must be at least ${FIELD_LIMITS.mediaPathMin} characters.`)
				.max(FIELD_LIMITS.mediaPath, `path must be ${FIELD_LIMITS.mediaPath} characters or less.`),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
		),

		productId: uuidSchema,

		mimeType: zSanitizedString(
			trimmedStringBase().max(
				FIELD_LIMITS.mediaMimeType,
				`mimeType must be ${FIELD_LIMITS.mediaMimeType} characters or less.`
			),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
		).optional(),
		bytes: z.number().int().positive().max(MEDIA_MAX_BYTES).optional(),
		width: z.number().int().positive().max(100_000).optional(),
		height: z.number().int().positive().max(100_000).optional(),

		isPrimary: z.boolean().optional(),
		sortOrder: z.number().int().min(0).max(10_000).optional(),
	})
	.superRefine((val, ctx) => {
		if (val.mimeType && !MEDIA_ALLOWED_MIME_TYPES.includes(val.mimeType as any)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["mimeType"],
				message: `Unsupported mimeType: ${val.mimeType}`,
			});
		}
	});

export type CommitUploadedObjectDto = z.infer<typeof commitUploadedObjectSchema>;

/**
 * Remove Product Primary Image (v1)
 * - productId required
 */
export const removeProductPrimaryImageSchema = z.object({
	productId: uuidSchema,
});

export type RemoveProductPrimaryImageDto = z.infer<typeof removeProductPrimaryImageSchema>;

export type { MediaExt, MediaMimeType, MediaKind };
