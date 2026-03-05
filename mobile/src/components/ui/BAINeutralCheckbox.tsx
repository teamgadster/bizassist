import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

type Props = {
	checked: boolean;
	disabled?: boolean;
	size?: number;
	style?: StyleProp<ViewStyle>;
};

export function BAINeutralCheckbox({ checked, disabled = false, size = 26, style }: Props) {
	const theme = useTheme();
	const monochromeTone = theme.dark ? "#F5F5F5" : "#111111";
	const borderColor = monochromeTone;
	const backgroundColor = checked ? monochromeTone : "transparent";
	const iconColor = checked ? (theme.dark ? "#111111" : "#FFFFFF") : monochromeTone;
	const radius = Math.max(5, Math.round(size * 0.23));
	const iconSize = Math.max(14, Math.round(size * 0.68));
	const borderWidth = Math.max(1.5, Math.round(size * 0.08));

	return (
		<View
			style={[
				styles.base,
				{
					width: size,
					height: size,
					borderRadius: radius,
					borderColor,
					backgroundColor,
					borderWidth,
					opacity: disabled ? 0.45 : 1,
				},
				style,
			]}
		>
			{checked ? <MaterialCommunityIcons name='check-bold' size={iconSize} color={iconColor} /> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: "center",
		justifyContent: "center",
	},
});
