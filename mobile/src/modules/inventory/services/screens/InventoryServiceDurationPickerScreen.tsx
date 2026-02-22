// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/services/duration-picker.tsx

import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import WheelPicker, {
	type PickerItem,
	useOnPickerValueChangedEffect,
	useOnPickerValueChangingEffect,
	usePickerControl,
	withPickerControl,
} from "@quidone/react-native-wheel-picker";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { runGovernedBack } from "@/modules/inventory/navigation.governance";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import {
	DRAFT_ID_KEY,
	DURATION_MINUTES_KEY,
	DURATION_TARGET_KEY,
	RETURN_TO_KEY,
	normalizeDurationTarget,
} from "@/modules/inventory/services/durationPicker.contract";
import { clampDurationMinutes, formatDurationLabel, SERVICE_DURATION_MAX_MINUTES } from "@/modules/inventory/services/serviceDuration";

const ControlPicker = withPickerControl(WheelPicker);

const HOUR_ITEMS: readonly PickerItem<number>[] = Array.from({ length: 25 }, (_, index) => ({
	value: index,
	label: String(index).padStart(2, "0"),
}));

const MINUTE_ITEMS: readonly PickerItem<number>[] = Array.from({ length: 60 }, (_, index) => ({
	value: index,
	label: String(index).padStart(2, "0"),
}));

const MINUTE_ZERO_ONLY_ITEMS: readonly PickerItem<number>[] = [{ value: 0, label: "00" }];
const WHEEL_ITEM_HEIGHT = 52;
const WHEEL_VISIBLE_ROWS = 5;
const PICKER_NAME_HOURS = "hours";
const PICKER_NAME_MINUTES = "minutes";

type DurationPickersMap = {
	hours: { item: PickerItem<number> };
	minutes: { item: PickerItem<number> };
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

export default function DurationPickerScreen() {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams();
	const pickerControl = usePickerControl<DurationPickersMap>();

	const returnTo = useMemo(() => String(params?.[RETURN_TO_KEY] ?? "").trim(), [params]);
	const draftId = useMemo(() => String(params?.[DRAFT_ID_KEY] ?? "").trim(), [params]);
	const target = useMemo(() => normalizeDurationTarget(params?.[DURATION_TARGET_KEY]), [params]);

	const initialTotal = useMemo(() => {
		const raw = Number(params?.[DURATION_MINUTES_KEY] ?? 0);
		return clampDurationMinutes(Number.isFinite(raw) ? raw : 0);
	}, [params]);

	const [wheelValue, setWheelValue] = useState(() => ({
		hours: Math.floor(initialTotal / 60),
		minutes: initialTotal % 60,
	}));

	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);
	const lockNav = useCallback((ms = 650) => {
		if (navLockRef.current) return false;
		navLockRef.current = true;
		setIsNavLocked(true);
		setTimeout(() => {
			navLockRef.current = false;
			setIsNavLocked(false);
		}, ms);
		return true;
	}, []);

	const isUiDisabled = isNavLocked;

	const applyWheelSelection = useCallback((nextHoursRaw: unknown, nextMinutesRaw: unknown) => {
		setWheelValue((prev) => {
			const nextHours = normalizeHours(nextHoursRaw);
			const nextMinutes = normalizeMinutes(nextMinutesRaw, nextHours);
			if (prev.hours === nextHours && prev.minutes === nextMinutes) {
				return prev;
			}
			return { hours: nextHours, minutes: nextMinutes };
		});
	}, []);

	useOnPickerValueChangingEffect(pickerControl, (event) => {
		applyWheelSelection(event.pickers.hours.item.value, event.pickers.minutes.item.value);
	});

	useOnPickerValueChangedEffect(pickerControl, (event) => {
		applyWheelSelection(event.pickers.hours.item.value, event.pickers.minutes.item.value);
	});

	const normalized = useMemo(() => {
		const hours = normalizeHours(wheelValue.hours);
		const minutes = normalizeMinutes(wheelValue.minutes, hours);
		const total = clampDurationMinutes(hours * 60 + minutes);
		return { hours, minutes, total };
	}, [wheelValue.hours, wheelValue.minutes]);

	const minuteData = normalized.hours >= 24 ? MINUTE_ZERO_ONLY_ITEMS : MINUTE_ITEMS;

	const onCancel = useCallback(() => {
		runGovernedBack(
			{
				router: router as any,
				lockNav,
				disabled: isUiDisabled,
			},
			returnTo || undefined,
		);
	}, [isUiDisabled, lockNav, returnTo, router]);

	const onSave = useCallback(() => {
		if (!target || !returnTo) return;
		if (target === "total" && normalized.total <= 0) return;
		if (!lockNav()) return;
		router.replace({
			pathname: returnTo as any,
			params: {
				[DURATION_TARGET_KEY]: target,
				[DURATION_MINUTES_KEY]: String(normalized.total),
				[DRAFT_ID_KEY]: draftId || undefined,
			} as any,
		});
	}, [draftId, lockNav, normalized.total, returnTo, router, target]);

	const headerOptions = useInventoryHeader("picker", {
		title: "Duration",
		disabled: isUiDisabled,
		onBack: onCancel,
	});
	const invalidForTarget = target === "total" && normalized.total <= 0;

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const markerBg = theme.dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)";
	const markerBorder = theme.dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)";

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen style={styles.root}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} bordered>
						<BAIText variant='title'>Select Duration</BAIText>
						<BAIText variant='caption' muted>
							Up to {SERVICE_DURATION_MAX_MINUTES} minutes.
						</BAIText>

						<View style={styles.wheelColumns}>
							<View style={styles.wheelColumn}>
								<ControlPicker
									control={pickerControl}
									pickerName={PICKER_NAME_HOURS}
									data={HOUR_ITEMS}
									value={normalized.hours}
									width='100%'
									itemHeight={WHEEL_ITEM_HEIGHT}
									visibleItemCount={WHEEL_VISIBLE_ROWS}
									enableScrollByTapOnItem={true}
									readOnly={isUiDisabled}
									overlayItemStyle={[styles.overlayItem, { backgroundColor: markerBg, borderColor: markerBorder }]}
									itemTextStyle={styles.wheelItemText}
								/>
								<BAIText variant='caption' muted style={styles.wheelLabel}>
									Hours
								</BAIText>
							</View>

							<View style={styles.wheelColumn}>
								<ControlPicker
									control={pickerControl}
									pickerName={PICKER_NAME_MINUTES}
									data={minuteData}
									value={normalized.hours >= 24 ? 0 : normalized.minutes}
									width='100%'
									itemHeight={WHEEL_ITEM_HEIGHT}
									visibleItemCount={WHEEL_VISIBLE_ROWS}
									enableScrollByTapOnItem={true}
									readOnly={isUiDisabled || normalized.hours >= 24}
									overlayItemStyle={[styles.overlayItem, { backgroundColor: markerBg, borderColor: markerBorder }]}
									itemTextStyle={styles.wheelItemText}
								/>
								<BAIText variant='caption' muted style={styles.wheelLabel}>
									Minutes
								</BAIText>
							</View>
						</View>

						<BAIText variant='subtitle'>{formatDurationLabel(normalized.total)}</BAIText>

						<View style={styles.actions}>
							<BAIButton
								variant='outline'
								intent='neutral'
								shape='pill'
								widthPreset='standard'
								onPress={onCancel}
								disabled={isUiDisabled}
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>
							<BAICTAPillButton
								onPress={onSave}
								disabled={isUiDisabled || !target || !returnTo || invalidForTarget}
								style={styles.actionBtn}
							>
								Apply
							</BAICTAPillButton>
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: { flex: 1, padding: 16 },
	card: { padding: 16, borderRadius: 20, gap: 12 },
	wheelColumns: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},
	wheelColumn: {
		flex: 1,
		alignItems: "center",
		gap: 8,
	},
	overlayItem: {
		borderWidth: 1,
		borderRadius: 14,
	},
	wheelItemText: {
		fontSize: 34,
		lineHeight: 38,
		fontWeight: "600",
	},
	wheelLabel: {
		textAlign: "center",
		minWidth: 96,
	},
	actions: { marginTop: 8, flexDirection: "row", gap: 10 },
	actionBtn: { flex: 1 },
});
