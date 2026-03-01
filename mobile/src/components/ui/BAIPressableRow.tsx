// BizAssist_mobile path: src/components/ui/BAIPressableRow.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIText } from "@/components/ui/BAIText";

type Props = {
	label: string;
	value?: string;
	valueDotColor?: string | null;
	showValueDot?: boolean;
	placeholder?: string;
	onPress: () => void;
	disabled?: boolean;
	style?: StyleProp<ViewStyle>;
};

export function BAIPressableRow({
	label,
	value,
	valueDotColor,
	showValueDot = false,
	placeholder = "Hide or restore categories",
	onPress,
	disabled = false,
	style,
}: Props) {
	const theme = useTheme();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	// ✅ Match BAITextInput background (light + dark)
	const backgroundColor =
		(theme.colors as any).surfaceVariant ?? (theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)");

	const pressedBg = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

	const labelColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;
	const valueColor = theme.colors.onSurface;
	const placeholderColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	const chevronColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	const displayValue = (value ?? "").trim();
	const dotStroke = theme.colors.outlineVariant ?? theme.colors.outline;

	const containerStyle = useMemo(
		() => [
			styles.container,
			{
				borderColor,
				backgroundColor,
			},
			disabled && { opacity: 0.45 },
			style,
		],
		[backgroundColor, borderColor, disabled, style]
	);

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [containerStyle, pressed && !disabled && { backgroundColor: pressedBg }]}
		>
			<View style={styles.left}>
				<BAIText variant='caption' style={{ color: labelColor }}>
					{label}
				</BAIText>

				<View style={styles.valueRow}>
					{displayValue && showValueDot ? (
						<View
							style={[
								styles.valueDot,
								{ borderColor: dotStroke, backgroundColor: valueDotColor ? valueDotColor : "transparent" },
							]}
						/>
					) : null}
					<BAIText
						variant='subtitle'
						numberOfLines={1}
						style={{
							color: displayValue ? valueColor : placeholderColor,
							fontWeight: "500",
						}}
					>
						{displayValue || placeholder}
					</BAIText>
				</View>
			</View>

			{/* Governance: standardized disclosure chevron */}
			<MaterialCommunityIcons name='chevron-right' size={30} color={chevronColor} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 12,
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
	valueRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		minWidth: 0,
	},
	valueDot: {
		width: 12,
		height: 12,
		borderRadius: 9,
		borderWidth: 1,
	},
});
