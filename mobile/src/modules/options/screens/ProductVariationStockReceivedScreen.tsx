// BizAssist_mobile
// path: src/modules/options/screens/ProductVariationStockReceivedScreen.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { DRAFT_ID_KEY, normalizeRoutePath, normalizeString, RETURN_TO_KEY, VARIATION_ID_KEY } from "@/modules/options/options.contract";
import { INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE } from "@/modules/options/options.navigation";

type RouteParams = {
	draftId?: string;
	variationId?: string;
	returnTo?: string;
};

const MAX_QTY_LENGTH = 18;

function sanitizeQtyInput(raw: string): string {
	let next = String(raw ?? "")
		.replace(/,/g, "")
		.trim()
		.replace(/[^\d.]/g, "");
	if (!next) return "";

	const firstDot = next.indexOf(".");
	if (firstDot >= 0) {
		const before = next.slice(0, firstDot + 1);
		const after = next.slice(firstDot + 1).replace(/\./g, "");
		next = before + after;
	}

	if (next.length > MAX_QTY_LENGTH) next = next.slice(0, MAX_QTY_LENGTH);
	return next;
}

function normalizeQtyInput(raw: string): string {
	const cleaned = sanitizeQtyInput(raw);
	if (!cleaned) return "";
	if (cleaned === ".") return "";
	if (cleaned.endsWith(".")) return cleaned;

	const n = Number(cleaned);
	if (!Number.isFinite(n) || n < 0) return "";
	return cleaned;
}

function formatQty(n: number): string {
	if (!Number.isFinite(n)) return "0";
	if (Math.floor(n) === n) return String(n);
	return n.toFixed(5).replace(/\.?0+$/, "");
}

function buildVariationAdjustRoute(draftId: string, variationId: string, routeScope: InventoryRouteScope): string {
	const scopedBase = mapInventoryRouteToScope(INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE, routeScope);
	const idParam = draftId ? `${DRAFT_ID_KEY}=${encodeURIComponent(draftId)}` : "";
	const variationParam = variationId ? `${VARIATION_ID_KEY}=${encodeURIComponent(variationId)}` : "";
	const query = [idParam, variationParam].filter(Boolean).join("&");
	return query ? `${scopedBase}?${query}` : scopedBase;
}

export default function ProductVariationStockReceivedScreen({
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

	const { draftId, draft, patch } = useProductCreateDraft(paramDraftId || undefined);
	const variation = useMemo(() => draft.variations.find((item) => item.id === variationId) ?? null, [draft.variations, variationId]);

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

	const [receivedText, setReceivedText] = useState(() => sanitizeQtyInput(variation?.stockReceived || "0"));
	useEffect(() => {
		setReceivedText(sanitizeQtyInput(variation?.stockReceived || "0"));
	}, [variation?.id, variation?.stockReceived]);

	const isUiDisabled = isNavLocked;
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const currentStock = 0;
	const receivedNum = useMemo(() => {
		const normalized = normalizeQtyInput(receivedText);
		if (!normalized || normalized.endsWith(".")) return 0;
		const n = Number(normalized);
		return Number.isFinite(n) && n >= 0 ? n : 0;
	}, [receivedText]);
	const newTotal = currentStock + receivedNum;
	const normalizedReceived = useMemo(() => normalizeQtyInput(receivedText), [receivedText]);

	const canDone = Boolean(variation) && !!normalizedReceived && !normalizedReceived.endsWith(".");
	const fallbackRoute = returnTo ?? buildVariationAdjustRoute(draftId, variationId, routeScope);

	const onBack = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		router.replace(fallbackRoute as any);
	}, [fallbackRoute, isUiDisabled, lockNav, router]);
	const guardedOnBack = useProcessExitGuard(onBack);

	const onDone = useCallback(() => {
		if (isUiDisabled || !canDone || !variationId) return;
		if (!lockNav()) return;
		patch({
			variations: draft.variations.map((item) =>
				item.id === variationId
					? {
							...item,
							stockStatus: "VARIABLE",
							stockReason: "STOCK_RECEIVED",
							stockReceived: normalizedReceived || "0",
						}
					: item,
			),
		});
		router.replace(fallbackRoute as any);
	}, [canDone, draft.variations, fallbackRoute, isUiDisabled, lockNav, normalizedReceived, patch, router, variationId]);

	const headerOptions = useInventoryHeader("detail", {
		title: "Stock received",
		disabled: isUiDisabled,
		onBack: guardedOnBack,
	});

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerRight: () => (
						<Pressable disabled={isUiDisabled || !canDone} onPress={onDone} style={styles.headerDoneBtn}>
							<BAIText variant='subtitle' style={{ color: isUiDisabled || !canDone ? theme.colors.outline : theme.colors.primary }}>
								Done
							</BAIText>
						</Pressable>
					),
				}}
			/>
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						{variation ? (
							<BAIText variant='caption' muted>
								{variation.label}
							</BAIText>
						) : (
							<BAIText variant='caption' muted>
								Variation not found.
							</BAIText>
						)}

						<View style={[styles.row, { borderColor }]}>
							<BAIText variant='subtitle'>Current stock</BAIText>
							<BAIText variant='subtitle'>{formatQty(currentStock)}</BAIText>
						</View>

						<View style={[styles.row, { borderColor }]}>
							<BAIText variant='subtitle'>Received</BAIText>
							<TextInput
								value={receivedText}
								onChangeText={(value) => setReceivedText(sanitizeQtyInput(value))}
								style={[
									styles.input,
									{
										borderColor,
										color: theme.colors.onSurface,
										backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
									},
								]}
								keyboardType='decimal-pad'
								editable={!isUiDisabled}
								maxLength={MAX_QTY_LENGTH}
								placeholder='0'
								placeholderTextColor={theme.colors.onSurfaceVariant}
								textAlign='right'
							/>
						</View>

						<View style={[styles.row, { borderColor }]}>
							<BAIText variant='subtitle'>New total</BAIText>
							<BAIText variant='subtitle'>{formatQty(newTotal)}</BAIText>
						</View>
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
		gap: 8,
	},
	row: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 14,
		paddingBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	input: {
		minWidth: 122,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 28,
	},
	headerDoneBtn: {
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
});
