// BizAssist_mobile
// path: src/components/navigation/BAITopAppBar.tsx

import React from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BAIText } from "@/components/ui/BAIText";
import { BAISurface } from "@/components/ui/BAISurface";

type BAITopAppBarProps = {
	title: string;
	onBackPress?: () => void;
	variant?: "standard" | "pill";

	/**
	 * Optional: constrain the app bar width (useful on tablet to match centered content rails).
	 */
	maxWidth?: number;

	/**
	 * Controls the left icon when onBackPress is provided.
	 * - "back" (default): chevron-left
	 * - "close": close (X)
	 *
	 * Governance: use "close" for process screens (Exit), "back" for detail/picker screens (Back).
	 */
	leftAction?: "back" | "close";
};

export function BAITopAppBar({
	title,
	onBackPress,
	variant = "standard",
	maxWidth,
	leftAction = "back",
}: BAITopAppBarProps) {
	const theme = useTheme();
	const insets = useSafeAreaInsets();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const isPill = variant === "pill";

	const isClose = leftAction === "close";
	const leftIcon = isClose ? "close" : "chevron-left";
	const leftA11y = isClose ? "Close" : "Back";

	// ✅ Make the X visually smaller than the back chevron (keeps button hitbox unchanged).
	const iconSize = isClose ? 26 : 38;

	return (
		<View style={{ paddingTop: insets.top }}>
			<BAISurface
				padded={false}
				bordered
				style={[
					styles.container,
					isPill && styles.pill,
					maxWidth != null && { width: "100%", maxWidth, alignSelf: "center" },
					{ borderColor },
				]}
			>
				{onBackPress ? (
					<IconButton
						icon={leftIcon}
						size={iconSize}
						onPress={onBackPress}
						accessibilityLabel={leftA11y}
						style={[styles.backButton, { borderColor }]}
					/>
				) : (
					<View style={styles.spacer} />
				)}

				<BAIText variant='subtitle' style={styles.title}>
					{title}
				</BAIText>

				<View style={styles.spacer} />
			</BAISurface>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 4,
		borderWidth: 1,
	},
	pill: {
		marginHorizontal: 12,
		marginBottom: 8,
		borderRadius: 999,
	},
	title: {
		flex: 1,
		textAlign: "center",
		fontWeight: "600",
	},
	spacer: {
		width: 40,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
	},
});
