import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BAIIconButton } from "@/components/ui/BAIIconButton";
import { BAIText } from "@/components/ui/BAIText";

export type BAIHeaderProps = {
	title: string;
	variant: "back" | "exit";
	onLeftPress?: () => void;
	rightSlot?: React.ReactNode;
	rightSlotDisabled?: boolean;
	hideLeftAction?: boolean;
	disabled?: boolean;
};

const HEADER_HEIGHT = 56;
const SIDE_SLOT_WIDTH = 60;
const EXIT_ICON_SIZE = 32;
const BACK_ICON_SIZE = 36;

export function BAIHeader({
	title,
	variant,
	onLeftPress,
	rightSlot,
	rightSlotDisabled = false,
	hideLeftAction = false,
	disabled = false,
}: BAIHeaderProps) {
	const router = useRouter();
	const theme = useTheme();
	const insets = useSafeAreaInsets();

	const iconName = variant === "exit" ? "close" : "chevron-left";
	const iconSize = variant === "exit" ? EXIT_ICON_SIZE : BACK_ICON_SIZE;
	const a11yLabel = variant === "exit" ? "Exit" : "Back";
	const handleLeftPress = React.useCallback(() => {
		if (disabled) return;
		if (onLeftPress) {
			onLeftPress();
			return;
		}
		if (router.canGoBack?.()) router.back();
	}, [disabled, onLeftPress, router]);

	return (
		<View
			style={[
				styles.root,
				{
					paddingTop: insets.top,
					backgroundColor: theme.colors.background,
					borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
				},
			]}
		>
			<View style={styles.row}>
				<View style={styles.leftSlot}>
					{hideLeftAction ? null : (
						<BAIIconButton
							icon={iconName}
							onPress={handleLeftPress}
							disabled={disabled}
							accessibilityLabel={a11yLabel}
							variant='ghost'
							size='lg'
							iconSize={iconSize}
							hitSlop={8}
						/>
					)}
				</View>

				<BAIText variant='subtitle' numberOfLines={1} ellipsizeMode='tail' style={styles.title}>
					{title}
				</BAIText>

				<View
					pointerEvents={rightSlotDisabled ? "none" : "auto"}
					style={[styles.rightSlot, rightSlotDisabled && styles.disabled]}
				>
					{rightSlot}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		borderBottomWidth: 0,
	},
	row: {
		height: HEADER_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		gap: 8,
	},
	leftSlot: {
		width: SIDE_SLOT_WIDTH,
		minWidth: SIDE_SLOT_WIDTH,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	title: {
		flex: 1,
		minWidth: 0,
		textAlign: "center",
	},
	rightSlot: {
		width: SIDE_SLOT_WIDTH,
		minWidth: SIDE_SLOT_WIDTH,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	disabled: {
		opacity: 0.45,
	},
});
