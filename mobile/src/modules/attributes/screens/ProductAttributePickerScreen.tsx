import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Switch, useTheme } from "react-native-paper";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeSearchInput } from "@/shared/validation/sanitize";
import { useAttributesList } from "../attributes.queries";
import {
	ATTRIBUTE_SELECTIONS_KEY,
	buildAttributeSelectionParams,
	decodeAttributeSelections,
	DRAFT_ID_KEY,
	normalizeReturnTo,
	RETURN_TO_KEY,
	type ProductAttributeSelection,
} from "../attributePicker.contract";

export function ProductAttributePickerScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams();
	const { busy } = useAppBusy();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const returnTo = useMemo(
		() => normalizeReturnTo(params[RETURN_TO_KEY]) ?? toScopedRoute("/(app)/(tabs)/inventory/products/create"),
		[params, toScopedRoute],
	);
	const initialSelection = useMemo(() => decodeAttributeSelections(params[ATTRIBUTE_SELECTIONS_KEY]), [params]);
	const draftId = useMemo(() => String(params[DRAFT_ID_KEY] ?? "").trim(), [params]);
	const [selected, setSelected] = useState<ProductAttributeSelection[]>(initialSelection);
	const [search, setSearch] = useState("");
	const hydratedRef = useRef(initialSelection.map((entry) => `${entry.attributeId}:${entry.isRequired ? 1 : 0}`).join("|"));

	useEffect(() => {
		const next = initialSelection.map((entry) => `${entry.attributeId}:${entry.isRequired ? 1 : 0}`).join("|");
		if (next === hydratedRef.current) return;
		hydratedRef.current = next;
		setSelected(initialSelection);
	}, [initialSelection]);

	const isUiDisabled = !!busy?.isBusy;
	const query = useAttributesList(false);
	const items = useMemo(() => query.data ?? [], [query.data]);
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return items;
		return items.filter((item) => item.name.toLowerCase().includes(q));
	}, [items, search]);

	const selectedMap = useMemo(() => new Map(selected.map((entry) => [entry.attributeId, entry])), [selected]);
	const initialSignature = useMemo(
		() => initialSelection.map((entry) => `${entry.attributeId}:${entry.isRequired ? 1 : 0}`).sort().join("|"),
		[initialSelection],
	);
	const currentSignature = useMemo(
		() => selected.map((entry) => `${entry.attributeId}:${entry.isRequired ? 1 : 0}`).sort().join("|"),
		[selected],
	);
	const applyDisabled = isUiDisabled || initialSignature === currentSignature;

	const lockRef = useRef(false);
	const lockNav = useCallback((ms = 650) => {
		if (lockRef.current) return false;
		lockRef.current = true;
		setTimeout(() => {
			lockRef.current = false;
		}, ms);
		return true;
	}, []);

	const onBack = useCallback(() => {
		Keyboard.dismiss();
		if (!lockNav()) return;
		router.replace(returnTo as any);
	}, [lockNav, returnTo, router]);

	const onConfirm = useCallback(() => {
		Keyboard.dismiss();
		if (!lockNav()) return;
		router.replace({
			pathname: returnTo as any,
			params: buildAttributeSelectionParams({ selectedAttributes: selected, draftId: draftId || undefined }),
		} as any);
	}, [draftId, lockNav, returnTo, router, selected]);

	const toggleSelected = useCallback(
		(attributeId: string) => {
			if (isUiDisabled) return;
			setSelected((prev) => {
				if (prev.some((entry) => entry.attributeId === attributeId)) {
					return prev.filter((entry) => entry.attributeId !== attributeId);
				}
				return [...prev, { attributeId, isRequired: false }];
			});
		},
		[isUiDisabled],
	);

	const toggleRequired = useCallback(
		(attributeId: string, value: boolean) => {
			if (isUiDisabled) return;
			setSelected((prev) =>
				prev.map((entry) => (entry.attributeId === attributeId ? { ...entry, isRequired: value } : entry)),
			);
		},
		[isUiDisabled],
	);

	const onClear = useCallback(() => {
		if (isUiDisabled) return;
		setSelected([]);
	}, [isUiDisabled]);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom style={styles.root}>
				<BAIHeader
					title='Assign Attributes'
					variant='back'
					onLeftPress={onBack}
					onRightPress={onConfirm}
					rightDisabled={applyDisabled}
					rightSlot={({ disabled }) => (
						<View
							style={[
								styles.headerSavePill,
								{ backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary },
							]}
						>
							<BAIText style={{ color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary }}>
								Save
							</BAIText>
						</View>
					)}
				/>
				<TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
					<View style={styles.wrap}>
						<BAISurface style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} bordered>
							<View style={styles.controls}>
								<BAISearchBar
									value={search}
									onChangeText={(value) => {
										const cleaned = sanitizeSearchInput(value);
										setSearch(cleaned.length > FIELD_LIMITS.search ? cleaned.slice(0, FIELD_LIMITS.search) : cleaned);
									}}
									placeholder='Search attributes...'
									maxLength={FIELD_LIMITS.search}
								/>
								<View style={styles.actions}>
									<BAIButton variant='outline' shape='pill' onPress={onClear} disabled={isUiDisabled}>
										Clear All
									</BAIButton>
									<BAIText variant='caption' muted>
										{selected.length} selected
									</BAIText>
								</View>
							</View>
							<View style={styles.listWrap}>
								{query.isLoading ? (
									<View style={styles.stateWrap}>
										<BAIText muted>Loading attributes...</BAIText>
									</View>
								) : query.isError ? (
									<View style={styles.stateWrap}>
										<BAIRetryButton compact onPress={() => query.refetch()}>
											Retry
										</BAIRetryButton>
									</View>
								) : filtered.length === 0 ? (
									<View style={styles.stateWrap}>
										<BAIText muted>No attributes found.</BAIText>
									</View>
								) : (
									<FlatList
										data={filtered}
										keyExtractor={(item) => item.id}
										contentContainerStyle={styles.listContent}
										renderItem={({ item }) => {
											const picked = selectedMap.get(item.id);
											return (
												<BAISurface style={[styles.row, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} bordered>
													<Pressable style={styles.rowPress} onPress={() => toggleSelected(item.id)}>
														<View style={styles.rowLeft}>
															<BAIText variant='subtitle' numberOfLines={1}>
																{item.name}
															</BAIText>
															<BAIText variant='caption' muted numberOfLines={1}>
																{item.options.filter((option) => !option.isArchived).length} option
																{item.options.filter((option) => !option.isArchived).length === 1 ? "" : "s"}
															</BAIText>
														</View>
														<MaterialCommunityIcons
															name={picked ? "check-circle" : "checkbox-blank-circle-outline"}
															size={24}
															color={picked ? theme.colors.primary : theme.colors.onSurfaceVariant}
														/>
													</Pressable>
													{picked ? (
														<View style={styles.requiredRow}>
															<BAIText variant='caption' muted>
																Required for this product
															</BAIText>
															<Switch value={picked.isRequired === true} onValueChange={(v) => toggleRequired(item.id, v)} />
														</View>
													) : null}
												</BAISurface>
											);
										}}
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

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 10 },
	card: { flex: 1 },
	controls: { gap: 8 },
	actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	headerSavePill: {
		minWidth: 90,
		height: 40,
		borderRadius: 20,
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	listWrap: { flex: 1, minHeight: 0 },
	stateWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	listContent: { gap: 8, paddingBottom: 12 },
	row: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
	rowPress: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	rowLeft: { flex: 1, marginRight: 8 },
	requiredRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
