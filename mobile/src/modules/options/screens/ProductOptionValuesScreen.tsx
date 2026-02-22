// BizAssist_mobile
// path: src/modules/options/screens/ProductOptionValuesScreen.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { useAppBusy } from "@/hooks/useAppBusy";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import {
	DRAFT_ID_KEY,
	normalizeRoutePath,
	normalizeString,
	OPTION_SET_ID_KEY,
	RETURN_TO_KEY,
} from "@/modules/options/options.contract";
import { useOptionSetById, useUpdateOptionSet } from "@/modules/options/options.queries";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import {
	sanitizeEntityNameDraftInput,
	sanitizeEntityNameInput,
	sanitizeSearchInput,
} from "@/shared/validation/sanitize";

type RouteParams = {
	draftId?: string;
	optionSetId?: string;
	returnTo?: string;
	mode?: "SINGLE" | "MULTI";
};

function toggleInList(list: string[], id: string, checked: boolean): string[] {
	if (checked) {
		if (list.includes(id)) return list;
		return [...list, id];
	}
	return list.filter((valueId) => valueId !== id);
}

function optionValueLimitMessage(): string {
	return `You can add up to ${FIELD_LIMITS.optionValuesPerSet} options.`;
}

export default function ProductOptionValuesScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<RouteParams>();
	const { withBusy, busy } = useAppBusy();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const optionSetId = normalizeString(params[OPTION_SET_ID_KEY]);
	const returnTo = useMemo(() => normalizeRoutePath(params[RETURN_TO_KEY]), [params]);
	const mode = useMemo<"SINGLE" | "MULTI">(() => {
		const raw = String(params.mode ?? "")
			.trim()
			.toUpperCase();
		return raw === "SINGLE" ? "SINGLE" : "MULTI";
	}, [params.mode]);

	const { draft, draftId, patch } = useProductCreateDraft(normalizeString(params[DRAFT_ID_KEY]) || undefined);
	const optionSetQuery = useOptionSetById(optionSetId);
	const updateOptionSet = useUpdateOptionSet(optionSetId);

	const optionSet = optionSetQuery.data ?? null;
	const activeValues = useMemo(
		() => (optionSet?.values ?? []).filter((value) => value.isActive !== false),
		[optionSet?.values],
	);
	const hasReachedOptionCap = activeValues.length >= FIELD_LIMITS.optionValuesPerSet;

	const initialIdsRef = useRef<string[] | null>(null);
	const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);
	const [qText, setQText] = useState("");
	const [newValueText, setNewValueText] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!optionSet) return;
		if (initialIdsRef.current) return;

		const existingSelection = draft.optionSelections.find((selection) => selection.optionSetId === optionSet.id);
		const fromDraft = existingSelection?.selectedValueIds ?? [];
		const filtered = fromDraft.filter((id) => activeValues.some((value) => value.id === id));
		const fallback = filtered.length > 0 ? filtered : activeValues.map((value) => value.id);
		initialIdsRef.current = fallback;
		setSelectedValueIds(fallback);
	}, [activeValues, draft.optionSelections, optionSet]);

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

	const isUiDisabled = busy.isBusy || optionSetQuery.isLoading || updateOptionSet.isPending || isNavLocked;
	const canDone = selectedValueIds.length > 0;

	const commitSelection = useCallback(() => {
		if (!optionSet) return;

		const nextSelection = {
			optionSetId: optionSet.id,
			optionSetName: optionSet.name,
			displayName: optionSet.displayName,
			selectedValueIds,
		};

		patch({
			optionSelections: [
				...draft.optionSelections.filter((selection) => selection.optionSetId !== optionSet.id),
				nextSelection,
			],
		});
	}, [draft.optionSelections, optionSet, patch, selectedValueIds]);

	const navigateBack = useCallback(() => {
		if (returnTo) {
			router.replace(returnTo as any);
			return;
		}
		router.replace({
			pathname: toScopedRoute("/(app)/(tabs)/inventory/products/modifiers/select") as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
			},
		});
	}, [draftId, returnTo, router, toScopedRoute]);

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		navigateBack();
	}, [isUiDisabled, lockNav, navigateBack]);

	const onDone = useCallback(() => {
		if (isUiDisabled || !canDone) return;
		if (!lockNav()) return;
		commitSelection();
		navigateBack();
	}, [canDone, commitSelection, isUiDisabled, lockNav, navigateBack]);
	const guardedOnNavAction = useProcessExitGuard(onExit);

	const onAddOptionValue = useCallback(async () => {
		if (!optionSet || isUiDisabled) return;
		if (hasReachedOptionCap) {
			setError(optionValueLimitMessage());
			return;
		}
		const name = sanitizeEntityNameInput(newValueText).trim();
		if (!name) return;

		setError(null);
		await withBusy("Adding option…", async () => {
			try {
				const valuesPayload = [
					...optionSet.values.map((value, index) => ({
						id: value.id,
						name: value.name,
						sortOrder: index,
						isActive: value.isActive,
					})),
					{ name, sortOrder: optionSet.values.length, isActive: true },
				];
				const updated = await updateOptionSet.mutateAsync({
					name: optionSet.name,
					displayName: optionSet.displayName,
					values: valuesPayload,
				});

				const createdValue =
					updated.values.find((value) => value.name.toLowerCase() === name.toLowerCase()) ??
					updated.values[updated.values.length - 1];
				if (createdValue) {
					setSelectedValueIds((prev) => toggleInList(prev, createdValue.id, true));
				}

				setNewValueText("");
			} catch (err: any) {
				const data = err?.response?.data;
				const message = data?.message ?? data?.error?.message ?? "Could not add option.";
				setError(String(message));
			}
		});
	}, [hasReachedOptionCap, isUiDisabled, newValueText, optionSet, updateOptionSet, withBusy]);

	const filteredValues = useMemo(() => {
		const q = qText.trim().toLowerCase();
		if (!q) return activeValues;
		return activeValues.filter((value) => value.name.toLowerCase().includes(q));
	}, [activeValues, qText]);

	const allSelected = activeValues.length > 0 && activeValues.every((value) => selectedValueIds.includes(value.id));
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor,
			backgroundColor: surfaceAlt,
		}),
		[borderColor, surfaceAlt],
	);

	const onToggleAll = useCallback(() => {
		if (isUiDisabled) return;
		setSelectedValueIds(allSelected ? [] : activeValues.map((value) => value.id));
	}, [activeValues, allSelected, isUiDisabled]);

	const headerTitle = optionSet?.name || "Option Values";
	const headerOptions = useInventoryHeader("process", {
		title: headerTitle,
		disabled: isUiDisabled,
		onExit: guardedOnNavAction,
		exitFallbackRoute: toScopedRoute("/(app)/(tabs)/inventory/products/modifiers/select"),
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
					<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
						<Pressable style={styles.screen} onPress={Keyboard.dismiss}>
							<BAISurface style={[styles.card, { borderColor }]} padded bordered>
								<BAISearchBar
									value={qText}
									onChangeText={(value) => {
										const cleaned = sanitizeSearchInput(value);
										setQText(cleaned.length > FIELD_LIMITS.search ? cleaned.slice(0, FIELD_LIMITS.search) : cleaned);
									}}
									placeholder={`Search ${optionSet?.name ?? "options"}`}
									disabled={isUiDisabled}
									onClear={qText ? () => setQText("") : undefined}
								/>

								<BAIText variant='subtitle'>
									{`${optionSet?.displayName || "Options"} (${activeValues.length}/${FIELD_LIMITS.optionValuesPerSet})`}
								</BAIText>

								<Pressable onPress={onToggleAll} disabled={isUiDisabled}>
									{({ pressed }) => (
										<BAISurface
											style={[styles.valueRow, surfaceInteractive, pressed ? styles.rowPressed : undefined]}
											padded
											bordered
										>
											<BAIText variant='subtitle'>All options</BAIText>
											<MaterialCommunityIcons
												name={allSelected ? "check-circle" : "checkbox-blank-circle-outline"}
												size={30}
												color={allSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
											/>
										</BAISurface>
									)}
								</Pressable>

								<View style={styles.valuesWrap}>
									{filteredValues.map((value) => {
										const checked = selectedValueIds.includes(value.id);
										return (
											<Pressable
												key={value.id}
												onPress={() => {
													if (isUiDisabled) return;
													if (mode === "SINGLE") {
														setSelectedValueIds([value.id]);
														return;
													}
													setSelectedValueIds((prev) => toggleInList(prev, value.id, !checked));
												}}
												disabled={isUiDisabled}
											>
												{({ pressed }) => (
													<BAISurface
														style={[styles.valueRow, surfaceInteractive, pressed ? styles.rowPressed : undefined]}
														padded
														bordered
													>
														<BAIText variant='body'>{value.name}</BAIText>
														<MaterialCommunityIcons
															name={checked ? "check-circle" : "checkbox-blank-circle-outline"}
															size={30}
															color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant}
														/>
													</BAISurface>
												)}
											</Pressable>
										);
									})}
								</View>

								<View style={styles.addValueRow}>
									<BAITextInput
										style={styles.addValueInput}
										value={newValueText}
										onChangeText={(value) => setNewValueText(sanitizeEntityNameDraftInput(value))}
										onBlur={() => setNewValueText((prev) => sanitizeEntityNameInput(prev))}
										placeholder='Add option'
										maxLength={FIELD_LIMITS.unitName}
										disabled={isUiDisabled || hasReachedOptionCap}
										onSubmitEditing={onAddOptionValue}
									/>
									<BAIButton
										variant='outline'
										intent='neutral'
										onPress={onAddOptionValue}
										disabled={isUiDisabled || hasReachedOptionCap || !sanitizeEntityNameInput(newValueText).trim()}
										size='sm'
									>
										Add
									</BAIButton>
								</View>
								{error ? (
									<BAIText variant='caption' style={{ color: theme.colors.error }}>
										{error}
									</BAIText>
								) : null}

								{mode === "MULTI" ? (
									<View style={styles.actionsRow}>
										<BAIButton
											variant='outline'
											intent='neutral'
											onPress={guardedOnNavAction}
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
											onPress={onDone}
											disabled={isUiDisabled || !canDone}
											shape='pill'
											widthPreset='standard'
											style={styles.actionBtn}
										>
											Done
										</BAIButton>
									</View>
								) : (
									<View style={styles.actionsRow}>
										<BAIButton
											variant='solid'
											intent='primary'
											onPress={guardedOnNavAction}
											disabled={isUiDisabled || !canDone}
											shape='pill'
											widthPreset='standard'
											style={styles.actionBtnFull}
										>
											Apply
										</BAIButton>
									</View>
								)}
							</BAISurface>
						</Pressable>
					</TouchableWithoutFeedback>
				</KeyboardAvoidingView>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	keyboardAvoider: {
		flex: 1,
	},
	screen: {
		flex: 1,
		padding: 12,
	},
	card: {
		flex: 1,
		borderRadius: 18,
		gap: 10,
	},
	valuesWrap: {
		gap: 8,
	},
	valueRow: {
		borderWidth: 1,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	rowPressed: {
		opacity: 0.9,
	},
	addValueRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	addValueInput: {
		flex: 1,
		marginBottom: 0,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 2,
	},
	actionBtn: {
		flex: 1,
	},
	actionBtnFull: {
		flex: 1,
	},
});
