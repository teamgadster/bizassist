import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIButton } from "@/components/ui/BAIButton";
import {
	BAINumericBottomSheetKeyboard,
	type BAINumericBottomSheetKey,
} from "@/components/ui/BAINumericBottomSheetKeyboard";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";

const DRAFT_ID_KEY = "draftId" as const;
const RETURN_TO_KEY = "returnTo" as const;
const ROOT_RETURN_TO_KEY = "rootReturnTo" as const;
const INITIAL_ON_HAND_KEY = "initialOnHand" as const;
const STOCK_RECEIVED_LEGACY_KEY = "stockReceived" as const;
const REORDER_POINT_KEY = "reorderPoint" as const;
const INVENTORY_MANAGE_STOCK_ROUTE = "/(app)/(tabs)/inventory/products/manage-stock" as const;
const STOCK_INPUT_MAX_DIGITS = 12;
function normalizeRoute(value: unknown, fallback: string): string {
	const raw = String(value ?? "").trim();
	if (!raw.startsWith("/")) return fallback;
	return raw;
}

function sanitizeDigits(value: string): string {
	const digits = String(value ?? "").replace(/[^\d]/g, "");
	if (!digits) return "";
	const trimmed = digits.replace(/^0+(?=\d)/, "");
	const normalized = trimmed || "0";
	return normalized.slice(0, STOCK_INPUT_MAX_DIGITS);
}

function nextDigits(current: string, key: BAINumericBottomSheetKey): string {
	if (key === "backspace") return current.slice(0, -1);
	const base = current === "0" ? "" : current;
	return sanitizeDigits(base + key);
}

function formatDisplay(value: string): string {
	const digits = sanitizeDigits(value);
	return digits || "0";
}

function isPositive(value: string): boolean {
	const digits = sanitizeDigits(value);
	if (!digits) return false;
	return Number(digits) > 0;
}

type KeypadField = "initialOnHand" | "reorderPoint";

export default function InventoryProductCreateStockReceivedScreen({
	routeScope = "inventory",
}: {
	routeScope?: InventoryRouteScope;
}) {
	const router = useRouter();
	const theme = useTheme();
	const tabBarHeight = useBottomTabBarHeight();
	const params = useLocalSearchParams();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const draftId = String(params[DRAFT_ID_KEY] ?? "").trim();
	const returnTo = useMemo(
		() => normalizeRoute(params[RETURN_TO_KEY], toScopedRoute(INVENTORY_MANAGE_STOCK_ROUTE)),
		[params, toScopedRoute],
	);
	const rootReturnTo = useMemo(
		() => normalizeRoute(params[ROOT_RETURN_TO_KEY], toScopedRoute("/(app)/(tabs)/inventory/products/create")),
		[params, toScopedRoute],
	);
	const [initialOnHandDigits, setInitialOnHandDigits] = useState(() =>
		sanitizeDigits(String(params[INITIAL_ON_HAND_KEY] ?? params[STOCK_RECEIVED_LEGACY_KEY] ?? "")),
	);
	const [reorderPointDigits, setReorderPointDigits] = useState(() => sanitizeDigits(String(params[REORDER_POINT_KEY] ?? "")));
	const [activeField, setActiveField] = useState<KeypadField>("initialOnHand");
	const [keyboardOpen, setKeyboardOpen] = useState(false);

	const canDone = isPositive(initialOnHandDigits) || isPositive(reorderPointDigits);
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceInteractive =
		(theme.colors as typeof theme.colors & { surfaceInteractive?: string }).surfaceInteractive ??
		theme.colors.surfaceVariant ??
		theme.colors.surface;
	const keypadKey = useMemo(() => `${draftId}:${returnTo}:${rootReturnTo}`, [draftId, returnTo, rootReturnTo]);

	const onBack = useCallback(() => {
		router.replace({
			pathname: returnTo as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
				[RETURN_TO_KEY]: rootReturnTo,
				[INITIAL_ON_HAND_KEY]: initialOnHandDigits,
				[REORDER_POINT_KEY]: reorderPointDigits,
			} as any,
		});
	}, [draftId, initialOnHandDigits, reorderPointDigits, returnTo, rootReturnTo, router]);

	const onDone = useCallback(() => {
		if (!canDone) return;
		router.replace({
			pathname: returnTo as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
				[RETURN_TO_KEY]: rootReturnTo,
				[INITIAL_ON_HAND_KEY]: sanitizeDigits(initialOnHandDigits),
				[REORDER_POINT_KEY]: sanitizeDigits(reorderPointDigits),
			} as any,
		});
	}, [canDone, draftId, initialOnHandDigits, reorderPointDigits, returnTo, rootReturnTo, router]);

	const onKeyPress = useCallback(
		(key: BAINumericBottomSheetKey) => {
			if (activeField === "reorderPoint") {
				setReorderPointDigits((current) => {
					if (key !== "backspace" && current.length >= STOCK_INPUT_MAX_DIGITS) return current;
					return nextDigits(current, key);
				});
				return;
			}
			setInitialOnHandDigits((current) => {
				if (key !== "backspace" && current.length >= STOCK_INPUT_MAX_DIGITS) return current;
				return nextDigits(current, key);
			});
		},
		[activeField],
	);

	const onConfirmKeyboard = useCallback(() => {
		setKeyboardOpen(false);
	}, []);

	const onOpenKeyboard = useCallback((field: KeypadField) => {
		setActiveField(field);
		setKeyboardOpen(true);
	}, []);

	return (
		<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
			<BAIHeader
				title='Stock Setup'
				variant='back'
				onLeftPress={onBack}
			/>

			<View
				style={[
					styles.screen,
					{
						paddingBottom: tabBarHeight,
						backgroundColor: theme.colors.background,
					},
				]}
			>
				<BAISurface style={[styles.card, { borderColor }]} padded bordered>
					<View style={styles.cardHeader}>
						<BAIText variant='subtitle' style={styles.cardTitle}>
							Opening Stock
						</BAIText>
						<BAIText variant='caption' muted style={styles.cardSubtitle}>
							Set Initial On-Hand and Reorder Threshold.
						</BAIText>
					</View>

					<View
						style={[
							styles.metricGroup,
							{
								borderColor,
								backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
							},
						]}
					>
						<View style={styles.metricRow}>
							<BAIText variant='body' style={styles.rowLabel}>
								Current Stock
							</BAIText>
							<BAIText variant='subtitle'>0</BAIText>
						</View>
					</View>

					<View
						style={[
							styles.metricGroup,
							{
								borderColor,
								backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
							},
						]}
					>
						<View style={styles.metricRow}>
							<BAIText variant='body' style={styles.rowLabel}>
								Initial On Hand
							</BAIText>
							<Pressable
								onPress={() => onOpenKeyboard("initialOnHand")}
								style={({ pressed }) => [
									styles.inputBox,
									{
										borderColor:
											keyboardOpen && activeField === "initialOnHand" ? theme.colors.primary : borderColor,
										backgroundColor: surfaceInteractive,
									},
									pressed ? { opacity: 0.92 } : null,
								]}
							>
								<BAIText variant='title' style={styles.inputValue}>
									{formatDisplay(initialOnHandDigits)}
								</BAIText>
							</Pressable>
						</View>
					</View>

					<View
						style={[
							styles.metricGroup,
							{
								borderColor,
								backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
							},
						]}
					>
						<View style={styles.metricRow}>
							<BAIText variant='body' style={styles.rowLabel}>
								Reorder Point
							</BAIText>
							<Pressable
								onPress={() => onOpenKeyboard("reorderPoint")}
								style={({ pressed }) => [
									styles.inputBox,
									{
										borderColor: keyboardOpen && activeField === "reorderPoint" ? theme.colors.primary : borderColor,
										backgroundColor: surfaceInteractive,
									},
									pressed ? { opacity: 0.92 } : null,
								]}
							>
								<BAIText variant='title' style={styles.inputValue}>
									{formatDisplay(reorderPointDigits)}
								</BAIText>
							</Pressable>
						</View>
					</View>

					<View
						style={[
							styles.metricGroup,
							{
								borderColor,
								backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
							},
						]}
					>
						<View style={styles.metricRow}>
							<BAIText variant='body' style={styles.rowLabel}>
								Total On Hand
							</BAIText>
							<BAIText variant='subtitle' style={styles.totalValue}>
								{formatDisplay(initialOnHandDigits)}
							</BAIText>
						</View>
					</View>

					<BAIButton
						intent='primary'
						variant='solid'
						onPress={onDone}
						disabled={!canDone}
						style={styles.doneButton}
					>
						Apply
					</BAIButton>
				</BAISurface>

			</View>

			<BAINumericBottomSheetKeyboard
				visible={keyboardOpen}
				onDismiss={onConfirmKeyboard}
				onKeyPress={onKeyPress}
				sheetKey={keypadKey}
				bottomPadding={40}
				keyBackgroundColor={surfaceInteractive}
			/>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: {
		flex: 1,
		paddingHorizontal: 12,
		paddingTop: 12,
	},
	card: {
		borderRadius: 22,
	},
	cardHeader: {
		gap: 2,
		paddingBottom: 2,
	},
	cardTitle: {
		fontWeight: "700",
	},
	cardSubtitle: {
		paddingBottom: 6,
	},
	doneButton: {
		marginTop: 14,
		alignSelf: "stretch",
	},
	metricRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		minHeight: 58,
		gap: 12,
	},
	metricGroup: {
		marginVertical: 6,
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 16,
	},
	rowLabel: {
		fontWeight: "500",
		flexShrink: 1,
	},
	totalValue: {
		fontWeight: "700",
	},
	inputBox: {
		minWidth: 132,
		paddingHorizontal: 12,
		paddingVertical: 9,
		borderWidth: 1,
		borderRadius: 12,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	inputValue: {
		fontWeight: "700",
	},
});
