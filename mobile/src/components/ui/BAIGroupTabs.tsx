import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { BAIText } from "./BAIText";

export type BAIGroupTab<T extends string> = {
	label: string;
	value: T;
	count?: number;
};

type BAIGroupTabsProps<T extends string> = {
	tabs: readonly BAIGroupTab<T>[]; // ✅ allow readonly (supports `as const`)
	value: T;
	onChange: (value: T) => void;
	disabled?: boolean;
	countFormatter?: (count: number) => string;
};

export function BAIGroupTabs<T extends string>({
	tabs,
	value,
	onChange,
	disabled,
	countFormatter,
}: BAIGroupTabsProps<T>) {
	const theme = useTheme();

	const containerBg = theme.colors.surfaceVariant ?? theme.colors.surface;
	const borderColor = theme.colors.outline;

	// 🔵 BizAssist Primary Blue Governance
	const activeBg = theme.dark ? "#3B82F6" : "#2563EB";

	// Text inversion rule
	const activeTextColor = theme.colors.onPrimary ?? "#FFFFFF";

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: containerBg,
					borderColor,
					opacity: disabled ? 0.55 : 1,
				},
			]}
		>
			{tabs.map((tab) => {
				const isActive = tab.value === value;
				const showCount = typeof tab.count === "number" && Number.isFinite(tab.count);
				const formattedCount =
					showCount && countFormatter ? countFormatter(tab.count as number) : showCount ? String(tab.count) : "";
				const displayLabel = showCount ? `${tab.label} ${formattedCount}` : tab.label;

				return (
					<Pressable
						key={tab.value}
						onPress={() => !disabled && onChange(tab.value)}
						disabled={disabled}
						style={({ pressed }) => [
							styles.tab,
							isActive && { backgroundColor: activeBg },
							pressed && !disabled && { opacity: 0.92 },
						]}
					>
						<BAIText
							variant='caption'
							style={isActive ? { color: activeTextColor } : undefined}
							muted={!isActive}
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.85}
						>
							{displayLabel}
						</BAIText>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		borderRadius: 999,
		padding: 3,
		borderWidth: 1,
	},
	tab: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 6,
		paddingHorizontal: 6,
		borderRadius: 999,
	},
});
