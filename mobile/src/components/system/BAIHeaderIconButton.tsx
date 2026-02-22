// BizAssist_mobile
// path: src/components/system/BAIHeaderIconButton.tsx
//
// Header Icon Button (deterministic sizing across simulator + real devices)
//
// Why this exists:
// - react-native-paper IconButton can render “visually larger” on real devices due to default padding/margin
//   + accessibility sizing behaviors.
// - For BizAssist headers, we want consistent, proportional header affordances.
//
// Contract:
// - variant="exit" locks glyph + hit target sizing (stable) for process-cancel (X).
// - variant="back" locks glyph + hit target sizing (stable) for history back chevron.
// - Still uses react-native-paper for proper a11y semantics.
//
// Notes:
// - This is a low-level primitive. Navigation semantics are still enforced by useInventoryHeader.

import React, { useMemo } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { IconButton, useTheme } from "react-native-paper";

export type BAIHeaderIconButtonVariant = "exit" | "back";

export type BAIHeaderIconButtonProps = {
	variant: BAIHeaderIconButtonVariant;
	disabled?: boolean;
	onPress: () => void;

	/**
	 * Optional: custom accessibility label override.
	 * Defaults per variant ("Close" / "Back").
	 */
	accessibilityLabel?: string;

	/** Optional: override container alignment wrapper (rare) */
	wrapStyle?: StyleProp<ViewStyle>;
	/** Optional: override IconButton style (rare) */
	buttonStyle?: StyleProp<ViewStyle>;
};

// Deterministic Exit sizing (consistent across simulator + real devices)
const EXIT_HIT_SIZE = 44; // stable touch target (>= 44 minimum)
const EXIT_ICON_SIZE = 24; // stable glyph size
const EXIT_RADIUS = 20;

// Deterministic Back sizing (match Exit feel but use chevron glyph)
// Enlarged for better tap target while keeping proportions.
const BACK_HIT_SIZE = 44;
const BACK_ICON_SIZE = 30; // chevrons tend to look smaller; slight bump keeps optical balance
const BACK_RADIUS = 20;

export function BAIHeaderIconButton(props: BAIHeaderIconButtonProps) {
	const theme = useTheme();

	const { disabled, onPress, wrapStyle, buttonStyle } = props;

	const visual = useMemo(() => {
		switch (props.variant) {
			case "back":
				return {
					icon: "chevron-left" as const,
					defaultA11y: "Back" as const,
					hitSize: BACK_HIT_SIZE,
					iconSize: BACK_ICON_SIZE,
					radius: BACK_RADIUS,
					// Back tends to sit a bit closer to the screen edge in native headers
					marginLeft: Platform.OS === "ios" ? 6 : 2,
				};

			case "exit":
			default:
				return {
					icon: "close" as const,
					defaultA11y: "Close" as const,
					hitSize: EXIT_HIT_SIZE,
					iconSize: EXIT_ICON_SIZE,
					radius: EXIT_RADIUS,
					marginLeft: Platform.OS === "ios" ? 8 : 4,
				};
		}
	}, [props.variant]);

	return (
		<View style={[styles.wrap, { marginLeft: visual.marginLeft }, wrapStyle]}>
			<IconButton
				icon={visual.icon}
				accessibilityLabel={props.accessibilityLabel ?? visual.defaultA11y}
				disabled={!!disabled}
				onPress={onPress}
				iconColor={theme.colors.onSurface}
				size={visual.iconSize}
				style={[
					styles.button,
					{
						width: visual.hitSize,
						height: visual.hitSize,
						borderRadius: visual.radius,
						opacity: disabled ? 0.6 : 1,
					},
					buttonStyle,
				]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	// Keep alignment stable vs platform header insets
	wrap: {
		justifyContent: "center",
		alignItems: "center",
	},
	// Critical: remove Paper defaults that inflate perceived size differently on-device
	button: {
		margin: 0,
		padding: 0,
	},
});
