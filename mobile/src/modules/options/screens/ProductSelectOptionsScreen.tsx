// BizAssist_mobile
// path: src/modules/options/screens/ProductSelectOptionsScreen.tsx

import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Switch, useTheme } from "react-native-paper";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import { DRAFT_ID_KEY, OPTION_SET_ID_KEY, normalizeRoutePath } from "@/modules/options/options.contract";
import {
	appendReturnToQuery,
	INVENTORY_OPTIONS_CREATE_ROUTE,
	INVENTORY_PRODUCT_CREATE_ROUTE,
	INVENTORY_PRODUCT_OPTIONS_SELECT_ROUTE,
	INVENTORY_PRODUCT_OPTIONS_VALUES_ROUTE,
	SETTINGS_OPTIONS_CREATE_ROUTE,
} from "@/modules/options/options.navigation";
import { useOptionSetsList } from "@/modules/options/options.queries";
import type { OptionSelectionDraft, OptionSet } from "@/modules/options/options.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeSearchInput } from "@/shared/validation/sanitize";

function getActiveValueIds(optionSet: OptionSet): string[] {
	return optionSet.values.filter((value) => value.isActive !== false).map((value) => value.id);
}

function buildCreateItemReturnRoute(draftId: string, routeScope: InventoryRouteScope): string {
	const id = String(draftId ?? "").trim();
	const createRoute = mapInventoryRouteToScope(INVENTORY_PRODUCT_CREATE_ROUTE, routeScope);
	if (!id) return createRoute;
	return `${createRoute}?${DRAFT_ID_KEY}=${encodeURIComponent(id)}`;
}

function formatSelectionSummary(selection: OptionSelectionDraft, optionSet: OptionSet | undefined): string {
	if (!optionSet) return "";
	const names = selection.selectedValueIds
		.map((valueId) => optionSet.values.find((value) => value.id === valueId)?.name ?? "")
		.filter(Boolean);
	return names.join(", ");
}

export default function ProductSelectOptionsScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<{ draftId?: string; returnTo?: string }>();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const paramDraftId = String(params.draftId ?? "").trim() || undefined;
	const { draftId, draft, patch } = useProductCreateDraft(paramDraftId);
	const returnTo = useMemo(() => normalizeRoutePath(params.returnTo), [params.returnTo]);

	const initialSelectionsRef = useRef<OptionSelectionDraft[] | null>(null);
	if (!initialSelectionsRef.current) {
		initialSelectionsRef.current = draft.optionSelections;
	}

	const [qText, setQText] = useState("");
	const q = qText.trim();
	const hasSearch = q.length > 0;

	const query = useOptionSetsList({ q: q || undefined, isActive: true, includeArchived: false, limit: 250 });
	const optionSets = useMemo(() => query.data?.items ?? [], [query.data?.items]);
	const optionSetsById = useMemo(() => {
		const map = new Map<string, OptionSet>();
		optionSets.forEach((optionSet) => map.set(optionSet.id, optionSet));
		return map;
	}, [optionSets]);

	const selections = useMemo<OptionSelectionDraft[]>(() => draft.optionSelections ?? [], [draft.optionSelections]);
	const selectedSetIds = useMemo(() => new Set(selections.map((selection) => selection.optionSetId)), [selections]);
	const hasSelectedSets = selections.length > 0;
	const canContinue = useMemo(
		() => selections.length > 0 && selections.every((selection) => selection.selectedValueIds.length > 0),
		[selections],
	);

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
		patch({
			optionSelections: initialSelectionsRef.current ?? [],
		});
		router.replace(fallbackRoute as any);
	}, [fallbackRoute, isUiDisabled, lockNav, patch, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onToggle = useCallback(
		(optionSet: OptionSet, next: boolean) => {
			if (isUiDisabled) return;
			const nextSelections = next
				? [
						...selections,
						{
							optionSetId: optionSet.id,
							optionSetName: optionSet.name,
							displayName: optionSet.displayName,
							selectedValueIds: getActiveValueIds(optionSet),
						},
					]
				: selections.filter((selection) => selection.optionSetId !== optionSet.id);
			patch({
				optionSelections: nextSelections,
			});
		},
		[isUiDisabled, patch, selections],
	);

	const onOpenValues = useCallback(
		(optionSetId: string) => {
			if (isUiDisabled) return;
			if (!lockNav()) return;
			router.push({
				pathname: toScopedRoute(INVENTORY_PRODUCT_OPTIONS_VALUES_ROUTE) as any,
				params: {
					[DRAFT_ID_KEY]: draftId,
					[OPTION_SET_ID_KEY]: optionSetId,
				},
			});
		},
		[draftId, isUiDisabled, lockNav, router, toScopedRoute],
	);

	const onCreateOption = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		const backTo = `${toScopedRoute(INVENTORY_PRODUCT_OPTIONS_SELECT_ROUTE)}?${DRAFT_ID_KEY}=${encodeURIComponent(draftId)}`;
		const createRouteBase =
			routeScope === "settings-items-services" ? SETTINGS_OPTIONS_CREATE_ROUTE : INVENTORY_OPTIONS_CREATE_ROUTE;
		const createRoute = `${createRouteBase}?${DRAFT_ID_KEY}=${encodeURIComponent(draftId)}`;
		router.push(appendReturnToQuery(createRoute, backTo) as any);
	}, [draftId, isUiDisabled, lockNav, routeScope, router, toScopedRoute]);

	const onNext = useCallback(() => {
		if (isUiDisabled || !canContinue) return;
		if (!lockNav()) return;
		router.replace(fallbackRoute as any);
	}, [canContinue, fallbackRoute, isUiDisabled, lockNav, router]);

	const headerOptions = useInventoryHeader("process", {
		title: "Select Modifiers",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: fallbackRoute,
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
					<View style={styles.screen}>
						<BAISurface style={[styles.card, { borderColor }]} padded bordered>
							<BAISearchBar
								value={qText}
								onChangeText={(value) => {
									const cleaned = sanitizeSearchInput(value);
									setQText(cleaned.length > FIELD_LIMITS.search ? cleaned.slice(0, FIELD_LIMITS.search) : cleaned);
								}}
								placeholder='Search modifiers'
								onClear={hasSearch ? () => setQText("") : undefined}
								disabled={isUiDisabled}
							/>

							<BAIButton
								variant='outline'
								intent='neutral'
								onPress={onCreateOption}
								disabled={isUiDisabled}
								shape='pill'
								widthPreset='standard'
							>
								Create Modifier
							</BAIButton>

							{hasSelectedSets ? (
								<>
									{selections.map((selection) => {
										const optionSet = optionSetsById.get(selection.optionSetId);
										const preview = formatSelectionSummary(selection, optionSet);
										return (
											<Pressable
												key={selection.optionSetId}
												onPress={() => onOpenValues(selection.optionSetId)}
												disabled={isUiDisabled}
											>
												{({ pressed }) => (
													<BAISurface
														style={[
															styles.selectedRow,
															surfaceInteractive,
															pressed && !isUiDisabled ? styles.rowPressed : undefined,
														]}
														padded
														bordered
													>
														<View style={styles.selectedRowLeft}>
															<BAIText variant='subtitle'>{selection.optionSetName}</BAIText>
															<BAIText variant='caption' muted numberOfLines={1}>
																{preview || "No modifiers selected."}
															</BAIText>
														</View>
														<MaterialCommunityIcons
															name='chevron-right'
															size={24}
															color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
														/>
													</BAISurface>
												)}
											</Pressable>
										);
									})}
								</>
							) : null}

							<BAIText variant='subtitle'>Modifiers</BAIText>

							{query.isLoading ? (
								<View style={styles.stateWrap}>
									<BAIActivityIndicator size='large' tone='primary' />
									<BAIText variant='subtitle'>Loading options…</BAIText>
								</View>
							) : query.isError ? (
								<View style={styles.stateWrap}>
									<BAIText variant='subtitle'>Could not load options.</BAIText>
									<BAIRetryButton variant='outline' onPress={() => query.refetch()} disabled={isUiDisabled}>
										Retry
									</BAIRetryButton>
								</View>
							) : optionSets.length === 0 ? (
								<View style={styles.stateWrap}>
									<BAIText variant='subtitle'>No modifiers yet.</BAIText>
									<BAIText variant='caption' muted>
										Create a modifier set to continue.
									</BAIText>
								</View>
							) : (
								<FlatList
									data={optionSets}
									keyExtractor={(item) => item.id}
									renderItem={({ item }) => {
										const checked = selectedSetIds.has(item.id);
										return (
											<View style={[styles.optionRow, { borderBottomColor: borderColor }]}>
												<View style={styles.optionRowText}>
													<BAIText variant='subtitle'>{item.name}</BAIText>
												</View>
												<Switch
													value={checked}
													onValueChange={(next) => onToggle(item, next)}
													disabled={isUiDisabled}
												/>
											</View>
										);
									}}
									keyboardShouldPersistTaps='handled'
									showsVerticalScrollIndicator={false}
									style={styles.list}
								/>
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
								<BAICTAPillButton
									variant='solid'
									intent='primary'
									onPress={onNext}
									disabled={isUiDisabled || !canContinue}
									style={styles.actionBtn}
								>
									Next
								</BAICTAPillButton>
							</View>
						</BAISurface>
					</View>
				</TouchableWithoutFeedback>
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
		gap: 10,
	},
	stateWrap: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 20,
		gap: 8,
	},
	selectedRow: {
		borderWidth: 1,
		borderRadius: 12,
	},
	selectedRowLeft: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	rowPressed: {
		opacity: 0.9,
	},
	list: {
		flexGrow: 0,
	},
	optionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	optionRowText: {
		flex: 1,
		minWidth: 0,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 2,
	},
	actionBtn: {
		flex: 1,
	},
});
