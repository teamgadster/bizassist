// path: src/components/ui/Shield.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View, type ViewStyle } from "react-native";

/**
 * ==========================
 * Shield Component (Expo)
 * ==========================
 */

export type ShieldSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

const sizeMap: Record<ShieldSize, { wrapper: number; icon: number }> = {
	xs: { wrapper: 32, icon: 28 },
	sm: { wrapper: 48, icon: 40 },
	md: { wrapper: 64, icon: 56 },
	lg: { wrapper: 80, icon: 66 },
	xl: { wrapper: 96, icon: 76 },
	"2xl": { wrapper: 112, icon: 56 },
	"3xl": { wrapper: 136, icon: 64 },
	"4xl": { wrapper: 168, icon: 72 },
	"5xl": { wrapper: 200, icon: 88 },
};

type ShieldProps = {
	size?: ShieldSize;
	backgroundColor?: string;
	iconColor?: string;
	style?: ViewStyle;
	iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
};

export const Shield = ({
	size = "2xl",
	backgroundColor = "#E8F0FE",
	iconColor = "#3B82F6",
	style,
	iconName = "shield-half-full",
}: ShieldProps) => {
	const { wrapper, icon } = sizeMap[size];

	return (
		<View
			style={[
				styles.wrapper,
				{
					width: wrapper,
					height: wrapper,
					borderRadius: wrapper / 2,
					backgroundColor,
				},
				style,
			]}
		>
			<MaterialCommunityIcons name={iconName} size={icon} color={iconColor} />
		</View>
	);
};

const styles = StyleSheet.create({
	wrapper: {
		alignItems: "center",
		justifyContent: "center",
	},
});
