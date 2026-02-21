// path: src/theme/baiTheme.ts

import { MD3DarkTheme as DefaultDarkTheme, MD3LightTheme as DefaultLightTheme, MD3Theme } from "react-native-paper";
import { baiButtonDisabled, baiColors, baiSemanticColors } from "./baiColors";
import { baiRadius } from "./baiRadius";

/**
 * Theme contract:
 * - roundness comes from baiRadius (single source of truth)
 * - colors from baiSemanticColors, with enterprise-SaaS surfaces
 */

const baseLight: MD3Theme = {
	...DefaultLightTheme,
	roundness: baiRadius.md,
	colors: {
		...DefaultLightTheme.colors,

		primary: baiSemanticColors.primary.main,
		primaryContainer: baiSemanticColors.primary.soft,

		secondary: baiSemanticColors.secondary.main,
		secondaryContainer: baiSemanticColors.secondary.soft,

		background: baiSemanticColors.surfaces.background,
		surface: baiSemanticColors.surfaces.surface,
		surfaceVariant: baiSemanticColors.surfaces.surfaceSubtle,

		// Borders — SaaS neutral
		outline: baiSemanticColors.surfaces.borderSubtle,
		outlineVariant: baiColors.neutral[300],

		error: baiSemanticColors.error.main,
		errorContainer: baiSemanticColors.error.soft,

		onPrimary: baiSemanticColors.text.onPrimary,
		onSecondary: baiSemanticColors.text.onPrimary,
		onBackground: baiSemanticColors.text.primary,
		onSurface: baiSemanticColors.text.primary,
		onSurfaceVariant: baiSemanticColors.text.secondary,
		onError: baiSemanticColors.text.onPrimary,

		surfaceDisabled: baiButtonDisabled.light.background,
		onSurfaceDisabled: baiButtonDisabled.light.text,

		backdrop: "rgba(15, 23, 42, 0.35)",
	},
};

const baseDark: MD3Theme = {
	...DefaultDarkTheme,
	roundness: baiRadius.md,
	colors: {
		...DefaultDarkTheme.colors,

		primary: baiColors.blue[400],
		primaryContainer: baiColors.blue[500],

		secondary: baiColors.indigo[400],
		secondaryContainer: baiColors.indigo[500],

		background: baiSemanticColors.surfacesDark.background,
		surface: baiSemanticColors.surfacesDark.surface,
		surfaceVariant: baiSemanticColors.surfacesDark.surfaceVariant,

		// Borders — SaaS neutral
		outline: baiSemanticColors.surfacesDark.borderSubtle,
		outlineVariant: baiColors.neutral[600],

		error: baiSemanticColors.error.dark,
		errorContainer: baiColors.red[900],

		onPrimary: baiSemanticColors.textDark.onPrimary,
		onSecondary: baiSemanticColors.textDark.onPrimary,
		onBackground: baiSemanticColors.textDark.primary,
		onSurface: baiSemanticColors.textDark.primary,
		onSurfaceVariant: baiSemanticColors.textDark.secondary,
		onError: baiSemanticColors.textDark.onPrimary,

		surfaceDisabled: baiButtonDisabled.dark.background,
		onSurfaceDisabled: baiButtonDisabled.dark.text,

		backdrop: "rgba(32, 33, 36, 0.72)",
	},
};

export const baiLightTheme = baseLight;
export const baiDarkTheme = baseDark;
export type BaiTheme = typeof baiLightTheme;
