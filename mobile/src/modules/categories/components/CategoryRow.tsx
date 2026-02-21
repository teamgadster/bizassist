// BizAssist_mobile
// path: src/modules/categories/components/CategoryRow.tsx
//
// Row used by Manage Categories (phone/tablet) and pickers.
// Governance:
// - Archive/Restore lives on the row as an explicit action button (with confirmation owned by the screen).
// - Edit remains a separate intent (row press / chevron).

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { TextStyle } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import type { Category } from "@/modules/categories/categories.types";

type Props = {
	item: Category;
	onPress: () => void;
	disablePrimaryPress?: boolean;
	disabled?: boolean;
	metaLabel?: string | null;
	selected?: boolean;
	compact?: boolean;
	showChevron?: boolean;
	rightIcon?: "chevron-right" | "archive-outline" | "eye-off";
	rightIconColor?: string;
	/** Optional right-side lifecycle action (Archive/Restore) */
	action?: {
		label: string;
		onPress: () => void;
		accessibilityLabel?: string;
		accessibilityHint?: string;
		/** Defaults to neutral (outline). Use danger for Archive. */
		intent?: "neutral" | "danger" | "primary" | "success";
		variant?: "outline" | "solid" | "ghost";
		labelStyle?: TextStyle;
	};
};

const INDICATOR_SIZE = 14;

export const CategoryRow = memo(function CategoryRow({
	item,
	onPress,
	disablePrimaryPress = false,
	disabled,
	metaLabel,
	selected = false,
	compact = false,
	showChevron = true,
	rightIcon = "chevron-right",
	rightIconColor,
	action,
}: Props) {
	const theme = useTheme();

	const outline = theme.colors.outlineVariant ?? theme.colors.outline;
	const borderColor = selected ? theme.colors.primary : outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor,
			backgroundColor: surfaceAlt,
		}),
		[borderColor, surfaceAlt],
	);

	const countText = useMemo(() => {
		if (typeof metaLabel === "string") return metaLabel.trim() || null;
		const legacyItemCount = (item as Category & { itemCount?: number }).itemCount;
		const rawCount = item.productCount ?? legacyItemCount;
		if (typeof rawCount !== "number" || !Number.isFinite(rawCount)) return null;
		const count = Math.max(0, Math.trunc(rawCount));
		return `${count} item${count === 1 ? "" : "s"}`;
	}, [item, metaLabel]);

	// Governance:
	// - Always a circle
	// - Always show category.color when present
	// - If null → outline circle
	const indicatorStyle = useMemo(
		() => ({
			width: INDICATOR_SIZE,
			height: INDICATOR_SIZE,
			borderRadius: INDICATOR_SIZE / 2,
			backgroundColor: item.color ?? "transparent",
			borderColor: item.color ? item.color : outline,
			borderWidth: 2,
		}),
		[item.color, outline],
	);

	// Archived = tone only (no opacity)
	const nameColor = item.isActive !== false ? theme.colors.onSurface : theme.colors.onSurfaceVariant;
	const rightIntent = action?.intent ?? "neutral";
	const actionVariant = action?.variant ?? "outline";
	const resolvedRightIconColor = rightIconColor ?? theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	return (
		<BAISurface style={[styles.row, compact && styles.rowCompact, surfaceInteractive]} padded>
			{/* Edit intent */}
			<Pressable
				onPress={onPress}
				disabled={disabled || disablePrimaryPress}
				style={({ pressed }) => [
					styles.pressArea,
					compact && styles.pressAreaCompact,
					pressed && !disabled && { opacity: 0.9 },
					disabled && { opacity: 0.55 },
				]}
			>
				<View style={styles.left}>
					<View style={styles.textBlock}>
						<View style={styles.nameRow}>
							<View style={indicatorStyle} />

							<BAIText variant='subtitle' style={[styles.nameText, { color: nameColor }]} numberOfLines={1}>
								{item.name}
							</BAIText>
						</View>

						{countText ? (
							<BAIText variant='caption' muted numberOfLines={1} style={styles.countText}>
								{countText}
							</BAIText>
						) : null}
					</View>
				</View>

				{showChevron ? <MaterialCommunityIcons name={rightIcon} size={22} color={resolvedRightIconColor} /> : null}
			</Pressable>

			{/* Lifecycle action (separate intent) */}
			{action ? (
				<View style={styles.actionWrap}>
					<BAIButton
						variant={actionVariant}
						mode='outlined'
						intent={rightIntent}
						onPress={action.onPress}
						accessibilityLabel={action.accessibilityLabel}
						accessibilityHint={action.accessibilityHint}
						disabled={disabled}
						labelStyle={action.labelStyle}
						shape='pill'
						widthPreset='standard'
						size='sm'
						style={styles.actionBtn}
					>
						{action.label}
					</BAIButton>
				</View>
			) : null}
		</BAISurface>
	);
});

const styles = StyleSheet.create({
	row: {
		borderWidth: 1,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
	},
	rowCompact: {
		paddingVertical: 6,
	},
	pressArea: {
		flex: 1,
		minWidth: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 4,
	},
	pressAreaCompact: {
		paddingVertical: 3,
	},
	left: {
		flex: 1,
		minWidth: 0,
	},
	textBlock: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	nameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		minWidth: 0,
	},
	countText: {
		marginLeft: INDICATOR_SIZE + 6,
	},
	nameText: {
		flex: 1,
		minWidth: 0,
		fontWeight: "500",
	},
	actionWrap: {
		marginLeft: 10,
	},
	actionBtn: {
		borderRadius: 999,
		minWidth: 96,
	},
});
