// BizAssist_mobile path: src/components/system/AddMenuList.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

import { BAIText, type BAITextVariant } from "@/components/ui/BAIText";

export type AddMenuListItem = {
	key: string;
	label: string;
	subtitle: string;
	iconFamily?: "material" | "ion";
	icon?: keyof typeof MaterialCommunityIcons.glyphMap | keyof typeof Ionicons.glyphMap;
	iconSize?: number;
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
	const iconBorderColor = borderColor;
	const iconTint = chevronColor;

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
						<View style={styles.rowLeft}>
							{item.icon ? (
								<View style={[styles.iconCircle, { borderColor: iconBorderColor }]}>
									{item.iconFamily === "ion" ? (
										<Ionicons
											name={item.icon as keyof typeof Ionicons.glyphMap}
											size={item.iconSize ?? 20}
											color={iconTint}
										/>
									) : (
										<MaterialCommunityIcons
											name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
											size={item.iconSize ?? 20}
											color={iconTint}
										/>
									)}
								</View>
							) : null}

							<View style={styles.content}>
								<BAIText variant={titleVariant} style={{ color: labelColor }}>
									{item.label}
								</BAIText>

								<BAIText variant='caption' style={[styles.subtitle, { color: subtitleColor }]}>
									{item.subtitle}
								</BAIText>
							</View>
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
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,

		// ✅ Per-row border (instead of dividers)
		borderWidth: 1,
		borderRadius: 16,
	},
	rowLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
		paddingRight: 10,
	},
	iconCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
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
