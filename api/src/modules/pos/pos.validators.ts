// BizAssist_api
// path: src/modules/pos/pos.validators.ts

import { z } from "zod";
import {
	idempotencyKeySchema,
	optionalTrimmedString,
	uuidSchema,
	trimmedStringBase,
	zSanitizedString,
} from "@/shared/validators/zod.shared";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { checkoutSelectedAttributeSchema } from "@/modules/attributes/attributes.validators";

const minorUnitsString = zSanitizedString(
	trimmedStringBase()
		.regex(/^\d+$/, "Minor-unit amount must be a digit string.")
		.max(24, "Minor-unit amount is too long."),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const legacyMoneyDecimal = zSanitizedString(
	trimmedStringBase()
		.regex(/^\d+(\.\d{1,2})?$/, "Invalid money format. Use decimals up to 2 places.")
		.max(FIELD_LIMITS.price, `Money value must be ${FIELD_LIMITS.price} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const legacyUnitPriceDecimal = zSanitizedString(
	trimmedStringBase()
		.regex(/^\d+(\.\d{1,6})?$/, "Invalid unit price format. Use decimals up to 6 places.")
		.max(FIELD_LIMITS.price, `Unit price must be ${FIELD_LIMITS.price} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const quantityString = zSanitizedString(
	trimmedStringBase()
		.regex(/^\d+(\.\d{1,5})?$/, "Invalid quantity format. Use decimals up to 5 places.")
		.max(FIELD_LIMITS.quantity, `Quantity must be ${FIELD_LIMITS.quantity} characters or less.`),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false },
);

const cartItemSchema = z
	.object({
		productId: uuidSchema,
		productName: zSanitizedString(
			trimmedStringBase()
				.min(FIELD_LIMITS.productNameMin, `productName must be at least ${FIELD_LIMITS.productNameMin} character.`)
				.max(FIELD_LIMITS.productName, `productName must be ${FIELD_LIMITS.productName} characters or less.`),
			{ allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
		).optional(),
		quantity: quantityString,
		unitPriceMinor: minorUnitsString.optional(),
		unitPrice: legacyUnitPriceDecimal.optional(),
		selectedModifierOptionIds: z.array(uuidSchema).max(250, "Too many selected modifiers.").optional(),
		totalModifiersDeltaMinor: minorUnitsString.optional(),
		selectedAttributes: z.array(checkoutSelectedAttributeSchema).max(250).optional(),
	})
	.superRefine((val, ctx) => {
		if (!val.unitPriceMinor && !val.unitPrice) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["unitPriceMinor"],
				message: "Provide unitPriceMinor (preferred) or legacy unitPrice.",
			});
		}
	});

const paymentSchema = z
	.object({
		method: z.enum(["CASH", "EWALLET", "BANK_TRANSFER", "OTHER"]),
		amountMinor: minorUnitsString.optional(),
		amount: legacyMoneyDecimal.optional(),
	})
	.superRefine((val, ctx) => {
		if (!val.amountMinor && !val.amount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["amountMinor"],
				message: "Provide amountMinor (preferred) or legacy amount.",
			});
		}
	});

export const checkoutSchema = z.object({
	idempotencyKey: idempotencyKeySchema,
	deviceId: optionalTrimmedString({ collapseWhitespace: false }),
	cart: z.array(cartItemSchema).min(1, "Cart must not be empty.").max(200, "Cart has too many items."),
	payments: z
		.array(paymentSchema)
		.min(1, "At least one payment entry is required.")
		.max(10, "Too many payment entries."),
	discounts: z
		.array(z.object({ discountId: uuidSchema }))
		.max(50, "Too many discounts.")
		.optional(),
});
