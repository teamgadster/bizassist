// BizAssist_mobile
// path: src/modules/options/screens/OptionSetUpsertScreen.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIIconButton } from "@/components/ui/BAIIconButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import {
	buildInventoryOptionDetailsRoute,
	buildSettingsOptionDetailsRoute,
	normalizeReturnTo,
	resolveInventoryOptionFlowExitRoute,
	resolveSettingsOptionFlowExitRoute,
	INVENTORY_OPTIONS_LEDGER_ROUTE,
	SETTINGS_OPTIONS_LEDGER_ROUTE,
} from "@/modules/options/options.navigation";
import { useCreateOptionSet, useOptionSetById, useUpdateOptionSet } from "@/modules/options/options.queries";
import type { OptionValueInput } from "@/modules/options/options.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeEntityNameDraftInput, sanitizeEntityNameInput } from "@/shared/validation/sanitize";

type OptionSetFlowMode = "settings" | "inventory";
type OptionSetUpsertIntent = "create" | "edit";

type RouteParams = {
	id?: string;
	returnTo?: string;
};

const DRAG_ROW_HEIGHT = 62;

function normalizeRoutePath(route: string | null | undefined): string {
	return String(route ?? "")
		.split("?")[0]
		.split("#")[0]
		.trim();
}

function capText(raw: string, maxLength: number): string {
	const value = String(raw ?? "");
	return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function sanitizeDraftText(raw: string): string {
	return capText(sanitizeEntityNameDraftInput(raw), FIELD_LIMITS.unitName);
}

function sanitizeFinalText(raw: string): string {
	return capText(sanitizeEntityNameInput(raw), FIELD_LIMITS.unitName);
}

function optionValueLimitMessage(): string {
	return `You can add up to ${FIELD_LIMITS.optionValuesPerSet} options.`;
}

function extractApiErrorMessage(err: unknown): string {
	const data = (err as any)?.response?.data;
	const error = data?.error ?? {};
	const code = typeof error?.code === "string" ? error.code : typeof data?.code === "string" ? data.code : undefined;
	const limitRaw = data?.data?.limit ?? error?.limit;
	const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : 200;

	if (code === "OPTION_SET_LIMIT_REACHED") {
		return `You've reached the maximum of ${limit} option sets.`;
	}
	const msg = data?.message ?? data?.error?.message ?? (err as any)?.message ?? "Could not save option set.";
	return String(msg);
}

function uniqNames(values: OptionValueInput[]): OptionValueInput[] {
	const seen = new Set<string>();
	const next: OptionValueInput[] = [];

	for (const value of values) {
		const name = sanitizeFinalText(value.name).trim();
		if (!name) continue;
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		next.push({ ...value, name, sortOrder: next.length });
	}

	return next;
}

function reorderValues(values: OptionValueInput[], fromIndex: number, toIndex: number): OptionValueInput[] {
	if (fromIndex === toIndex) return values;
	if (fromIndex < 0 || toIndex < 0 || fromIndex >= values.length || toIndex >= values.length) return values;

	const next = [...values];
	const [moved] = next.splice(fromIndex, 1);
	if (!moved) return values;
	next.splice(toIndex, 0, moved);
	return next.map((value, idx) => ({ ...value, sortOrder: idx }));
}

export function OptionSetUpsertScreen({
	mode = "settings",
	intent = "create",
}: {
	mode?: OptionSetFlowMode;
	intent?: OptionSetUpsertIntent;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const theme = useTheme();
	const tabBarHeight = useBottomTabBarHeight();
	const params = useLocalSearchParams<RouteParams>();
	const { withBusy, busy } = useAppBusy();

	const optionSetId = String(params.id ?? "").trim();
	const returnTo = useMemo(() => normalizeReturnTo(params.returnTo), [params.returnTo]);
	const currentPath = useMemo(() => normalizeRoutePath(pathname), [pathname]);
	const isEdit = intent === "edit";

	const query = useOptionSetById(optionSetId);
	const createMutation = useCreateOptionSet();
	const updateMutation = useUpdateOptionSet(optionSetId);

	const [name, setName] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [values, setValues] = useState<OptionValueInput[]>([{ name: "", sortOrder: 0 }]);
	const [draftValue, setDraftValue] = useState("");
	const [isDisplayNameAuto, setIsDisplayNameAuto] = useState(true);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
	const [dragDistance, setDragDistance] = useState(0);
	const dragStartYRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isEdit) return;
		if (hydrated) return;
		if (!query.data) return;

		const nextName = sanitizeFinalText(query.data.name);
		const nextDisplayName = sanitizeFinalText(query.data.displayName || query.data.name);
		setName(nextName);
		setDisplayName(nextDisplayName);
		setIsDisplayNameAuto(nextDisplayName === nextName);
		setValues(
			query.data.values.length > 0
				? query.data.values.map((value, index) => ({
						id: value.id,
						name: sanitizeFinalText(value.name),
						sortOrder: index,
					}))
				: [{ name: "", sortOrder: 0 }],
		);
		setHydrated(true);
	}, [hydrated, isEdit, query.data]);

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

	const normalizedValues = useMemo(() => uniqNames(values), [values]);
	const hasValidValues = normalizedValues.length > 0;
	const optionValuesCount = normalizedValues.length;
	const hasReachedOptionCap = optionValuesCount >= FIELD_LIMITS.optionValuesPerSet;
	const optionSectionTitle = useMemo(() => {
		const generatedName = sanitizeFinalText(displayName).trim();
		return generatedName ? `${generatedName} options` : "Options";
	}, [displayName]);

	const nameError = useMemo(() => {
		const v = sanitizeFinalText(name).trim();
		if (!v) return "Option set is required.";
		if (v.length > FIELD_LIMITS.unitName) return `Option set must be ${FIELD_LIMITS.unitName} characters or less.`;
		return null;
	}, [name]);

	const displayNameError = useMemo(() => {
		const v = sanitizeFinalText(displayName).trim();
		if (!v) return "Display name is required.";
		if (v.length > FIELD_LIMITS.unitName) return `Display name must be ${FIELD_LIMITS.unitName} characters or less.`;
		return null;
	}, [displayName]);

	const valuesError = useMemo(() => {
		if (!hasValidValues) return "Add at least one option.";
		if (normalizedValues.length > FIELD_LIMITS.optionValuesPerSet) return optionValueLimitMessage();
		return null;
	}, [hasValidValues, normalizedValues.length]);
	const canSubmit = !nameError && !displayNameError && !valuesError;

	const isSubmitting =
		busy.isBusy || createMutation.isPending || updateMutation.isPending || isNavLocked || (isEdit && query.isLoading);
	const isUiDisabled = isSubmitting;
	const isDragging = draggingIndex !== null;

	const fallbackLedgerRoute = mode === "settings" ? SETTINGS_OPTIONS_LEDGER_ROUTE : INVENTORY_OPTIONS_LEDGER_ROUTE;
	const detailRoute =
		isEdit && optionSetId
			? mode === "settings"
				? buildSettingsOptionDetailsRoute(optionSetId, null)
				: buildInventoryOptionDetailsRoute(optionSetId, null)
			: null;
	const resolveSafeRoute = useCallback(
		(candidate: string | null | undefined, fallback: string): string => {
			const candidatePath = normalizeRoutePath(candidate);
			if (!candidatePath || candidatePath === currentPath) return fallback;
			return candidate as string;
		},
		[currentPath],
	);

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		if (returnTo) {
			const fallback = detailRoute ?? fallbackLedgerRoute;
			router.replace(resolveSafeRoute(returnTo, fallback) as any);
			return;
		}

		if (detailRoute) {
			router.replace(resolveSafeRoute(detailRoute, fallbackLedgerRoute) as any);
			return;
		}

		const exitRoute =
			mode === "settings"
				? resolveSettingsOptionFlowExitRoute(returnTo)
				: resolveInventoryOptionFlowExitRoute(returnTo);
		router.replace(resolveSafeRoute(exitRoute || fallbackLedgerRoute, fallbackLedgerRoute) as any);
	}, [detailRoute, fallbackLedgerRoute, isUiDisabled, lockNav, mode, resolveSafeRoute, returnTo, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onNameChange = useCallback(
		(raw: string) => {
			const nextName = sanitizeDraftText(raw);
			setName(nextName);
			if (isDisplayNameAuto) {
				setDisplayName(nextName);
			}
		},
		[isDisplayNameAuto],
	);

	const onNameBlur = useCallback(() => {
		const finalName = sanitizeFinalText(name);
		setName(finalName);
		if (isDisplayNameAuto) {
			setDisplayName(finalName);
		}
	}, [isDisplayNameAuto, name]);

	const onDisplayNameChange = useCallback(
		(raw: string) => {
			const nextDisplayName = sanitizeDraftText(raw);
			setDisplayName(nextDisplayName);
			setIsDisplayNameAuto(nextDisplayName === sanitizeDraftText(name));
		},
		[name],
	);

	const onDisplayNameBlur = useCallback(() => {
		const finalDisplayName = sanitizeFinalText(displayName);
		setDisplayName(finalDisplayName);
		setIsDisplayNameAuto(finalDisplayName === sanitizeFinalText(name));
	}, [displayName, name]);

	const onAddDraftValue = useCallback(() => {
		if (isUiDisabled) return;
		if (draggingIndex !== null) return;
		if (hasReachedOptionCap) {
			setSubmitAttempted(true);
			setSubmitError(optionValueLimitMessage());
			return;
		}
		const cleaned = sanitizeFinalText(draftValue).trim();
		if (!cleaned) return;

		setValues((prev) => {
			const next = uniqNames([...prev, { name: cleaned, sortOrder: prev.length }]);
			return next.length > 0 ? next : [{ name: "", sortOrder: 0 }];
		});
		setDraftValue("");
	}, [draftValue, draggingIndex, hasReachedOptionCap, isUiDisabled]);

	const startDrag = useCallback(
		(index: number, pageY: number) => {
			if (isUiDisabled) return;
			if (draggingIndex !== null) return;
			dragStartYRef.current = pageY;
			setDragDistance(0);
			setDraggingIndex(index);
		},
		[draggingIndex, isUiDisabled],
	);

	const updateDrag = useCallback(
		(index: number, pageY: number) => {
			if (draggingIndex !== index) return;
			if (dragStartYRef.current === null) return;
			setDragDistance(pageY - dragStartYRef.current);
		},
		[draggingIndex],
	);

	const endDrag = useCallback(
		(index: number, pageY?: number) => {
			if (draggingIndex !== index) return;
			const startY = dragStartYRef.current;
			const rawDistance = typeof pageY === "number" && startY !== null ? pageY - startY : dragDistance;
			const offset = Math.round(rawDistance / DRAG_ROW_HEIGHT);
			const toIndex = Math.max(0, Math.min(values.length - 1, index + offset));

			if (toIndex !== index) {
				setValues((prev) => reorderValues(prev, index, toIndex));
			}

			dragStartYRef.current = null;
			setDragDistance(0);
			setDraggingIndex(null);
		},
		[dragDistance, draggingIndex, values.length],
	);

	const onSave = useCallback(async () => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		setSubmitAttempted(true);
		setSubmitError(null);

		if (nameError || displayNameError || valuesError) return;

		const payload = {
			name: sanitizeFinalText(name).trim(),
			displayName: sanitizeFinalText(displayName).trim(),
			values: normalizedValues,
		};

		await withBusy(isEdit ? "Saving option…" : "Creating option…", async () => {
			try {
				let nextDetailRoute = detailRoute;
				if (isEdit) {
					await updateMutation.mutateAsync(payload);
				} else {
					const created = await createMutation.mutateAsync({
						name: payload.name,
						displayName: payload.displayName,
						values: payload.values.map((value) => value.name),
					});
					nextDetailRoute =
						mode === "settings"
							? buildSettingsOptionDetailsRoute(created.id, null)
							: buildInventoryOptionDetailsRoute(created.id, null);
				}

				if (returnTo) {
					const fallback = nextDetailRoute ?? fallbackLedgerRoute;
					router.replace(resolveSafeRoute(returnTo, fallback) as any);
					return;
				}

				if (nextDetailRoute) {
					router.replace(resolveSafeRoute(nextDetailRoute, fallbackLedgerRoute) as any);
					return;
				}

				router.replace(resolveSafeRoute(fallbackLedgerRoute, fallbackLedgerRoute) as any);
			} catch (err) {
				setSubmitError(extractApiErrorMessage(err));
			}
		});
	}, [
		createMutation,
		displayName,
		displayNameError,
		fallbackLedgerRoute,
		isEdit,
		isUiDisabled,
		lockNav,
		mode,
		name,
		nameError,
		normalizedValues,
		detailRoute,
		resolveSafeRoute,
		returnTo,
		router,
		updateMutation,
		valuesError,
		withBusy,
	]);

	const headerTitle = isEdit ? "Edit Option" : "Create Option";
	const appHeaderOptions = useAppHeader("process", {
		title: headerTitle,
		disabled: isUiDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: fallbackLedgerRoute,
	});
	const inventoryHeaderOptions = useInventoryHeader("process", {
		title: headerTitle,
		disabled: isUiDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: fallbackLedgerRoute,
	});
	const headerOptions = mode === "settings" ? appHeaderOptions : inventoryHeaderOptions;

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const cardBottomGap = 4;
	const screenBottomPad = tabBarHeight + cardBottomGap;

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false}>
				<KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
					<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
						<Pressable style={[styles.screen, { paddingBottom: screenBottomPad }]} onPress={Keyboard.dismiss}>
							<BAISurface style={[styles.card, { borderColor }]} padded bordered>
								<ScrollView
									style={styles.formScroll}
									contentContainerStyle={styles.formContent}
									showsVerticalScrollIndicator={false}
									keyboardShouldPersistTaps='handled'
									keyboardDismissMode='on-drag'
								>
									{isEdit && query.isError ? (
										<View style={styles.stateWrap}>
											<BAIText variant='subtitle'>Could not load option set.</BAIText>
											<BAIRetryButton variant='outline' onPress={() => query.refetch()} disabled={isUiDisabled}>
												Retry
											</BAIRetryButton>
										</View>
									) : (
										<>
											<BAITextInput
												label='Option set'
												value={name}
												onChangeText={onNameChange}
												onBlur={onNameBlur}
												maxLength={FIELD_LIMITS.unitName}
												placeholder='Tshirt color'
												disabled={isUiDisabled}
												error={submitAttempted && !!nameError}
												errorMessage={submitAttempted ? (nameError ?? undefined) : undefined}
											/>

											<BAITextInput
												label='Display name'
												value={displayName}
												onChangeText={onDisplayNameChange}
												onBlur={onDisplayNameBlur}
												maxLength={FIELD_LIMITS.unitName}
												placeholder='Color'
												disabled={isUiDisabled}
												error={submitAttempted && !!displayNameError}
												errorMessage={submitAttempted ? (displayNameError ?? undefined) : undefined}
											/>

											<View style={styles.sectionHeader}>
												<BAIText variant='subtitle'>{optionSectionTitle}</BAIText>
											</View>
											<BAIText variant='caption' muted>
												{`Long press and drag to reorder options (${optionValuesCount}/${FIELD_LIMITS.optionValuesPerSet}).`}
											</BAIText>

											{values.map((value, index) => (
												<View
													key={`${value.id ?? "new"}-${index}`}
													style={[
														styles.valueRow,
														draggingIndex === index
															? [styles.valueRowDragging, { transform: [{ translateY: dragDistance }] }]
															: undefined,
														isDragging && draggingIndex !== index ? styles.valueRowMuted : undefined,
													]}
												>
													<Pressable
														hitSlop={8}
														onLongPress={(event) => startDrag(index, event.nativeEvent.pageY)}
														onTouchMove={(event) => updateDrag(index, event.nativeEvent.pageY)}
														onTouchEnd={(event) => endDrag(index, event.nativeEvent.pageY)}
														onPressOut={() => endDrag(index)}
														onTouchCancel={() => endDrag(index)}
														delayLongPress={110}
														disabled={isUiDisabled}
													>
														<MaterialCommunityIcons
															name='drag'
															size={22}
															color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
														/>
													</Pressable>
													<BAITextInput
														style={styles.valueInput}
														value={value.name}
														onChangeText={(text) => {
															setValues((prev) =>
																prev.map((row, rowIndex) =>
																	rowIndex === index ? { ...row, name: sanitizeDraftText(text) } : row,
																),
															);
														}}
														onBlur={() => {
															setValues((prev) =>
																prev.map((row, rowIndex) =>
																	rowIndex === index ? { ...row, name: sanitizeFinalText(row.name) } : row,
																),
															);
														}}
														maxLength={FIELD_LIMITS.unitName}
														placeholder='Add option'
														disabled={isUiDisabled || isDragging}
													/>
													<Pressable
														hitSlop={8}
														onPress={() => {
															if (isUiDisabled || isDragging) return;
															setValues((prev) => {
																const next = prev.filter((_, rowIndex) => rowIndex !== index);
																return next.length > 0 ? next : [{ name: "", sortOrder: 0 }];
															});
														}}
														disabled={isUiDisabled}
													>
														<MaterialCommunityIcons
															name='close'
															size={28}
															color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
														/>
													</Pressable>
												</View>
											))}

											<View style={styles.addRow}>
												<BAITextInput
													style={styles.valueInput}
													value={draftValue}
													onChangeText={(value) => setDraftValue(sanitizeDraftText(value))}
													onBlur={() => setDraftValue((prev) => sanitizeFinalText(prev))}
													maxLength={FIELD_LIMITS.unitName}
													placeholder='Add option'
													disabled={isUiDisabled || isDragging}
													onSubmitEditing={onAddDraftValue}
													height={44}
												/>
												<BAIIconButton
													icon='plus'
													accessibilityLabel='Add option'
													variant='outlined'
													size='sm'
													iconSize={28}
													style={{ height: 44, width: 44, borderRadius: 22 }}
													onPress={onAddDraftValue}
													disabled={
														isUiDisabled || isDragging || hasReachedOptionCap || !sanitizeFinalText(draftValue).trim()
													}
												/>
											</View>

											{submitAttempted && valuesError ? (
												<BAIText variant='caption' style={{ color: theme.colors.error }}>
													{valuesError}
												</BAIText>
											) : null}

											{submitError ? (
												<BAIText variant='caption' style={{ color: theme.colors.error }}>
													{submitError}
												</BAIText>
											) : null}

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
													onPress={onSave}
													disabled={isUiDisabled || isDragging || !canSubmit}
													style={styles.actionBtn}
												>
													{isEdit ? "Done" : "Create"}
												</BAICTAPillButton>
											</View>
										</>
									)}
								</ScrollView>
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
		paddingTop: 0,
	},
	card: {
		flex: 1,
		borderRadius: 18,
		paddingBottom: 220,
	},
	formScroll: {
		flex: 1,
	},
	formContent: {
		gap: 10,
		paddingBottom: 6,
	},
	stateWrap: {
		paddingVertical: 24,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
	sectionHeader: {
		marginTop: 2,
	},
	valueRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingBottom: 2,
	},
	valueRowDragging: {
		zIndex: 10,
		elevation: 4,
		shadowOpacity: 0.2,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
	},
	valueRowMuted: {
		opacity: 0.72,
	},
	addRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingBottom: 2,
	},
	valueInput: {
		flex: 1,
		marginBottom: 0,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 8,
		marginBottom: 240,
	},
	actionBtn: {
		flex: 1,
	},
});
