// path: src/shared/hooks/useNavLock.ts
import { useCallback, useRef, useState } from "react";

type Options = {
	lockMs?: number;
};

type RouterLike = {
	push: (path: any) => void;
	replace?: (path: any) => void;
};

export function useNavLock(opts?: Options) {
	const lockMs = opts?.lockMs ?? 650;

	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);

	const lock = useCallback(() => {
		if (navLockRef.current) return false;

		navLockRef.current = true;
		setIsNavLocked(true);

		setTimeout(() => {
			navLockRef.current = false;
			setIsNavLocked(false);
		}, lockMs);

		return true;
	}, [lockMs]);

	const safePush = useCallback(
		(router: RouterLike, path: string) => {
			if (!lock()) return;
			router.push(path as any);
		},
		[lock]
	);

	const safeReplace = useCallback(
		(router: RouterLike, path: string) => {
			if (!lock()) return;
			if (router.replace) router.replace(path as any);
			else router.push(path as any);
		},
		[lock]
	);

	return {
		canNavigate: !isNavLocked,
		isNavLocked,
		safePush,
		safeReplace,
	};
}
