// path: src/modules/discounts/discounts.selectionStore.ts
import type { DiscountSelection } from "./discounts.types";

/**
 * Minimal, dependency-free selection handoff for Expo Router navigation.
 * Caller (POS cart) should "consume" after returning from select/enter screens.
 */
let pending: DiscountSelection | null = null;

export function setDiscountSelection(sel: DiscountSelection) {
	pending = sel;
}

export function peekDiscountSelection() {
	return pending;
}

export function consumeDiscountSelection() {
	const v = pending;
	pending = null;
	return v;
}

export function clearDiscountSelection() {
	pending = null;
}
