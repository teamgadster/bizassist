// BizAssist_mobile
// path: src/modules/inventory/navigation.governance.ts
//
// Shared Back vs Exit navigation governance helpers for inventory flows.
// - Back: history-first navigation, optional deterministic fallback.
// - Exit: deterministic cancel navigation (replace), optional raw returnTo normalization.

export type GovernedRouterLike = {
	back: () => void;
	replace: (href: any) => void;
	canGoBack?: () => boolean;
};

export type GovernedNavOptions = {
	router: GovernedRouterLike;
	lockNav?: () => boolean;
	disabled?: boolean;
};

function isRoutePath(value: unknown): value is string {
	return typeof value === "string" && value.trim().startsWith("/");
}

export function resolveProcessExitRoute(rawReturnTo: unknown, fallbackRoute: string): string {
	if (isRoutePath(rawReturnTo)) {
		return rawReturnTo.trim();
	}
	return fallbackRoute;
}

export function runGovernedExitReplace(targetRoute: string, options: GovernedNavOptions): boolean {
	if (options.disabled) return false;
	if (options.lockNav && !options.lockNav()) return false;
	options.router.replace(targetRoute as any);
	return true;
}

export function runGovernedProcessExit(
	rawReturnTo: unknown,
	fallbackRoute: string,
	options: GovernedNavOptions,
): boolean {
	const targetRoute = resolveProcessExitRoute(rawReturnTo, fallbackRoute);
	return runGovernedExitReplace(targetRoute, options);
}

export function runGovernedBack(options: GovernedNavOptions, fallbackRoute?: string): boolean {
	if (options.disabled) return false;
	if (options.lockNav && !options.lockNav()) return false;

	if (options.router.canGoBack?.()) {
		options.router.back();
		return true;
	}

	if (fallbackRoute && isRoutePath(fallbackRoute)) {
		options.router.replace(fallbackRoute as any);
		return true;
	}

	options.router.back();
	return true;
}
