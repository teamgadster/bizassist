// BizAssist_mobile
// path: src/modules/pos/pos.quantityEditStore.ts

/**
 * Minimal, dependency-free handoff for the POS quantity edit process.
 * Pattern matches discounts.selectionStore to avoid adding new infra.
 */

export type PendingQuantityEdit = {
	productId: string;
	quantity: string; // decimal string
};

let pending: PendingQuantityEdit | null = null;

export function setPendingQuantityEdit(v: PendingQuantityEdit) {
	pending = v;
}

export function consumePendingQuantityEdit(): PendingQuantityEdit | null {
	const v = pending;
	pending = null;
	return v;
}

export function peekPendingQuantityEdit(): PendingQuantityEdit | null {
	return pending;
}

export function clearPendingQuantityEdit() {
	pending = null;
}
