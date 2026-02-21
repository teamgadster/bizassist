// BizAssist_mobile
// path: src/modules/options/screens/ProductCreateVariationsScreen.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import { DRAFT_ID_KEY, normalizeRoutePath, RETURN_TO_KEY, VARIATION_ID_KEY } from "@/modules/options/options.contract";
import { buildCartesianVariations, buildVariationKey } from "@/modules/options/options.flow";
import {
	INVENTORY_PRODUCT_CREATE_ROUTE,
	INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE,
	INVENTORY_PRODUCT_OPTIONS_CREATE_VARIATIONS_ROUTE,
} from "@/modules/options/options.navigation";
import { useOptionSetsList } from "@/modules/options/options.queries";
import type { OptionSet, ProductVariationDraft } from "@/modules/options/options.types";

function buildCreateItemReturnRoute(draftId: string, routeScope: InventoryRouteScope): string {
	const id = String(draftId ?? "").trim();
	const createRoute = mapInventoryRouteToScope(INVENTORY_PRODUCT_CREATE_ROUTE, routeScope);
	if (!id) return createRoute;
	return `${createRoute}?${DRAFT_ID_KEY}=${encodeURIComponent(id)}`;
}

function buildCreateVariationsRoute(draftId: string, routeScope: InventoryRouteScope): string {
	const id = String(draftId ?? "").trim();
	const route = mapInventoryRouteToScope(INVENTORY_PRODUCT_OPTIONS_CREATE_VARIATIONS_ROUTE, routeScope);
	if (!id) return route;
	return `${route}?${DRAFT_ID_KEY}=${encodeURIComponent(id)}`;
}

function stockSummary(variation: ProductVariationDraft): string {
	if (variation.stockStatus === "SOLD_OUT") return "Sold out at this location";
	if (variation.stockReason === "STOCK_RECEIVED") {
		const received = String(variation.stockReceived ?? "").trim();
		return received ? `Stock received: ${received}` : "Stock reason selected";
	}
	return "Stock not configured";
}

export default function ProductCreateVariationsScreen({
	routeScope = "inventory",
}: {
	routeScope?: InventoryRouteScope;
}) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<{ draftId?: string; returnTo?: string }>();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const { draft, draftId, patch } = useProductCreateDraft(String(params.draftId ?? "").trim() || undefined);
	const returnTo = useMemo(() => normalizeRoutePath(params[RETURN_TO_KEY]), [params]);
	const optionSetsQuery = useOptionSetsList({ includeArchived: false, isActive: true, limit: 250 });
	const initialVariationsRef = useRef(draft.variations);

	const optionSetsById = useMemo(() => {
		const map = new Map<string, OptionSet>();
		(optionSetsQuery.data?.items ?? []).forEach((optionSet) => map.set(optionSet.id, optionSet));
		return map;
	}, [optionSetsQuery.data?.items]);

	const generatedVariations = useMemo(
		() => buildCartesianVariations(draft.optionSelections, optionSetsById),
		[draft.optionSelections, optionSetsById],
	);

	const generatedWithDraftState = useMemo(() => {
		const existingByKey = new Map(draft.variations.map((variation) => [buildVariationKey(variation.valueMap), variation]));
		return generatedVariations.map((variation) => {
			const key = buildVariationKey(variation.valueMap);
			const existing = existingByKey.get(key);
			if (!existing) return variation;
			return {
				...variation,
				id: existing.id,
				stockStatus: existing.stockStatus,
				stockReason: existing.stockReason,
				stockReceived: existing.stockReceived,
			};
		});
	}, [draft.variations, generatedVariations]);

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

	const allKeys = useMemo(
		() => generatedWithDraftState.map((variation) => buildVariationKey(variation.valueMap)),
		[generatedWithDraftState],
	);
	const initializedSelectionRef = useRef(false);
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
	const canCreate =
		!optionSetsQuery.isLoading &&
		!optionSetsQuery.isError &&
		generatedWithDraftState.length > 0 &&
		selectedKeys.length > 0;
	useEffect(() => {
		if (initializedSelectionRef.current || allKeys.length === 0) return;
		initializedSelectionRef.current = true;
		setSelectedKeys(allKeys);
	}, [allKeys]);

	useEffect(() => {
		if (!initializedSelectionRef.current) return;
		const allKeySet = new Set(allKeys);
		setSelectedKeys((prev) => prev.filter((key) => allKeySet.has(key)));
	}, [allKeys]);

	const isUiDisabled = isNavLocked;
	const allChecked = allKeys.length > 0 && allKeys.every((key) => selectedKeys.includes(key));

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor,
			backgroundColor: surfaceAlt,
		}),
		[borderColor, surfaceAlt],
	);

	const fallbackRoute = returnTo ?? buildCreateItemReturnRoute(draftId, routeScope);
	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		patch({ variations: initialVariationsRef.current });
		router.replace(fallbackRoute as any);
	}, [fallbackRoute, isUiDisabled, lockNav, patch, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onCreate = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		const selected = generatedWithDraftState.filter((variation) => selectedKeys.includes(buildVariationKey(variation.valueMap)));
		patch({ variations: selected });
		router.replace(fallbackRoute as any);
	}, [fallbackRoute, generatedWithDraftState, isUiDisabled, lockNav, patch, router, selectedKeys]);

	const onOpenVariation = useCallback(
		(variationId: string) => {
			if (isUiDisabled) return;
			if (!lockNav()) return;
			const selected = generatedWithDraftState.filter((variation) =>
				selectedKeys.includes(buildVariationKey(variation.valueMap)),
			);
			patch({ variations: selected });
			router.push({
				pathname: toScopedRoute(INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE) as any,
				params: {
					[DRAFT_ID_KEY]: draftId,
					[VARIATION_ID_KEY]: variationId,
					[RETURN_TO_KEY]: buildCreateVariationsRoute(draftId, routeScope),
				},
			});
		},
		[draftId, generatedWithDraftState, isUiDisabled, lockNav, patch, routeScope, router, selectedKeys, toScopedRoute],
	);

	const headerOptions = useInventoryHeader("process", {
		title: "Create Variations",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						<BAIText variant='subtitle'>Variations</BAIText>
						{optionSetsQuery.isLoading ? (
							<View style={styles.stateWrap}>
								<BAIActivityIndicator size='large' tone='primary' />
								<BAIText variant='subtitle'>Loading options…</BAIText>
							</View>
						) : optionSetsQuery.isError ? (
							<View style={styles.stateWrap}>
								<BAIText variant='subtitle'>Could not load options.</BAIText>
								<BAIRetryButton variant='outline' onPress={() => optionSetsQuery.refetch()} disabled={isUiDisabled}>
									Retry
								</BAIRetryButton>
							</View>
						) : generatedWithDraftState.length === 0 ? (
							<View style={styles.stateWrap}>
								<BAIText variant='subtitle'>No variations to create.</BAIText>
								<BAIText variant='caption' muted>
									Select options and values first.
								</BAIText>
							</View>
						) : (
							<>
								<Pressable
									onPress={() => {
										if (isUiDisabled) return;
										setSelectedKeys(allChecked ? [] : allKeys);
									}}
									disabled={isUiDisabled}
								>
									{({ pressed }) => (
										<BAISurface
											style={[styles.selectionRow, surfaceInteractive, pressed ? styles.rowPressed : undefined]}
											padded
											bordered
										>
											<BAIText variant='subtitle'>All Variations</BAIText>
											<MaterialCommunityIcons
												name={allChecked ? "check-circle" : "checkbox-blank-circle-outline"}
												size={30}
												color={allChecked ? theme.colors.primary : theme.colors.onSurfaceVariant}
											/>
										</BAISurface>
									)}
								</Pressable>

								{generatedWithDraftState.map((variation) => {
									const key = buildVariationKey(variation.valueMap);
									const checked = selectedKeys.includes(key);
									return (
										<BAISurface key={variation.id} style={[styles.row, surfaceInteractive]} padded bordered>
											<View style={styles.rowMain}>
												<Pressable
													onPress={() => {
														if (isUiDisabled) return;
														setSelectedKeys((prev) => (checked ? prev.filter((id) => id !== key) : [...prev, key]));
													}}
													disabled={isUiDisabled}
												>
													{({ pressed }) => (
														<View style={[styles.rowToggle, pressed ? styles.rowPressed : undefined]}>
															<View style={styles.rowTextWrap}>
																<BAIText variant='body'>{variation.label}</BAIText>
																<BAIText variant='caption' muted numberOfLines={1}>
																	{stockSummary(variation)}
																</BAIText>
															</View>
															<MaterialCommunityIcons
																name={checked ? "check-circle" : "checkbox-blank-circle-outline"}
																size={30}
																color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant}
															/>
														</View>
													)}
												</Pressable>
												<BAIButton
													variant='outline'
													intent='neutral'
													size='sm'
													onPress={() => onOpenVariation(variation.id)}
													disabled={isUiDisabled || !checked}
													widthPreset='standard'
												>
													Adjust stock
												</BAIButton>
											</View>
										</BAISurface>
									);
								})}
							</>
						)}

						<View style={styles.actionsRow}>
							<BAIButton
								variant='outline'
								intent='neutral'
								onPress={guardedOnExit}
								disabled={isUiDisabled}
								shape='pill'
								widthPreset='standard'
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>
							<BAIButton
								variant='solid'
								intent='primary'
								onPress={onCreate}
								disabled={isUiDisabled || !canCreate}
								shape='pill'
								widthPreset='standard'
								style={styles.actionBtn}
							>
								Create
							</BAIButton>
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
		borderRadius: 18,
		gap: 8,
	},
	selectionRow: {
		borderWidth: 1,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	row: {
		borderWidth: 1,
		borderRadius: 12,
	},
	rowMain: {
		gap: 8,
	},
	rowToggle: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	rowTextWrap: {
		flex: 1,
		gap: 2,
	},
	rowPressed: {
		opacity: 0.9,
	},
	stateWrap: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 20,
		gap: 8,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 4,
	},
	actionBtn: {
		flex: 1,
	},
});
