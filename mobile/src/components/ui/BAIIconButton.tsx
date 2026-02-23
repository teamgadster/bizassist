// BizAssist_mobile
// path: src/components/ui/BAIIconButton.tsx

import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Size = "sm" | "md" | "lg" | "xxl" | "2xxl";
type Variant = "filled" | "outlined" | "ghost";

type Props = Omit<PressableProps, "children"> & {
	icon: IconName;

	/**
	 * Accessibility (required for icon-only buttons).
	 * Example: "Back", "Close", "Search", "Scan barcode"
	 */
	accessibilityLabel: string;

	/**
	 * Visuals
	 */
	size?: Size;
	variant?: Variant;

	/**
	 * Optional override color (rare).
	 * If omitted, component derives correct color from theme + variant.
	 */
	iconColor?: string;
	/**
	 * Optional override size (px). If omitted, derived from `size`.
	 */
	iconSize?: number;

	/**
	 * Optional container style override.
	 */
	style?: StyleProp<ViewStyle>;

	/**
	 * When true, button is disabled.
	 */
	disabled?: boolean;
};

function sizePx(size: Size): number {
	if (size === "sm") return 36;
	if (size === "xxl") return 58;
	if (size === "2xxl") return 64;
	if (size === "lg") return 52;
	return 44; // md
}

function iconPx(size: Size): number {
	if (size === "sm") return 18;
	if (size === "xxl") return 28;
	if (size === "2xxl") return 30;
	if (size === "lg") return 24;
	return 20; // md
}

/**
 * BAIIconButton
 * - Icon-only, touch-first, theme-aware
 * - Enforces minimum tappable target (>= 36, default 44)
 * - Borderlines standardized to match BAIInputGroup (solid 1px outlineVariant/outline)
 */
export function BAIIconButton({
	icon,
	accessibilityLabel,
	size = "md",
	variant = "ghost",
	iconColor,
	iconSize,
	style,
	disabled,
	...pressableProps
}: Props) {
	const theme = useTheme();

	const d = sizePx(size);
	const r = Math.round(d / 2);

	const colors = useMemo(() => {
		// Match BAIInputGroup: outlineVariant fallback to outline
		const outline = theme.colors.outlineVariant ?? theme.colors.outline;

		const filledBg = theme.colors.primary;
		const filledIcon = theme.colors.onPrimary;

		const ghostIcon = theme.colors.onSurface;
		const ghostPressedBg = theme.colors.surfaceVariant;

		const outlinedIcon = theme.colors.onSurface;

		if (variant === "filled") {
			return {
				bg: filledBg,
				pressedBg: filledBg,
				border: "transparent",
				icon: filledIcon,
			};
		}

		if (variant === "outlined") {
			return {
				bg: theme.colors.surface, // closer to InputGroup "solid component" feel
				pressedBg: theme.colors.surfaceVariant,
				border: outline,
				icon: outlinedIcon,
			};
		}

		// ghost
		return {
			bg: "transparent",
			pressedBg: ghostPressedBg,
			border: "transparent",
			icon: ghostIcon,
		};
	}, [theme, variant]);

	const computedIconColor = iconColor ?? colors.icon;
	const computedIconSize = typeof iconSize === "number" && iconSize > 0 ? iconSize : iconPx(size);

	// Border width strategy:
	// - "outlined": always 1px to match BAIInputGroup
	// - others: 0 (transparent border is still fine but avoid layout jitter)
	const borderWidth = variant === "outlined" ? 1 : 0;

	return (
		<Pressable
			{...pressableProps}
			accessibilityRole='button'
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			style={({ pressed }) => [
				styles.base,
				{
					width: d,
					height: d,
					borderRadius: r,

					// Match InputGroup: stable outline treatment
					borderWidth,
					borderColor: colors.border,

					// Clip pressed background like InputGroup container
					overflow: "hidden",

					backgroundColor: pressed ? colors.pressedBg : colors.bg,
					opacity: disabled ? 0.45 : 1,
				},
				style,
			]}
		>
			<View style={styles.center}>
				<MaterialCommunityIcons name={icon} size={computedIconSize} color={computedIconColor} />
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		alignItems: "center",
		justifyContent: "center",
	},
	center: {
		alignItems: "center",
		justifyContent: "center",
	},
});
