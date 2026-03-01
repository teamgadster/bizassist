import type { SelectedAttributeSnapshot } from "@/modules/attributes/attributes.types";

type PendingAttributeSelection = {
	productId: string;
	selectedAttributes: SelectedAttributeSnapshot[];
};

let pending: PendingAttributeSelection | null = null;

export function setPendingAttributeSelection(value: PendingAttributeSelection | null) {
	pending = value;
}

export function consumePendingAttributeSelection(): PendingAttributeSelection | null {
	const value = pending;
	pending = null;
	return value;
}
