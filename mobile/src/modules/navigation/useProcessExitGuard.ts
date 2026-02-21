// BizAssist_mobile
// path: src/modules/navigation/useProcessExitGuard.ts
//
// PROCESS-screen navigation governance:
// - Any pop/back gesture is converted to deterministic Exit.
// - Prevents accidental history-back from process screens.

import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef } from "react";

type NavigationLike = {
	addListener: (
		event: "beforeRemove",
		cb: (e: { preventDefault: () => void; data?: { action?: { type?: string } } }) => void,
	) => () => void;
};

export function useProcessExitGuard(onExit: () => void, enabled = true) {
	const navigation = useNavigation<NavigationLike>();
	const exitingRef = useRef(false);

	const guardedExit = useCallback(() => {
		if (exitingRef.current) return;
		exitingRef.current = true;

		try {
			onExit();
		} finally {
			setTimeout(() => {
				exitingRef.current = false;
			}, 0);
		}
	}, [onExit]);

	useEffect(() => {
		if (!enabled) return;

		const sub = navigation.addListener("beforeRemove", (e) => {
			if (exitingRef.current) return;
			const actionType = String(e?.data?.action?.type ?? "").toUpperCase();
			const isBackAction =
				actionType === "GO_BACK" ||
				actionType === "POP" ||
				actionType === "POP_TO_TOP" ||
				actionType === "POP_TO";
			if (!isBackAction) return;
			e.preventDefault();
			guardedExit();
		});

		return sub;
	}, [enabled, guardedExit, navigation]);

	return guardedExit;
}
