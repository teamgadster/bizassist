// BizAssist_mobile
// path: src/components/ui/DurationWheelAccordion.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";
import { useTheme } from "react-native-paper";

import { BAIText } from "@/components/ui/BAIText";
import { clampDurationMinutes, formatDurationLabel } from "@/modules/inventory/services/serviceDuration";

const HOUR_ITEMS: readonly PickerItem<number>[] = Array.from({ length: 25 }, (_, index) => ({
	value: index,
	label: String(index).padStart(2, "0"),
}));

const MINUTE_ITEMS: readonly PickerItem<number>[] = Array.from({ length: 60 }, (_, index) => ({
	value: index,
	label: String(index).padStart(2, "0"),
}));

const MINUTE_ZERO_ONLY_ITEMS: readonly PickerItem<number>[] = [{ value: 0, label: "00" }];
const WHEEL_ITEM_HEIGHT = 32;
const WHEEL_VISIBLE_ROWS = 5; // Must be odd: 1, 3, 5, 7...
const WHEEL_TOUCH_WIDTH = 134;
const WHEEL_COLUMN_GAP = 0;
const SELECTION_INDICATOR_HEIGHT = 30;
const SELECTION_INDICATOR_HORIZONTAL_INSET = 30;

type DurationWheelAccordionProps = {
	valueMinutes: number;
	onChangeMinutes: (nextMinutes: number) => void;
	disabled?: boolean;
	label?: string;
	expanded?: boolean;
	onExpandedChange?: (expanded: boolean) => void;
};

function normalizeHours(value: unknown): number {
	const raw = Number(value);
	if (!Number.isFinite(raw)) return 0;
	return Math.max(0, Math.min(24, Math.trunc(raw)));
}

function normalizeMinutes(value: unknown, hours: number): number {
	if (hours >= 24) return 0;
	const raw = Number(value);
	if (!Number.isFinite(raw)) return 0;
	return Math.max(0, Math.min(59, Math.trunc(raw)));
}

export function DurationWheelAccordion({
	valueMinutes,
	onChangeMinutes,
	disabled = false,
	label = "Duration",
	expanded,
	onExpandedChange,
}: DurationWheelAccordionProps) {
	const theme = useTheme();
	const [internalExpanded, setInternalExpanded] = useState(false);
	const isControlled = typeof expanded === "boolean";
	const isExpanded = isControlled ? (expanded as boolean) : internalExpanded;

	const safeTotal = clampDurationMinutes(valueMinutes);
	const hours = Math.floor(safeTotal / 60);
	const minutes = safeTotal % 60;
	const selectionRef = useRef({ hours, minutes });
	const minuteData = hours >= 24 ? MINUTE_ZERO_ONLY_ITEMS : MINUTE_ITEMS;
	const minuteValue = hours >= 24 ? 0 : minutes;
	const hourUnit = hours === 1 ? "hour" : "hours";

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const backgroundColor = (theme.colors as any).surfaceVariant ?? theme.colors.surface;
	const pressedBg = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
	const selectionIndicatorBg = theme.dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)";
	const selectionIndicatorBorder = theme.dark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.12)";
	const wheelPanelBg = theme.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)";

	const setExpanded = useCallback(
		(next: boolean) => {
			if (!isControlled) {
				setInternalExpanded(next);
			}
			onExpandedChange?.(next);
		},
		[isControlled, onExpandedChange],
	);

	const onHeaderPress = useCallback(() => {
		if (disabled) return;
		setExpanded(!isExpanded);
	}, [disabled, isExpanded, setExpanded]);

	const commitSelection = useCallback(
		(nextHoursRaw: unknown, nextMinutesRaw: unknown) => {
			const nextHours = normalizeHours(nextHoursRaw);
			const nextMinutes = normalizeMinutes(nextMinutesRaw, nextHours);
			const nextTotal = clampDurationMinutes(nextHours * 60 + nextMinutes);
			if (nextTotal !== safeTotal) {
				onChangeMinutes(nextTotal);
			}
		},
		[onChangeMinutes, safeTotal],
	);

	useEffect(() => {
		selectionRef.current = { hours, minutes };
	}, [hours, minutes]);

	useEffect(() => {
		if (disabled && isExpanded) {
			setExpanded(false);
		}
	}, [disabled, isExpanded, setExpanded]);

	const onHoursValueChanging = useCallback(({ item }: { item: PickerItem<number> }) => {
		const nextHours = normalizeHours(item.value);
		const nextMinutes = normalizeMinutes(selectionRef.current.minutes, nextHours);
		selectionRef.current = { hours: nextHours, minutes: nextMinutes };
	}, []);

	const onMinutesValueChanging = useCallback(({ item }: { item: PickerItem<number> }) => {
		const nextMinutes = normalizeMinutes(item.value, selectionRef.current.hours);
		selectionRef.current = { ...selectionRef.current, minutes: nextMinutes };
	}, []);

	const onHoursValueChanged = useCallback(
		({ item }: { item: PickerItem<number> }) => {
			const nextHours = normalizeHours(item.value);
			const nextMinutes = normalizeMinutes(selectionRef.current.minutes, nextHours);
			selectionRef.current = { hours: nextHours, minutes: nextMinutes };
			commitSelection(nextHours, nextMinutes);
		},
		[commitSelection],
	);

	const onMinutesValueChanged = useCallback(
		({ item }: { item: PickerItem<number> }) => {
			const nextMinutes = normalizeMinutes(item.value, selectionRef.current.hours);
			selectionRef.current = { ...selectionRef.current, minutes: nextMinutes };
			commitSelection(selectionRef.current.hours, nextMinutes);
		},
		[commitSelection],
	);

	const pickerTextColor = theme.colors.onSurface;
	const labelColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;
	const selectionUnitColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	return (
		<View style={styles.root}>
			<Pressable
				onPress={onHeaderPress}
				disabled={disabled}
				hitSlop={6}
				accessibilityRole='button'
				accessibilityLabel={label}
				accessibilityHint={isExpanded ? "Collapse duration picker" : "Expand duration picker"}
				accessibilityState={{ disabled, expanded: isExpanded }}
				style={({ pressed }) => [
					styles.headerPressable,
					styles.header,
					{
						borderColor,
						backgroundColor,
					},
					pressed && !disabled ? { backgroundColor: pressedBg } : null,
					disabled ? { opacity: 0.45 } : null,
				]}
			>
				<View pointerEvents='none' style={styles.headerLeft}>
					<BAIText variant='caption' style={[styles.headerTitle, { color: labelColor }]}>
						{label}
					</BAIText>
					<BAIText variant='subtitle'>{formatDurationLabel(safeTotal)}</BAIText>
				</View>
				<View pointerEvents='none' style={styles.headerRight}>
					<MaterialCommunityIcons name={isExpanded ? "chevron-up" : "chevron-down"} size={26} color={labelColor} />
				</View>
			</Pressable>

			{isExpanded ? (
				<View style={styles.content}>
					<View style={[styles.wheelWrap, { backgroundColor: wheelPanelBg, borderColor }]}>
						<View style={styles.wheelPickersRow}>
							<View pointerEvents='none' style={styles.selectionIndicatorWrap}>
								<View
									style={[
										styles.selectionIndicator,
										{
											backgroundColor: selectionIndicatorBg,
											borderColor: selectionIndicatorBorder,
										},
									]}
								/>
								<View style={styles.selectionUnitsRow}>
									<View style={styles.selectionUnitSlot}>
										<BAIText variant='caption' style={[styles.selectionUnitText, { color: selectionUnitColor }]}>
											{hourUnit}
										</BAIText>
									</View>
									<View style={styles.selectionUnitSlot}>
										<BAIText variant='caption' style={[styles.selectionUnitText, { color: selectionUnitColor }]}>
											min
										</BAIText>
									</View>
								</View>
							</View>
							<View style={styles.wheelPickerColumn}>
								<WheelPicker
									data={HOUR_ITEMS}
									value={hours}
									width={WHEEL_TOUCH_WIDTH}
									itemHeight={WHEEL_ITEM_HEIGHT}
									visibleItemCount={WHEEL_VISIBLE_ROWS}
									enableScrollByTapOnItem={true}
									readOnly={disabled}
									onValueChanging={onHoursValueChanging}
									onValueChanged={onHoursValueChanged}
									overlayItemStyle={styles.overlayItemHidden}
									itemTextStyle={[styles.wheelItemText, { color: pickerTextColor }]}
								/>
							</View>

							<View style={styles.wheelPickerColumn}>
								<WheelPicker
									data={minuteData}
									value={minuteValue}
									width={WHEEL_TOUCH_WIDTH}
									itemHeight={WHEEL_ITEM_HEIGHT}
									visibleItemCount={WHEEL_VISIBLE_ROWS}
									enableScrollByTapOnItem={true}
									readOnly={disabled || hours >= 24}
									onValueChanging={onMinutesValueChanging}
									onValueChanged={onMinutesValueChanged}
									overlayItemStyle={styles.overlayItemHidden}
									itemTextStyle={[styles.wheelItemText, { color: pickerTextColor }]}
								/>
							</View>
						</View>
					</View>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		width: "100%",
	},
	header: {
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
	headerPressable: {
		width: "100%",
	},
	headerLeft: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	headerTitle: {
		fontSize: 14,
		lineHeight: 18,
	},
	headerRight: {
		alignItems: "center",
		justifyContent: "center",
	},
	content: {
		paddingTop: 10,
	},
	contentTitle: {
		marginBottom: 8,
		textTransform: "uppercase",
		letterSpacing: 0.7,
	},
	wheelWrap: {
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 8,
		paddingTop: 12,
		paddingBottom: 12,
		overflow: "hidden",
	},
	wheelPickersRow: {
		position: "relative",
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: WHEEL_COLUMN_GAP,
	},
	selectionIndicatorWrap: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
	},
	selectionIndicator: {
		marginHorizontal: SELECTION_INDICATOR_HORIZONTAL_INSET,
		height: SELECTION_INDICATOR_HEIGHT,
		borderWidth: 1,
		borderRadius: 10,
	},
	selectionUnitsRow: {
		...StyleSheet.absoluteFillObject,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: WHEEL_COLUMN_GAP,
	},
	selectionUnitSlot: {
		width: WHEEL_TOUCH_WIDTH,
		alignItems: "flex-start",
		paddingLeft: 84,
	},
	selectionUnitText: {
		fontSize: 18,
		fontWeight: "600",
	},
	wheelPickerColumn: {
		width: WHEEL_TOUCH_WIDTH,
		alignItems: "center",
	},
	overlayItemHidden: {
		backgroundColor: "transparent",
		borderWidth: 0,
	},
	wheelItemText: {
		fontSize: 22,
		fontWeight: "500",
	},
});
