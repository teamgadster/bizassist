// BizAssist_mobile
// path: src/modules/discounts/useDiscountProcessExitGuard.ts
//
// PROCESS-screen navigation governance for discounts:
// - Any pop/back gesture is converted to deterministic Exit.
// - Prevents accidental history-back from process screens.

import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef } from "react";

type NavigationLike = {
	addListener: (event: "beforeRemove", cb: (e: { preventDefault: () => void }) => void) => () => void;
};

export function useDiscountProcessExitGuard(onExit: () => void) {
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
		const sub = navigation.addListener("beforeRemove", (e) => {
			if (exitingRef.current) return;
			e.preventDefault();
			guardedExit();
		});

		return sub;
	}, [guardedExit, navigation]);

	return guardedExit;
}

