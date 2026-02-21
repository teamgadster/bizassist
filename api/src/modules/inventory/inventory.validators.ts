// path: src/modules/inventory/inventory.validators.ts
import { z } from "zod";
import { sanitizeTextInput } from "@/shared/text/sanitizeText";
import { zSanitizedString } from "@/shared/validators/zod.shared";

export function normalizeIdempotencyKey(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const v = sanitizeTextInput(value, {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	});
	return v ? v : undefined;
}

const decimalStringSchema = zSanitizedString(
	z
		.string()
		.trim()
		.min(1, "quantityDelta is required.")
		.refine((v) => /^-?\d+(\.\d+)?$/.test(v) && !/[eE]/.test(v), {
			message: "quantityDelta must be a valid decimal string (no exponent).",
		}),
	{ allowNewlines: false, allowTabs: false, normalizeWhitespace: false }
);

export const inventoryAdjustmentSchema = z.object({
	idempotencyKey: zSanitizedString(z.string().trim().min(1), {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	}).optional(),
	productId: zSanitizedString(z.string().uuid("productId must be a UUID."), {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	}),
	storeId: zSanitizedString(z.string().uuid("storeId must be a UUID."), {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	}).optional(),
	quantityDelta: decimalStringSchema,
	reason: z.enum(["SALE", "STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]).optional(),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
