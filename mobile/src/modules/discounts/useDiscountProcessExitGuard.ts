// BizAssist_mobile
// path: src/modules/discounts/useDiscountProcessExitGuard.ts
//
// PROCESS-screen navigation governance for discounts:
// - Any pop/back gesture is converted to deterministic Exit.
// - Successful replace-based post-action redirects must pass through untouched.

import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";

export function useDiscountProcessExitGuard(onExit: () => void, enabled = true) {
	return useProcessExitGuard(onExit, enabled);
}
