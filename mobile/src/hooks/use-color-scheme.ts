// path: src/hooks/use-color-scheme.ts

import { useDisplayMode } from "@/providers/BAIAppProviders";

export type ColorScheme = "light" | "dark";

/**
 * Unified hook for components that just care about
 * the *resolved* scheme (light/dark), after applying
 * the display mode preference (light/dark/system).
 */
export function useColorScheme(): ColorScheme {
	const { colorScheme } = useDisplayMode();
	return colorScheme;
}

export type DisplayModePreference = "system" | "light" | "dark";

/**
 * Controller hook for components that need to read/change
 * the user's display mode preference (system/light/dark).
 */
export function useColorSchemeController() {
	const { displayMode, setDisplayMode, colorScheme } = useDisplayMode();

	return {
		mode: displayMode as DisplayModePreference,
		setMode: setDisplayMode as (value: DisplayModePreference) => void,
		colorScheme,
	};
}
