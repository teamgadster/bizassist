// path: src/components/settings/DisplayModeSelectorCard.tsx

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { DisplayModePreference, useColorSchemeController } from "@/hooks/use-color-scheme";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

type Row = {
	key: DisplayModePreference;
	title: string;
	renderIcon: (color: string) => React.ReactNode;
};

const ROWS: Row[] = [
	{
		key: "system",
		title: "System",
		renderIcon: (color) => <MaterialIcons name='monitor' size={20} color={color} />,
	},
	{
		key: "light",
		title: "Light",
		renderIcon: (color) => <MaterialCommunityIcons name='white-balance-sunny' size={20} color={color} />,
	},
	{
		key: "dark",
		title: "Dark",
		renderIcon: (color) => <MaterialCommunityIcons name='weather-night' size={20} color={color} />,
	},
];

export function DisplayModeSelectorCard({ dense = false, showHelper = true }: { dense?: boolean; showHelper?: boolean }) {
	const theme = useTheme();
	const { mode, setMode } = useColorSchemeController();

	const outline = theme.colors.outlineVariant ?? theme.colors.outline;
	const onSurface = theme.colors.onSurface;
	const onSurfaceVariant = theme.colors.onSurfaceVariant;

	return (
		<View style={styles.block} accessibilityRole='radiogroup'>
			

			<BAISurface style={styles.card} padded={false}>
				{ROWS.map((row, idx) => {
					const selected = mode === row.key;
					return (
						<Pressable
							key={row.key}
							onPress={() => setMode(row.key)}
							accessibilityRole='radio'
							accessibilityState={{ selected }}
							style={({ pressed }) => [
								styles.row,
								{ borderBottomColor: outline, paddingVertical: dense ? 10 : 12 },
								idx === ROWS.length - 1 ? styles.rowLast : null,
								pressed ? styles.rowPressed : null,
							]}
						>
							<View style={styles.rowLeft}>
								<View style={[styles.iconCircle, { borderColor: outline }]}>{row.renderIcon(onSurface)}</View>
								<BAIText variant='body' style={{ color: onSurface }}>
									{row.title}
								</BAIText>
							</View>

							<MaterialCommunityIcons
								name={selected ? "radiobox-marked" : "radiobox-blank"}
								size={22}
								color={selected ? onSurface : onSurfaceVariant}
							/>
						</Pressable>
					);
				})}
			</BAISurface>

			{showHelper ? (
				<BAIText variant='caption' muted style={styles.helper}>
					System follows your device appearance settings.
				</BAIText>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	block: { gap: 8 },
	blockTitle: { opacity: 0.9 },
	card: { borderRadius: 18, overflow: "hidden" },
	row: {
		paddingHorizontal: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	rowLast: { borderBottomWidth: 0 },
	rowPressed: { opacity: 0.85 },
	rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
	iconCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	helper: { marginTop: 2, opacity: 0.9 },
});
