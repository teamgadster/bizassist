import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import type { ModifierGroup } from "@/modules/modifiers/modifiers.types";
import {
	buildModifierSelectionParams,
	DRAFT_ID_KEY,
	MODIFIER_SELECTED_IDS_KEY,
	MODIFIER_SELECTION_SOURCE_KEY,
	normalizeReturnTo,
	parseModifierSelectionParams,
	RETURN_TO_KEY,
	type ModifierPickerInboundParams,
} from "@/modules/modifiers/modifierPicker.contract";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeSearchInput } from "@/shared/validation/sanitize";

const modifierPickerKey = ["modifiers", "groups", "attach-picker-screen"] as const;

export function ModifierGroupAttachPickerScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const tabBarHeight = useBottomTabBarHeight();
	const params = useLocalSearchParams<ModifierPickerInboundParams>();
	const { busy } = useAppBusy();

	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const returnTo = useMemo(
		() => normalizeReturnTo(params[RETURN_TO_KEY]) ?? toScopedRoute("/(app)/(tabs)/inventory/products/create"),
		[params, toScopedRoute],
	);

	const parsedSelection = useMemo(() => parseModifierSelectionParams(params), [params]);
	const selectionSignature = useMemo(
		() => parsedSelection.selectedModifierGroupIds.join("|"),
		[parsedSelection.selectedModifierGroupIds],
	);
	const draftId = useMemo(
		() => parsedSelection.draftId || String(params[DRAFT_ID_KEY] ?? "").trim(),
		[params, parsedSelection.draftId],
	);

	const [selectedIds, setSelectedIds] = useState<string[]>(() => parsedSelection.selectedModifierGroupIds);
	const [search, setSearch] = useState("");
	const lastHydratedSignatureRef = useRef<string>(selectionSignature);

	useEffect(() => {
		if (!parsedSelection.hasSelectionKey) return;
		if (lastHydratedSignatureRef.current === selectionSignature) return;
		lastHydratedSignatureRef.current = selectionSignature;
		setSelectedIds((prev) => {
			const next = parsedSelection.selectedModifierGroupIds;
			if (prev.length === next.length && prev.every((value, index) => value === next[index])) {
				return prev;
			}
			return next;
		});
	}, [parsedSelection.hasSelectionKey, parsedSelection.selectedModifierGroupIds, selectionSignature]);

	const navLockRef = useRef(false);
	const lockNav = useCallback((ms = 650) => {
		if (navLockRef.current) return false;
		navLockRef.current = true;
		setTimeout(() => {
			navLockRef.current = false;
		}, ms);
		return true;
	}, []);

	const isUiDisabled = !!busy?.isBusy;

	const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);

	const query = useQuery({
		queryKey: modifierPickerKey,
		queryFn: () => modifiersApi.listGroups(false),
		staleTime: 30_000,
	});

	const items = useMemo(() => query.data ?? [], [query.data]);
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return items;
		return items.filter((item) => item.name.toLowerCase().includes(q));
	}, [items, search]);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const initialSelectionSignature = useMemo(
		() => [...parsedSelection.selectedModifierGroupIds].sort().join("|"),
		[parsedSelection.selectedModifierGroupIds],
	);
	const currentSelectionSignature = useMemo(() => [...selectedIds].sort().join("|"), [selectedIds]);
	const isApplyDisabled = isUiDisabled || initialSelectionSignature === currentSelectionSignature;

	const onBack = useCallback(() => {
		dismissKeyboard();
		if (!lockNav()) return;
		router.replace(returnTo as any);
	}, [dismissKeyboard, lockNav, returnTo, router]);

	const onConfirm = useCallback(() => {
		dismissKeyboard();
		if (!lockNav()) return;
		router.replace({
			pathname: returnTo as any,
			params: buildModifierSelectionParams({
				selectedModifierGroupIds: selectedIds,
				selectionSource: selectedIds.length ? "existing" : "cleared",
				draftId: draftId || undefined,
			}),
		});
	}, [dismissKeyboard, draftId, lockNav, returnTo, router, selectedIds]);

	const onClear = useCallback(() => {
		if (isUiDisabled) return;
		setSelectedIds([]);
	}, [isUiDisabled]);

	const onApplyAll = useCallback(() => {
		if (isUiDisabled) return;
		setSelectedIds(items.map((item) => item.id));
	}, [isUiDisabled, items]);

	const toggle = useCallback(
		(id: string) => {
			if (isUiDisabled) return;
			setSelectedIds((prev) => {
				if (prev.includes(id)) return prev.filter((value) => value !== id);
				return [...prev, id];
			});
		},
		[isUiDisabled],
	);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom style={styles.root}>
				<BAIHeader
					title='Select Modifiers'
					variant='back'
					onLeftPress={onBack}
					onRightPress={onConfirm}
					rightDisabled={isApplyDisabled}
					rightSlot={({ disabled }) => (
						<View
							style={[
								styles.headerApplyPill,
								{ backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary },
							]}
						>
							<BAIText
								variant='body'
								style={{
									color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary,
									fontSize: 16,
									fontWeight: "600",
								}}
							>
								Save
							</BAIText>
						</View>
					)}
				/>
				<TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
					<View style={[styles.wrap, { paddingBottom: tabBarHeight + 8 }]}>
						<BAISurface
							style={[
								styles.card,
								{ borderColor: theme.colors.outlineVariant ?? theme.colors.outline },
							]}
							padded={false}
							bordered
						>
							<View style={styles.panelContent}>
								<View style={styles.headRow}>
									<BAIText variant='subtitle'>Modifiers</BAIText>
									<BAIText variant='caption' muted>
										{selectedIds.length} selected
									</BAIText>
								</View>

								<BAISearchBar
									value={search}
									onChangeText={(value) => {
										const cleaned = sanitizeSearchInput(value);
										setSearch(cleaned.length > FIELD_LIMITS.search ? cleaned.slice(0, FIELD_LIMITS.search) : cleaned);
									}}
									placeholder='Search modifiers...'
									maxLength={FIELD_LIMITS.search}
									disabled={isUiDisabled}
								/>

								<View style={styles.actionsRow}>
									<BAIButton
										mode='outlined'
										variant='outline'
										onPress={onClear}
										disabled={isUiDisabled}
										shape='pill'
										style={styles.actionButton}
									>
										Clear All
									</BAIButton>
									<BAIButton
										mode='outlined'
										variant='outline'
										onPress={onApplyAll}
										disabled={isUiDisabled || items.length === 0}
										shape='pill'
										style={styles.actionButton}
									>
										Apply All
									</BAIButton>
								</View>
							</View>

							<View style={styles.listWrap}>
								<View
									style={[
										styles.listTopDivider,
										{ borderColor: theme.colors.outlineVariant ?? theme.colors.outline },
									]}
								/>
								{query.isLoading ? (
									<View style={styles.stateWrap}>
										<BAIText variant='body' muted>
											Loading modifiers...
										</BAIText>
									</View>
								) : query.isError ? (
									<View style={styles.stateWrap}>
										<BAIRetryButton compact onPress={() => query.refetch()}>
											Retry
										</BAIRetryButton>
									</View>
								) : filtered.length === 0 ? (
									<View style={styles.stateWrap}>
										<BAIText variant='body' muted>
											No modifiers found.
										</BAIText>
									</View>
								) : (
									<FlatList
										data={filtered}
										keyExtractor={(item) => item.id}
										renderItem={({ item }) => (
											<ModifierRow item={item} checked={selectedSet.has(item.id)} onPress={() => toggle(item.id)} />
										)}
										contentContainerStyle={styles.listContent}
										keyboardShouldPersistTaps='handled'
										showsVerticalScrollIndicator={false}
										ItemSeparatorComponent={null}
									/>
								)}
							</View>
						</BAISurface>
					</View>
				</TouchableWithoutFeedback>
			</BAIScreen>
		</>
	);
}

function ModifierRow({ item, checked, onPress }: { item: ModifierGroup; checked: boolean; onPress: () => void }) {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.row,
				{ borderBottomColor: borderColor, backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent" },
			]}
		>
			<View style={styles.rowText}>
				<BAIText variant='subtitle' numberOfLines={1}>
					{item.name}
				</BAIText>
				<BAIText variant='caption' muted numberOfLines={1}>
					{item.options.length} option{item.options.length === 1 ? "" : "s"}
				</BAIText>
			</View>
			<MaterialCommunityIcons
				name={checked ? "check-circle" : "checkbox-blank-circle-outline"}
				size={28}
				color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
			/>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 0 },
	card: { flex: 1, borderRadius: 16, overflow: "hidden" },
	panelContent: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, gap: 10 },
	headerApplyPill: {
		minWidth: 90,
		height: 40,
		borderRadius: 20,
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	actionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
	actionButton: { flex: 1 },
	listWrap: {
		flex: 1,
		minHeight: 0,
	},
	listTopDivider: { borderTopWidth: StyleSheet.hairlineWidth },
	stateWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		padding: 16,
	},
	listContent: { paddingBottom: 8 },
	row: {
		minHeight: 74,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	rowText: { flex: 1, marginRight: 12, gap: 2 },
});
