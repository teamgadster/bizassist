// path: src/lib/theme/appBackground.ts
import { useTheme } from "react-native-paper";

import { baiSemanticColors } from "@/theme/baiColors";

/**
 * These remain the canonical “neutral” surfaces for hard transitions.
 * We keep them explicit so background is stable and not accidentally drifted
 * by other theme token changes.
 */
export const APP_BG_LIGHT = baiSemanticColors.surfaces.background; // neutral light
export const APP_BG_DARK = baiSemanticColors.surfacesDark.background; // neutral dark

export function getAppBackgroundFromTheme(isDark: boolean): string {
	return isDark ? APP_BG_DARK : APP_BG_LIGHT;
}

/**
 * Canonical hook for adaptive app background.
 * This MUST honor the app's resolved Display Mode (System | Light | Dark),
 * not just the device scheme.
 *
 * Requirement: this hook must be called under BAIAppProviders (Paper Provider).
 */
export function useAppBackground(): string {
	const theme = useTheme();
	return getAppBackgroundFromTheme(!!theme.dark);
}
