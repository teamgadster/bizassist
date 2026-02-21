// BizAssist_mobile
// path: src/modules/inventory/useInventoryHeader.ts
//
// Compatibility wrapper.
// SSOT lives in src/modules/navigation/useAppHeader.ts.

import {
	useAppHeader,
	type AppHeaderOptions as InventoryHeaderOptions,
	type AppScreenClass as InventoryScreenClass,
	type UseAppHeaderOptions as UseInventoryHeaderOptions,
} from "@/modules/navigation/useAppHeader";

export type { InventoryHeaderOptions, InventoryScreenClass, UseInventoryHeaderOptions };

export function useInventoryHeader(
	screenClass: InventoryScreenClass,
	options?: UseInventoryHeaderOptions,
): InventoryHeaderOptions {
	return useAppHeader(screenClass, options);
}

