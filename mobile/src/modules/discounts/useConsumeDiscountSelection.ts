// path: src/modules/discounts/useConsumeDiscountSelection.ts
import { useCallback } from "react";
import { consumeDiscountSelection } from "./discounts.selectionStore";

/**
 * Call this inside a focus effect (or after navigation returns) in POS cart screens.
 * If a selection exists, it returns it once and clears it.
 */
export function useConsumeDiscountSelection() {
	return useCallback(() => {
		return consumeDiscountSelection();
	}, []);
}
