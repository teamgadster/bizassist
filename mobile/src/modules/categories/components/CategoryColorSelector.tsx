// BizAssist_mobile
// path: src/modules/categories/components/CategoryColorSelector.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { CATEGORY_COLOR_PRESETS, isDarkColor, type CategoryColorValue } from "@/modules/categories/categoryColors";

type Props = {
	label?: string;
	value: CategoryColorValue;
	onChange: (next: CategoryColorValue) => void;
	disabled?: boolean;
};

const SWATCH = 52;
const LIGHT_NONE_BG_DARKEN = 0.06;
const CATEGORY_COLOR_NAME_BY_HEX: Record<string, string> = {
	"#1565C0": "Blue",
	"#6A1B9A": "Purple",
	"#C2185B": "Magenta",
	"#D32F2F": "Red",
	"#F57C00": "Orange",
	"#FBC02D": "Yellow",
	"#AFB42B": "Olive",
	"#2E7D32": "Green",
	"#00796B": "Teal",
	"#0097A7": "Cyan",
	"#616161": "Gray",
};

function darkenHex(hex: string, amount: number): string {
	const cleaned = hex.replace("#", "");
	if (cleaned.length !== 6) return hex;

	const num = Number.parseInt(cleaned, 16);
	if (!Number.isFinite(num)) return hex;

	const factor = 1 - amount;
	const r = Math.round(((num >> 16) & 255) * factor);
	const g = Math.round(((num >> 8) & 255) * factor);
	const b = Math.round((num & 255) * factor);

	const toHex = (val: number) => val.toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const CategoryColorSelector = memo(function CategoryColorSelector({
	label = "Category color",
	value,
	onChange,
	disabled = false,
}: Props) {
	const theme = useTheme();
	const outline = theme.colors.outlineVariant ?? theme.colors.outline;

	const baseNoneBg = theme.colors.surfaceVariant ?? theme.colors.surface;
	const noneBg = theme.dark ? baseNoneBg : darkenHex(baseNoneBg, LIGHT_NONE_BG_DARKEN);

	const items = useMemo(() => [null, ...CATEGORY_COLOR_PRESETS] as const, []);

	return (
		<View style={styles.root}>
			<BAIText variant='caption' style={{ color: theme.colors.onSurfaceVariant ?? theme.colors.onSurface }}>
				{label}
			</BAIText>

			<View style={styles.grid}>
				{items.map((c, idx) => {
					const isNone = c === null;
					const selected = value === c;

					const bg = isNone ? noneBg : c;
					const checkColor = isNone ? theme.colors.onSurface : isDarkColor(c) ? "#FFFFFF" : "#111111";

					const borderColor = selected ? theme.colors.primary : outline;
					const borderWidth = selected ? 2 : 1;
					const colorName = isNone ? "No Color" : (CATEGORY_COLOR_NAME_BY_HEX[c] ?? c);
					const stateLabel = selected ? "Selected" : "Not selected";

					return (
						<Pressable
							key={`${String(c)}-${idx}`}
							onPress={() => {
								if (disabled) return;
								onChange(c);
							}}
							disabled={disabled}
							style={({ pressed }) => [pressed && !disabled && { opacity: 0.9 }, disabled && { opacity: 0.55 }]}
							accessibilityRole='button'
							accessibilityLabel={`${colorName}. ${stateLabel}.`}
							accessibilityHint='Double tap to select this category color.'
							accessibilityState={{ selected, disabled }}
						>
							<BAISurface
								padded={false}
								style={[
									styles.swatch,
									{
										backgroundColor: bg,
										borderColor,
										borderWidth,
									},
								]}
							>
								{selected ? (
									<MaterialCommunityIcons name='check' size={26} color={checkColor} />
								) : isNone ? (
									<View style={[styles.noneMark, { borderColor: outline }]} />
								) : null}
							</BAISurface>
						</Pressable>
					);
				})}
			</View>

			<BAIText variant='caption' muted>
				Optional. Used as a visual label in lists and future POS. No color is the default.
			</BAIText>
		</View>
	);
});

const styles = StyleSheet.create({
	root: {
		gap: 8,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	swatch: {
		width: SWATCH,
		height: SWATCH,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	noneMark: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		opacity: 0.8,
	},
});
