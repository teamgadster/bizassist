import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIPressableRow } from "@/components/ui/BAIPressableRow";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";

const DRAFT_ID_KEY = "draftId" as const;
const RETURN_TO_KEY = "returnTo" as const;
const ROOT_RETURN_TO_KEY = "rootReturnTo" as const;
const INITIAL_ON_HAND_KEY = "initialOnHand" as const;
const STOCK_RECEIVED_LEGACY_KEY = "stockReceived" as const;
const REORDER_POINT_KEY = "reorderPoint" as const;
const INVENTORY_CREATE_ROUTE = "/(app)/(tabs)/inventory/products/create" as const;
const INVENTORY_MANAGE_STOCK_ROUTE = "/(app)/(tabs)/inventory/products/manage-stock" as const;
const INVENTORY_STOCK_RECEIVED_ROUTE = "/(app)/(tabs)/inventory/products/stock-received" as const;

function normalizeRoute(value: unknown, fallback: string): string {
	const raw = String(value ?? "").trim();
	if (!raw.startsWith("/")) return fallback;
	return raw;
}

function toWholeDigits(value: unknown): string {
	const raw = String(value ?? "").trim();
	if (!raw) return "";
	const [whole = ""] = raw.split(".");
	const digits = whole.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
	if (!digits) return "";
	return digits === "0" ? "" : digits;
}

function formatDisplayDigits(value: string): string {
	const digits = String(value ?? "").trim().replace(/[^\d]/g, "");
	if (!digits) return "";
	return digits.replace(/^0+(?=\d)/, "") || "0";
}

export default function InventoryProductCreateManageStockScreen({
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
		() => normalizeRoute(params[RETURN_TO_KEY], toScopedRoute(INVENTORY_CREATE_ROUTE)),
		[params, toScopedRoute],
	);
	const { draft, patch } = useProductCreateDraft(draftId || undefined);
	const baselineDigits = useMemo(() => toWholeDigits(draft.initialOnHandText), [draft.initialOnHandText]);
	const baselineReorderDigits = useMemo(() => toWholeDigits(draft.reorderPointText), [draft.reorderPointText]);
	const incomingDigits = useMemo(
		() => formatDisplayDigits(String(params[INITIAL_ON_HAND_KEY] ?? params[STOCK_RECEIVED_LEGACY_KEY] ?? "")),
		[params],
	);
	const incomingReorderDigits = useMemo(
		() => formatDisplayDigits(String(params[REORDER_POINT_KEY] ?? "")),
		[params],
	);
	const [receivedDigits, setReceivedDigits] = useState<string>(incomingDigits || baselineDigits);
	const [reorderPointDigits, setReorderPointDigits] = useState<string>(incomingReorderDigits || baselineReorderDigits);

	useEffect(() => {
		if (!incomingDigits) return;
		setReceivedDigits(incomingDigits);
		(router as any).setParams?.({
			[INITIAL_ON_HAND_KEY]: undefined,
			[STOCK_RECEIVED_LEGACY_KEY]: undefined,
		});
	}, [incomingDigits, router]);

	useEffect(() => {
		if (!incomingReorderDigits) return;
		setReorderPointDigits(incomingReorderDigits);
		(router as any).setParams?.({
			[REORDER_POINT_KEY]: undefined,
		});
	}, [incomingReorderDigits, router]);

	const hasChanges = receivedDigits !== baselineDigits || reorderPointDigits !== baselineReorderDigits;
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const displayValue = receivedDigits ? formatDisplayDigits(receivedDigits) : "None";
	const displayReorderValue = reorderPointDigits ? formatDisplayDigits(reorderPointDigits) : "None";

	const goBackToReturnTo = useCallback(() => {
		router.replace({
			pathname: returnTo as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
			} as any,
		});
	}, [draftId, returnTo, router]);

	const onExit = useCallback(() => {
		goBackToReturnTo();
	}, [goBackToReturnTo]);

	const onOpenStockReceived = useCallback(() => {
		router.replace({
			pathname: toScopedRoute(INVENTORY_STOCK_RECEIVED_ROUTE) as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
				[RETURN_TO_KEY]: toScopedRoute(INVENTORY_MANAGE_STOCK_ROUTE),
				[ROOT_RETURN_TO_KEY]: returnTo,
				[INITIAL_ON_HAND_KEY]: receivedDigits,
				[REORDER_POINT_KEY]: reorderPointDigits,
			} as any,
		});
	}, [draftId, receivedDigits, reorderPointDigits, returnTo, router, toScopedRoute]);

	const onSave = useCallback(() => {
		if (!hasChanges) {
			goBackToReturnTo();
			return;
		}

		const nextDigits = formatDisplayDigits(receivedDigits);
		const nextReorderDigits = formatDisplayDigits(reorderPointDigits);
		const nextInitialOnHand = nextDigits ? nextDigits : "";
		const nextReorderPoint = nextReorderDigits ? nextReorderDigits : "";
		patch({ initialOnHandText: nextInitialOnHand, reorderPointText: nextReorderPoint });
		goBackToReturnTo();
	}, [goBackToReturnTo, hasChanges, patch, receivedDigits, reorderPointDigits]);

	return (
		<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
			<BAIHeader
				title='Manage Stock'
				variant='exit'
				onLeftPress={onExit}
			/>

			<View style={[styles.screen, { paddingBottom: tabBarHeight, backgroundColor: theme.colors.background }]}>
				<BAISurface style={[styles.card, { borderColor }]} padded bordered>
					<View style={styles.section}>
						<BAIText variant='subtitle'>Stock Setup</BAIText>
						<View style={{ height: 8 }} />
						<BAIPressableRow
							label='Initial On Hand'
							value={displayValue}
							placeholder='None'
							onPress={onOpenStockReceived}
						/>
					</View>

					<View style={{ height: 18 }} />

					<View style={styles.noteBlock}>
						<BAIText variant='caption' muted style={styles.noteText}>
							Set Initial On-Hand and Reorder Point before saving. Inventory tracking will start with these opening
							values.
						</BAIText>
					</View>

					{receivedDigits ? (
						<>
							<View style={{ height: 18 }} />
							<Pressable
								onPress={onOpenStockReceived}
								style={[styles.summaryRowCard, { borderColor, backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface }]}
							>
								<BAIText variant='body'>Initial On Hand</BAIText>
								<BAIText variant='subtitle' style={styles.summaryValue}>
									{displayValue}
								</BAIText>
							</Pressable>
						</>
					) : null}

					{reorderPointDigits ? (
						<>
							<View style={{ height: 12 }} />
							<Pressable
								onPress={onOpenStockReceived}
								style={[styles.summaryRowCard, { borderColor, backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface }]}
							>
								<BAIText variant='body'>Reorder Point</BAIText>
								<BAIText variant='subtitle' style={styles.summaryValue}>
									{displayReorderValue}
								</BAIText>
							</Pressable>
						</>
					) : null}

					<View style={{ height: 18 }} />
					<BAIButton intent='primary' variant='solid' onPress={onSave} disabled={!hasChanges}>
						Save
					</BAIButton>
				</BAISurface>
			</View>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: {
		flex: 1,
		paddingHorizontal: 10,
		paddingTop: 0,
	},
	card: {
		alignSelf: "stretch",
		borderRadius: 24,
	},
	section: {
		marginTop: 4,
	},
	noteBlock: {
		paddingHorizontal: 4,
	},
	noteText: {
		lineHeight: 24,
	},
	summaryRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 4,
	},
	summaryRowCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 16,
	},
	summaryValue: {
		fontWeight: "700",
	},
});
