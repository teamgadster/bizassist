// BizAssist_mobile
// path: src/modules/units/useUnitFlowBackGuard.ts

import { useEffect } from "react";

type NavigationLike = {
	addListener: (event: "beforeRemove", cb: (e: { preventDefault: () => void }) => void) => () => void;
};

type ExitRef = {
	current: boolean;
};

export function useUnitFlowBackGuard(navigation: NavigationLike, exitRef: ExitRef, onCancel: () => void) {
	useEffect(() => {
		const sub = navigation.addListener("beforeRemove", (e) => {
			if (exitRef.current) return;
			e.preventDefault();
			onCancel();
		});

		return sub;
	}, [exitRef, navigation, onCancel]);
}
