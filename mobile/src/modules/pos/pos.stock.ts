// BizAssist_mobile
// path: src/modules/pos/pos.stock.ts
//
// Stock-aware helpers for POS cart clamping.
//
// Governance (locked):
// - POS cart quantities are DECIMAL STRINGS.
// - Inventory-tracked items must still be clamped to on-hand.
// - This module does not reinterpret pricing; it only clamps quantity.

import { clampPrecisionScale, fromScaledInt, normalizeQuantityString, toScaledInt } from "@/modules/pos/pos.quantity";

type StockishProduct = {
	trackInventory?: boolean;
	onHand?: unknown;
	onHandCached?: unknown;
	inventoryOnHand?: unknown;
	stockOnHand?: unknown;
	onHandCachedRaw?: unknown;
};

function resolveOnHandRaw(product: StockishProduct | undefined, fallback: unknown) {
	return (
		product?.onHand ??
		product?.onHandCached ??
		product?.inventoryOnHand ??
		product?.stockOnHand ??
		product?.onHandCachedRaw ??
		fallback
	);
}

export function clampQtyToStock(params: {
	product?: StockishProduct;
	requestedQty: string;
	precisionScale: unknown;
	fallback?: { onHand?: unknown; trackInventory?: boolean };
}): { qty: string; maxQty: string; trackInventory: boolean } {
	const trackInventory = !!(params.product?.trackInventory ?? params.fallback?.trackInventory);

	const scale = clampPrecisionScale(params.precisionScale);

	// Normalize requested qty to the intended scale (no silent rounding beyond normalization).
	const requestedNormalized = normalizeQuantityString(params.requestedQty, scale);

	if (!trackInventory) {
		return { qty: requestedNormalized, maxQty: "", trackInventory: false };
	}

	// Inventory-tracked quantities should be scale 0 in v1, but we still clamp defensively.
	const onHandRaw = resolveOnHandRaw(params.product, params.fallback?.onHand ?? 0);

	// Treat onHand as a quantity string/number; normalize then scale.
	const onHandNormalized = normalizeQuantityString(String(onHandRaw ?? "0"), scale);
	const maxScaled = toScaledInt(onHandNormalized, scale);
	const reqScaled = toScaledInt(requestedNormalized, scale);

	const clampedScaled = reqScaled > maxScaled ? maxScaled : reqScaled;
	const clamped = fromScaledInt(clampedScaled < 0n ? 0n : clampedScaled, scale);

	return { qty: clamped, maxQty: fromScaledInt(maxScaled < 0n ? 0n : maxScaled, scale), trackInventory: true };
}
