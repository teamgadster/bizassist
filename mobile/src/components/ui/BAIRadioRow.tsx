// BizAssist_mobile
// path: src/components/ui/BAIRadioRow.tsx
//
// Single-select row with a right-aligned radio indicator.
// Intended for deterministic pickers (Units, etc.).

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIText } from "@/components/ui/BAIText";

type BAIRadioRowProps = {
	title: string;
	description?: string;
	selected: boolean;
	onPress: () => void;
	disabled?: boolean;
	style?: StyleProp<ViewStyle>;
};

export function BAIRadioRow({ title, description, selected, onPress, disabled = false, style }: BAIRadioRowProps) {
	const theme = useTheme();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const backgroundColor =
		(theme.colors as any).surfaceVariant ?? (theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)");
	const pressedBg = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

	const titleColor = theme.colors.onSurface;
	const descColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	const radioColor = selected ? theme.colors.onSurface : descColor;
	const radioName = selected ? "radiobox-marked" : "radiobox-blank";

	const containerStyle = useMemo(
		() => [styles.container, { borderColor, backgroundColor }, disabled && { opacity: 0.45 }, style],
		[backgroundColor, borderColor, disabled, style]
	);

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [containerStyle, pressed && !disabled && { backgroundColor: pressedBg }]}
		>
			<View style={styles.left}>
				<BAIText variant='subtitle' numberOfLines={1} style={{ color: titleColor, fontWeight: "600" }}>
					{title}
				</BAIText>
				{description ? (
					<BAIText variant='caption' numberOfLines={1} style={{ color: descColor }}>
						{description}
					</BAIText>
				) : null}
			</View>

			<MaterialCommunityIcons name={radioName} size={28} color={radioColor} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 14,
		paddingLeft: 14,
		paddingRight: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	left: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
});
