// BizAssist_mobile
// path: src/modules/options/screens/ProductVariationAdjustScreen.tsx

import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Switch, useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { DRAFT_ID_KEY, normalizeRoutePath, normalizeString, RETURN_TO_KEY, VARIATION_ID_KEY } from "@/modules/options/options.contract";
import {
	INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE,
	INVENTORY_PRODUCT_OPTIONS_CREATE_VARIATIONS_ROUTE,
	INVENTORY_PRODUCT_OPTIONS_STOCK_RECEIVED_ROUTE,
} from "@/modules/options/options.navigation";

type RouteParams = {
	draftId?: string;
	variationId?: string;
	returnTo?: string;
};

type VariationStockSnapshot = {
	id: string;
	stockStatus: "VARIABLE" | "SOLD_OUT";
	stockReason: string | null;
	stockReceived: string;
};

function buildCreateVariationsRoute(draftId: string, routeScope: InventoryRouteScope): string {
	const scopedBase = mapInventoryRouteToScope(INVENTORY_PRODUCT_OPTIONS_CREATE_VARIATIONS_ROUTE, routeScope);
	const id = String(draftId ?? "").trim();
	if (!id) return scopedBase;
	return `${scopedBase}?${DRAFT_ID_KEY}=${encodeURIComponent(id)}`;
}

function buildVariationAdjustRoute(draftId: string, variationId: string, routeScope: InventoryRouteScope): string {
	const scopedBase = mapInventoryRouteToScope(INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE, routeScope);
	const idParam = draftId ? `${DRAFT_ID_KEY}=${encodeURIComponent(draftId)}` : "";
	const variationParam = variationId ? `${VARIATION_ID_KEY}=${encodeURIComponent(variationId)}` : "";
	const query = [idParam, variationParam].filter(Boolean).join("&");
	return query ? `${scopedBase}?${query}` : scopedBase;
}

export default function ProductVariationAdjustScreen({
	routeScope = "inventory",
}: {
	routeScope?: InventoryRouteScope;
}) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<RouteParams>();

	const paramDraftId = normalizeString(params[DRAFT_ID_KEY]);
	const variationId = normalizeString(params[VARIATION_ID_KEY]);
	const returnTo = useMemo(() => normalizeRoutePath(params[RETURN_TO_KEY]), [params]);
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const { draftId, draft, patch } = useProductCreateDraft(paramDraftId || undefined);
	const variation = useMemo(() => draft.variations.find((item) => item.id === variationId) ?? null, [draft.variations, variationId]);
	const isSoldOut = variation?.stockStatus === "SOLD_OUT";
	const initialVariationRef = useRef<VariationStockSnapshot | null>(null);
	if (!initialVariationRef.current && variation) {
		initialVariationRef.current = {
			id: variation.id,
			stockStatus: variation.stockStatus,
			stockReason: variation.stockReason,
			stockReceived: variation.stockReceived,
		};
	}

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
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const fallbackRoute = returnTo ?? buildCreateVariationsRoute(draftId, routeScope);
	const isDirty = useMemo(() => {
		const initial = initialVariationRef.current;
		if (!initial || !variation) return false;
		return (
			initial.stockStatus !== variation.stockStatus ||
			initial.stockReason !== variation.stockReason ||
			initial.stockReceived !== variation.stockReceived
		);
	}, [variation]);

	const updateVariation = useCallback(
		(next: {
			stockStatus?: "VARIABLE" | "SOLD_OUT";
			stockReason?: string | null;
			stockReceived?: string;
		}) => {
			if (!variationId) return;
			patch({
				variations: draft.variations.map((item) =>
					item.id === variationId
						? {
								...item,
								...(next.stockStatus ? { stockStatus: next.stockStatus } : {}),
								...(next.stockReason !== undefined ? { stockReason: next.stockReason } : {}),
								...(next.stockReceived !== undefined ? { stockReceived: next.stockReceived } : {}),
							}
						: item,
				),
			});
		},
		[draft.variations, patch, variationId],
	);

	const restoreInitialVariation = useCallback(() => {
		const initial = initialVariationRef.current;
		if (!initial) return;
		patch({
			variations: draft.variations.map((item) =>
				item.id === initial.id
					? {
							...item,
							stockStatus: initial.stockStatus,
							stockReason: initial.stockReason,
							stockReceived: initial.stockReceived,
						}
					: item,
			),
		});
	}, [draft.variations, patch]);

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		restoreInitialVariation();
		router.replace(fallbackRoute as any);
	}, [fallbackRoute, isUiDisabled, lockNav, restoreInitialVariation, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onSave = useCallback(() => {
		if (isUiDisabled || !variation) return;
		if (!lockNav()) return;
		router.replace(fallbackRoute as any);
	}, [fallbackRoute, isUiDisabled, lockNav, router, variation]);

	const onToggleSoldOut = useCallback(
		(next: boolean) => {
			if (isUiDisabled || !variation) return;
			updateVariation({
				stockStatus: next ? "SOLD_OUT" : "VARIABLE",
				stockReason: next ? null : variation.stockReason,
				stockReceived: next ? "" : variation.stockReceived,
			});
		},
		[isUiDisabled, updateVariation, variation],
	);

	const onOpenStockReceived = useCallback(() => {
		if (isUiDisabled || isSoldOut || !variationId || !variation) return;
		if (!lockNav()) return;
		const thisRoute = buildVariationAdjustRoute(draftId, variationId, routeScope);
		router.push({
			pathname: toScopedRoute(INVENTORY_PRODUCT_OPTIONS_STOCK_RECEIVED_ROUTE) as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
				[VARIATION_ID_KEY]: variationId,
				[RETURN_TO_KEY]: thisRoute,
			},
		});
	}, [draftId, isSoldOut, isUiDisabled, lockNav, routeScope, router, toScopedRoute, variation, variationId]);

	const reasonValue = "Stock received";

	const headerOptions = useInventoryHeader("process", {
		title: "Adjust stock",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerRight: () => (
						<Pressable disabled={isUiDisabled || !variation || !isDirty} onPress={onSave} style={styles.headerSaveBtn}>
							<BAIText
								variant='subtitle'
								style={{ color: isUiDisabled || !variation || !isDirty ? theme.colors.outline : theme.colors.primary }}
							>
								Save
							</BAIText>
						</Pressable>
					),
				}}
			/>
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						<BAIText variant='title'>Adjust stock</BAIText>
						{variation ? (
							<BAIText variant='caption' muted>
								{variation.label}
							</BAIText>
						) : null}

						{!variation ? (
							<View style={styles.stateWrap}>
								<BAIText variant='subtitle'>Variation not found.</BAIText>
								<BAIButton variant='outline' intent='neutral' onPress={guardedOnExit} disabled={isUiDisabled}>
									Close
								</BAIButton>
							</View>
						) : (
							<>
								<View style={[styles.section, { borderColor }]}>
									<View style={styles.switchRow}>
										<BAIText variant='subtitle'>Mark as sold out at this location</BAIText>
										<Switch value={isSoldOut} onValueChange={onToggleSoldOut} disabled={isUiDisabled} />
									</View>
									<BAIText variant='body' muted style={styles.helperText}>
										This also updates online availability. Customers cannot purchase sold out variations online.
									</BAIText>
								</View>

								<View style={[styles.section, { borderColor }]}>
									<BAIText variant='subtitle'>Select a reason</BAIText>
									<Pressable onPress={onOpenStockReceived} disabled={isUiDisabled || isSoldOut}>
										{({ pressed }) => (
											<View style={[styles.reasonRow, pressed && !isUiDisabled && !isSoldOut ? styles.rowPressed : undefined]}>
												<BAIText variant='body' muted={isSoldOut}>
													{reasonValue}
												</BAIText>
												<MaterialCommunityIcons
													name='chevron-right'
													size={24}
													color={
														isSoldOut
															? theme.colors.outline
															: theme.colors.onSurfaceVariant ?? theme.colors.onSurface
													}
												/>
											</View>
										)}
									</Pressable>
									<BAIText variant='body' muted style={styles.helperText}>
										Stock tracking is enabled by default for items with a stock count.
									</BAIText>
								</View>
							</>
						)}
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		padding: 12,
	},
	card: {
		flex: 1,
		borderRadius: 18,
		gap: 12,
	},
	stateWrap: {
		gap: 10,
	},
	section: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 12,
		gap: 10,
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	helperText: {
		lineHeight: 30,
	},
	reasonRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 8,
	},
	rowPressed: {
		opacity: 0.9,
	},
	headerSaveBtn: {
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
});
