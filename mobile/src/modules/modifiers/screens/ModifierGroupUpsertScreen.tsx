import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

import { ConfirmActionModal } from "@/components/settings/ConfirmActionModal";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import {
	buildModifierGroupDraftId,
	clearModifierGroupDraft,
	createModifierGroupDraft,
	getModifierGroupDraft,
	type ModifierOptionDraft,
	upsertModifierGroupDraft,
} from "@/modules/modifiers/drafts/modifierGroupDraft";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import type { ModifierSelectionType } from "@/modules/modifiers/modifiers.types";

type Props = { mode: "settings" | "inventory"; intent: "create" | "edit" };

function toMoneyText(minor: string): string {
	const value = Number.parseInt(String(minor || "0"), 10);
	if (!Number.isFinite(value) || value < 0) return "0.00";
	return (value / 100).toFixed(2);
}

function toMinorUnits(value: string): string | null {
	const trimmed = String(value ?? "").trim();
	if (!trimmed) return null;
	if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
	const [whole, frac = ""] = trimmed.split(".");
	const cents = (frac + "00").slice(0, 2);
	return `${whole}${cents}`;
}

function makeOptionKey() {
	return `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildSnapshot(input: {
	name: string;
	selectionType: ModifierSelectionType;
	isRequired: boolean;
	minSelected: string;
	maxSelected: string;
	options: ModifierOptionDraft[];
}) {
	return JSON.stringify({
		name: input.name.trim(),
		selectionType: input.selectionType,
		isRequired: input.isRequired,
		minSelected: input.minSelected,
		maxSelected: input.maxSelected,
		options: input.options
			.filter((option) => !option.removed)
			.map((option) => ({
				id: option.id ?? "",
				name: option.name.trim(),
				priceText: option.priceText.trim(),
				isSoldOut: option.isSoldOut,
			})),
	});
}

export function ModifierGroupUpsertScreen({ mode, intent }: Props) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<{ id?: string }>();
	const groupId = String(params.id ?? "").trim();
	const normalizedGroupId = intent === "edit" ? groupId : "";
	const draftId = useMemo(
		() => buildModifierGroupDraftId(mode, intent, normalizedGroupId),
		[intent, mode, normalizedGroupId],
	);
	const { withBusy } = useAppBusy();
	const queryClient = useQueryClient();

	const [name, setName] = useState("");
	const [selectionType, setSelectionType] = useState<ModifierSelectionType>("MULTI");
	const [isRequired, setIsRequired] = useState(false);
	const [minSelected, setMinSelected] = useState("0");
	const [maxSelected, setMaxSelected] = useState("1");
	const [options, setOptions] = useState<ModifierOptionDraft[]>([
		{ key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false },
	]);
	const [appliedProductIds, setAppliedProductIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);
	const [hydratedFromServer, setHydratedFromServer] = useState(intent === "create");
	const [confirmExitOpen, setConfirmExitOpen] = useState(false);
	const [confirmOptionRemoveKey, setConfirmOptionRemoveKey] = useState<string | null>(null);
	const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);

	const backRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";

	useEffect(() => {
		if (initialized) return;
		const existingDraft = getModifierGroupDraft(draftId);
		const seed = existingDraft ?? createModifierGroupDraft(draftId, mode, intent, normalizedGroupId);

		setName(seed.name);
		setSelectionType(seed.selectionType);
		setIsRequired(seed.isRequired);
		setMinSelected(seed.minSelected);
		setMaxSelected(seed.maxSelected);
		setOptions(
			seed.options.length > 0
				? seed.options
				: [{ key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false }],
		);
		setAppliedProductIds(Array.isArray(seed.appliedProductIds) ? seed.appliedProductIds : []);
		setHydratedFromServer(seed.hydratedFromServer);

		if (seed.hydratedFromServer) {
			setInitialSnapshot(
				buildSnapshot({
					name: seed.name,
					selectionType: seed.selectionType,
					isRequired: seed.isRequired,
					minSelected: seed.minSelected,
					maxSelected: seed.maxSelected,
					options: seed.options,
				}),
			);
		}

		setInitialized(true);
	}, [draftId, initialized, intent, mode, normalizedGroupId]);

	useEffect(() => {
		if (!initialized) return;
		upsertModifierGroupDraft(draftId, {
			name,
			selectionType,
			isRequired,
			minSelected,
			maxSelected,
			options,
			appliedProductIds,
			hydratedFromServer,
		});
	}, [
		appliedProductIds,
		draftId,
		hydratedFromServer,
		initialized,
		isRequired,
		maxSelected,
		minSelected,
		name,
		options,
		selectionType,
	]);

	useEffect(() => {
		if (!initialized || intent !== "edit" || !groupId || hydratedFromServer) return;
		withBusy("Loading modifier set...", async () => {
			try {
				const group = await modifiersApi.getGroup(groupId);
				const hydratedOptions = group.options.map((option) => ({
					key: makeOptionKey(),
					id: option.id,
					name: option.name,
					priceText: toMoneyText(option.priceDeltaMinor),
					isSoldOut: option.isSoldOut,
					removed: option.isArchived,
				}));
				setName(group.name);
				setSelectionType(group.selectionType);
				setIsRequired(group.isRequired);
				setMinSelected(String(group.minSelected));
				setMaxSelected(String(group.maxSelected));
				setOptions(hydratedOptions);
				setAppliedProductIds([]);
				setHydratedFromServer(true);

				const snapshot = buildSnapshot({
					name: group.name,
					selectionType: group.selectionType,
					isRequired: group.isRequired,
					minSelected: String(group.minSelected),
					maxSelected: String(group.maxSelected),
					options: hydratedOptions,
				});
				setInitialSnapshot(snapshot);

				upsertModifierGroupDraft(draftId, {
					name: group.name,
					selectionType: group.selectionType,
					isRequired: group.isRequired,
					minSelected: String(group.minSelected),
					maxSelected: String(group.maxSelected),
					options: hydratedOptions,
					appliedProductIds: [],
					hydratedFromServer: true,
				});
			} catch (e: any) {
				setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not load modifier set.");
			}
		});
	}, [draftId, groupId, hydratedFromServer, initialized, intent, withBusy]);

	const resolveExitRoute = useCallback(() => {
		if (intent === "edit" && groupId) return `${backRoute}/${encodeURIComponent(groupId)}`;
		return backRoute;
	}, [backRoute, groupId, intent]);

	const performExit = useCallback(() => {
		setConfirmExitOpen(false);
		clearModifierGroupDraft(draftId);
		router.replace(resolveExitRoute() as any);
	}, [draftId, resolveExitRoute, router]);

	const onResumeEditing = useCallback(() => {
		setConfirmExitOpen(false);
	}, []);

	const currentSnapshot = useMemo(
		() =>
			buildSnapshot({
				name,
				selectionType,
				isRequired,
				minSelected,
				maxSelected,
				options,
			}),
		[isRequired, maxSelected, minSelected, name, options, selectionType],
	);

	const hasUnsavedChanges = useMemo(() => {
		if (!initialized) return false;
		const baseline =
			initialSnapshot ??
			buildSnapshot({
				name: "",
				selectionType: "MULTI",
				isRequired: false,
				minSelected: "0",
				maxSelected: "1",
				options: [{ key: "base", name: "", priceText: "0.00", isSoldOut: false }],
			});
		return baseline !== currentSnapshot;
	}, [currentSnapshot, initialSnapshot, initialized]);

	const onExit = useCallback(() => {
		Keyboard.dismiss();
		if (hasUnsavedChanges) {
			setConfirmExitOpen(true);
			return;
		}
		performExit();
	}, [hasUnsavedChanges, performExit]);

	const guardedExit = useProcessExitGuard(onExit);

	const headerTitle = intent === "create" ? "New Modifier Set" : "Edit Modifier";

	const dismissKeyboard = useCallback(() => {
		Keyboard.dismiss();
	}, []);

	const applySetCount = appliedProductIds.length;
	const applySetRoute =
		mode === "settings" ? "/(app)/(tabs)/settings/modifiers/apply-set" : "/(app)/(tabs)/inventory/modifiers/apply-set";

	const onPressApplySet = useCallback(() => {
		router.push({
			pathname: applySetRoute as any,
			params: { draftId } as any,
		});
	}, [applySetRoute, draftId, router]);

	const activeOptions = useMemo(() => options.filter((opt) => !opt.removed), [options]);

	const pendingOptionToRemove = useMemo(
		() => (confirmOptionRemoveKey ? (options.find((opt) => opt.key === confirmOptionRemoveKey) ?? null) : null),
		[confirmOptionRemoveKey, options],
	);

	const removeDraftOptionLocally = useCallback((rowKey: string) => {
		setOptions((prev) => prev.filter((opt) => opt.key !== rowKey));
	}, []);

	const requestRemoveOption = useCallback(
		(row: ModifierOptionDraft) => {
			if (!row.id) {
				removeDraftOptionLocally(row.key);
				return;
			}
			setConfirmOptionRemoveKey(row.key);
		},
		[removeDraftOptionLocally],
	);

	const dismissRemoveOptionConfirm = useCallback(() => {
		setConfirmOptionRemoveKey(null);
	}, []);

	const onConfirmRemovePersistedOption = useCallback(() => {
		if (!pendingOptionToRemove?.id) {
			setConfirmOptionRemoveKey(null);
			return;
		}
		const optionId = pendingOptionToRemove.id;
		const optionKey = pendingOptionToRemove.key;
		setConfirmOptionRemoveKey(null);
		withBusy("Removing option...", async () => {
			try {
				await modifiersApi.archiveOption(optionId);
				setOptions((prev) => prev.filter((opt) => opt.key !== optionKey));
				await queryClient.invalidateQueries({ queryKey: ["modifiers"] });
			} catch (e: any) {
				setError(
					e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not remove modifier option.",
				);
			}
		});
	}, [pendingOptionToRemove, queryClient, withBusy]);

	const onSave = useCallback(() => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Modifier set name is required.");
			return;
		}
		if (activeOptions.length === 0) {
			setError("Add at least one modifier option.");
			return;
		}
		const parsedMin = Number.parseInt(minSelected || "0", 10);
		const parsedMax = Number.parseInt(maxSelected || "0", 10);
		if (
			!Number.isFinite(parsedMin) ||
			!Number.isFinite(parsedMax) ||
			parsedMin < 0 ||
			parsedMax < 0 ||
			parsedMin > parsedMax
		) {
			setError("Invalid min/max selection rules.");
			return;
		}
		for (const row of activeOptions) {
			if (!row.name.trim()) {
				setError("Each option needs a name.");
				return;
			}
			if (toMinorUnits(row.priceText) == null) {
				setError("Option prices must be valid money values.");
				return;
			}
		}
		setError(null);

		withBusy("Saving modifier set...", async () => {
			try {
				let targetGroupId = groupId;
				if (intent === "create") {
					const created = await modifiersApi.createGroup({
						name: trimmedName,
						selectionType,
						isRequired,
						minSelected: parsedMin,
						maxSelected: parsedMax,
					});
					targetGroupId = created.id;
				} else {
					await modifiersApi.updateGroup(targetGroupId, {
						name: trimmedName,
						selectionType,
						isRequired,
						minSelected: parsedMin,
						maxSelected: parsedMax,
					});
				}
				for (let idx = 0; idx < options.length; idx += 1) {
					const row = options[idx];
					if (row.removed) {
						if (row.id) await modifiersApi.archiveOption(row.id);
						continue;
					}
					const priceDeltaMinor = toMinorUnits(row.priceText)!;
					if (row.id) {
						await modifiersApi.updateOption(row.id, {
							name: row.name.trim(),
							priceDeltaMinor,
							isSoldOut: row.isSoldOut,
							sortOrder: idx,
						});
					} else {
						await modifiersApi.createOption(targetGroupId, {
							name: row.name.trim(),
							priceDeltaMinor,
							sortOrder: idx,
						});
					}
				}

				const selectedProductIds = Array.from(
					new Set(appliedProductIds.map((value) => String(value ?? "").trim()).filter((value) => value.length > 0)),
				);

				if (targetGroupId) {
					await modifiersApi.syncModifierGroupProducts({
						modifierGroupId: targetGroupId,
						selectedProductIds,
					});
				}

				clearModifierGroupDraft(draftId);
				router.replace(`${backRoute}/${encodeURIComponent(targetGroupId)}` as any);
			} catch (e: any) {
				setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not save modifier set.");
			}
		});
	}, [
		activeOptions,
		appliedProductIds,
		backRoute,
		draftId,
		groupId,
		intent,
		isRequired,
		maxSelected,
		minSelected,
		name,
		options,
		router,
		selectionType,
		withBusy,
	]);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<BAIHeader
					title={headerTitle}
					variant='exit'
					onLeftPress={guardedExit}
					onRightPress={onSave}
					rightSlot={({ disabled }) => (
						<View
							style={[
								styles.headerSavePill,
								{ backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary },
							]}
						>
							<BAIText
								variant='body'
								style={{ color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary }}
							>
								Save
							</BAIText>
						</View>
					)}
				/>
				<KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
					<TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
						<View style={styles.wrap}>
							<View style={styles.contentWrap}>
								<BAISurface
									bordered
									padded
									style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
								>
									<ScrollView
										contentContainerStyle={styles.content}
										keyboardShouldPersistTaps='handled'
										keyboardDismissMode='on-drag'
										onScrollBeginDrag={dismissKeyboard}
									>
										<BAITextInput
											label='Modifier Set Name'
											value={name}
											onChangeText={setName}
											placeholder='Modifier Set Name'
										/>
										<BAIText variant='caption' muted>
											Selection rules apply during checkout. Configure the minimum and maximum selections for this set.
										</BAIText>
										<Pressable
											onPress={onPressApplySet}
											style={({ pressed }) => [
												styles.applySetRow,
												{ borderColor: theme.colors.outlineVariant ?? theme.colors.outline },
												pressed ? { opacity: 0.86 } : null,
											]}
										>
											<BAIText variant='subtitle'>Apply Set</BAIText>
											<View style={styles.applySetRight}>
												<BAIText variant='subtitle'>{applySetCount}</BAIText>
												<MaterialCommunityIcons
													name='chevron-right'
													size={24}
													color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
												/>
											</View>
										</Pressable>
										<View style={styles.rulesRow}>
											<BAITextInput
												label='Minimum Selections'
												value={minSelected}
												onChangeText={(value) => setMinSelected(value.replace(/[^0-9]/g, ""))}
												keyboardType='number-pad'
												style={styles.ruleInput}
											/>
											<BAITextInput
												label='Maximum Selections'
												value={maxSelected}
												onChangeText={(value) => setMaxSelected(value.replace(/[^0-9]/g, ""))}
												keyboardType='number-pad'
												style={styles.ruleInput}
											/>
										</View>
										<BAIText variant='subtitle'>Modifier Options</BAIText>
										{options.map((row, idx) =>
											row.removed ? null : (
												<BAISurface
													key={row.key}
													variant='interactive'
													style={[
														styles.optionRow,
														{ borderColor: theme.colors.outlineVariant ?? theme.colors.outline },
													]}
												>
													<View style={styles.optionInlineRow}>
														<Pressable onPress={() => requestRemoveOption(row)} style={styles.removeBtn}>
															<View style={[styles.removeBtnFill, { backgroundColor: theme.colors.error }]}>
																<MaterialCommunityIcons name='minus' size={16} color={theme.colors.onError} />
															</View>
														</Pressable>
														<View style={styles.optionFields}>
															<BAITextInput
																label='Modifier'
																value={row.name}
																onChangeText={(value) =>
																	setOptions((prev) =>
																		prev.map((opt, optIdx) => (optIdx === idx ? { ...opt, name: value } : opt)),
																	)
																}
															/>
														</View>
														<View style={styles.priceWrap}>
															<BAITextInput
																label='Price'
																value={row.priceText}
																onChangeText={(value) =>
																	setOptions((prev) =>
																		prev.map((opt, optIdx) => (optIdx === idx ? { ...opt, priceText: value } : opt)),
																	)
																}
																placeholder='0.00'
																keyboardType='decimal-pad'
															/>
														</View>
													</View>
													<MaterialCommunityIcons
														name='drag-horizontal-variant'
														size={22}
														color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
													/>
												</BAISurface>
											),
										)}
										<BAIButton
											variant='outline'
											onPress={() =>
												setOptions((prev) => [
													...prev,
													{ key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false },
												])
											}
										>
											Add Option
										</BAIButton>
										{error ? (
											<BAIText variant='caption' style={{ color: theme.colors.error }}>
												{error}
											</BAIText>
										) : null}
									</ScrollView>
								</BAISurface>
							</View>
						</View>
					</TouchableWithoutFeedback>
				</KeyboardAvoidingView>
			</BAIScreen>
			<ConfirmActionModal
				visible={confirmExitOpen}
				title='Unsaved changes'
				message='Do you want to resume editing or discard this modifier set?'
				confirmLabel='Resume'
				cancelLabel='Discard'
				confirmIntent='primary'
				cancelIntent='error'
				onDismiss={onResumeEditing}
				onConfirm={onResumeEditing}
				onCancel={performExit}
			/>
			<ConfirmActionModal
				visible={!!pendingOptionToRemove?.id}
				title='Remove option?'
				message='Removing this saved option archives it from active use while preserving historical records.'
				confirmLabel='Remove'
				cancelLabel='Keep'
				confirmIntent='danger'
				onDismiss={dismissRemoveOptionConfirm}
				onCancel={dismissRemoveOptionConfirm}
				onConfirm={onConfirmRemovePersistedOption}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	keyboardAvoider: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 12 },
	contentWrap: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center" },
	card: { flex: 1, borderRadius: 18 },
	content: { gap: 10, paddingBottom: 10 },
	applySetRow: {
		minHeight: 48,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	applySetRight: { flexDirection: "row", alignItems: "center", gap: 6 },
	headerSavePill: {
		minWidth: 72,
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	rulesRow: { flexDirection: "row", gap: 10, paddingTop: 6, paddingBottom: 2 },
	ruleInput: { flex: 1 },
	optionRow: {
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: 10,
		paddingHorizontal: 10,
		gap: 6,
	},
	optionInlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	removeBtn: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	removeBtnFill: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	optionFields: { flex: 1 },
	priceWrap: { width: 120 },
});
