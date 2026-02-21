// BizAssist_api path: src/modules/business/business.validators.ts
import { z } from "zod";
import { BusinessType } from "@prisma/client";
import { iso2Schema, iso4217Schema, safeLabelSchema, trimmedStringBase, zSanitizedString } from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

export const moduleChoiceSchema = z
	.enum(["POS", "INVENTORY"], {
		errorMap: () => ({ message: "Please select a valid module (POS or Inventory)." }),
	})
	.optional();

export const createBusinessSchema = z
	.object({
		name: safeLabelSchema(FIELD_LIMITS.businessNameMin, FIELD_LIMITS.businessName, "Business name"),

		businessType: z.nativeEnum(BusinessType, {
			errorMap: () => ({ message: "Please select a valid business type." }),
		}),

		countryCode: iso2Schema.optional(),
		country: iso2Schema.optional(),

		timezone: zSanitizedString(
			trimmedStringBase()
				.min(
					FIELD_LIMITS.timezoneMin,
					`Timezone must be at least ${FIELD_LIMITS.timezoneMin} characters.`
				)
				.max(FIELD_LIMITS.timezone, `Timezone must be ${FIELD_LIMITS.timezone} characters or less.`)
				.refine((v: string) => /^[A-Za-z_]+\/[A-Za-z0-9_\-+]+(\/[A-Za-z0-9_\-+]+)?$/.test(v), {
					message: "Timezone must be a valid IANA timezone (e.g., Asia/Manila).",
				}),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
		),

		currency: iso4217Schema.optional(),

		moduleChoice: moduleChoiceSchema,
	})
	.superRefine((v, ctx) => {
		if (!(v.countryCode ?? v.country)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Country is required.",
				path: ["countryCode"],
			});
		}

		if (v.countryCode && v.country && v.countryCode !== v.country) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "countryCode and country must match.",
				path: ["countryCode"],
			});
		}
	});

export type CreateBusinessDto = z.infer<typeof createBusinessSchema>;
