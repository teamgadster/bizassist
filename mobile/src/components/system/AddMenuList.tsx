// BizAssist_mobile path: src/components/system/AddMenuList.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

import { BAIText, type BAITextVariant } from "@/components/ui/BAIText";

export type AddMenuListItem = {
	key: string;
	label: string;
	subtitle: string;
	onPress?: () => void;
	enabled?: boolean;
};

type AddMenuListProps = {
	items: AddMenuListItem[];
	disabled?: boolean;
	titleVariant?: BAITextVariant;
};

export function AddMenuList({ items, disabled, titleVariant = "subtitle" }: AddMenuListProps) {
	const theme = useTheme();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const rowBg = theme.colors.surface;
	const labelColor = theme.colors.onSurface;
	const subtitleColor = theme.colors.onSurfaceVariant;
	const chevronColor = theme.colors.onSurfaceVariant;

	return (
		<View style={styles.list}>
			{items.map((item) => {
				const isDisabled = disabled || item.enabled === false;

				return (
					<Pressable
						key={item.key}
						onPress={item.onPress}
						disabled={isDisabled}
						style={({ pressed }) => [
							styles.row,
							{
								backgroundColor: rowBg,
								borderColor,
							},
							pressed && !isDisabled && styles.pressed,
							isDisabled && styles.disabled,
						]}
					>
						<View style={styles.content}>
							<BAIText variant={titleVariant} style={{ color: labelColor }}>
								{item.label}
							</BAIText>

							<BAIText variant='caption' style={[styles.subtitle, { color: subtitleColor }]}>
								{item.subtitle}
							</BAIText>
						</View>

						<MaterialCommunityIcons name='chevron-right' size={30} color={chevronColor} />
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	list: {
		gap: 8, // ✅ visual separation between pressables
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,

		// ✅ Per-row border (instead of dividers)
		borderWidth: 1,
		borderRadius: 16,
	},
	content: {
		flex: 1,
		gap: 2,
	},
	subtitle: {
		marginTop: 2,
	},
	pressed: {
		opacity: 0.85,
	},
	disabled: {
		opacity: 0.45,
	},
});
