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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { ConfirmActionModal } from "@/components/settings/ConfirmActionModal";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
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
	const draftId = useMemo(() => buildModifierGroupDraftId(mode, intent, normalizedGroupId), [intent, mode, normalizedGroupId]);
	const { withBusy } = useAppBusy();
	const queryClient = useQueryClient();

	const [name, setName] = useState("");
	const [selectionType, setSelectionType] = useState<ModifierSelectionType>("MULTI");
	const [isRequired, setIsRequired] = useState(false);
	const [minSelected, setMinSelected] = useState("0");
	const [maxSelected, setMaxSelected] = useState("1");
	const [options, setOptions] = useState<ModifierOptionDraft[]>([{ key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false }]);
	const [error, setError] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);
	const [hydratedFromServer, setHydratedFromServer] = useState(intent === "create");
	const [confirmExitOpen, setConfirmExitOpen] = useState(false);
	const [confirmOptionRemoveKey, setConfirmOptionRemoveKey] = useState<string | null>(null);
	const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
	const openOptionRowRef = useRef<Swipeable | null>(null);
	const optionRowRefs = useRef<Record<string, Swipeable | null>>({});

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
		setOptions(seed.options.length > 0 ? seed.options : [{ key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false }]);
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
			hydratedFromServer,
		});
	}, [draftId, hydratedFromServer, initialized, isRequired, maxSelected, minSelected, name, options, selectionType]);

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
		if (openOptionRowRef.current) openOptionRowRef.current.close();
		Keyboard.dismiss();
		if (hasUnsavedChanges) {
			setConfirmExitOpen(true);
			return;
		}
		performExit();
	}, [hasUnsavedChanges, performExit]);

	const guardedExit = useProcessExitGuard(onExit);

	const headerTitle = intent === "create" ? "New Modifier Set" : "Edit Modifier Set";
	const appHeader = useAppHeader("process", { title: headerTitle, onExit: guardedExit, exitFallbackRoute: backRoute });
	const inventoryHeader = useInventoryHeader("process", {
		title: headerTitle,
		onExit: guardedExit,
		exitFallbackRoute: backRoute,
	});
	const headerOptions = mode === "settings" ? appHeader : inventoryHeader;

	const dismissKeyboard = useCallback(() => {
		if (openOptionRowRef.current) openOptionRowRef.current.close();
		Keyboard.dismiss();
	}, []);

	const activeOptions = useMemo(() => options.filter((opt) => !opt.removed), [options]);

	const pendingOptionToRemove = useMemo(
		() => (confirmOptionRemoveKey ? options.find((opt) => opt.key === confirmOptionRemoveKey) ?? null : null),
		[confirmOptionRemoveKey, options],
	);

	const onOptionRowWillOpen = useCallback((rowKey: string) => {
		const nextRef = optionRowRefs.current[rowKey] ?? null;
		if (openOptionRowRef.current && openOptionRowRef.current !== nextRef) {
			openOptionRowRef.current.close();
		}
		openOptionRowRef.current = nextRef;
	}, []);

	const onOptionRowClose = useCallback((rowKey: string) => {
		const closingRef = optionRowRefs.current[rowKey] ?? null;
		if (openOptionRowRef.current === closingRef) {
			openOptionRowRef.current = null;
		}
	}, []);

	const removeDraftOptionLocally = useCallback((rowKey: string) => {
		setOptions((prev) => prev.filter((opt) => opt.key !== rowKey));
	}, []);

	const requestRemoveOption = useCallback(
		(row: ModifierOptionDraft) => {
			if (openOptionRowRef.current) openOptionRowRef.current.close();
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
				setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not remove modifier option.");
			}
		});
	}, [pendingOptionToRemove, queryClient, withBusy]);

	const renderRemoveAction = useCallback(
		(row: ModifierOptionDraft) => (
			<Pressable
				onPress={() => requestRemoveOption(row)}
				style={({ pressed }) => [
					styles.swipeRemoveAction,
					{ backgroundColor: theme.colors.error, opacity: pressed ? 0.9 : 1 },
				]}
			>
				<BAIText variant='subtitle' style={{ color: theme.colors.onError }}>
					Remove
				</BAIText>
			</Pressable>
		),
		[requestRemoveOption, theme.colors.error, theme.colors.onError],
	);

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
		if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || parsedMin < 0 || parsedMax < 0 || parsedMin > parsedMax) {
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
				clearModifierGroupDraft(draftId);
				router.replace(`${backRoute}/${encodeURIComponent(targetGroupId)}` as any);
			} catch (e: any) {
				setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not save modifier set.");
			}
		});
	}, [activeOptions, backRoute, draftId, groupId, intent, isRequired, maxSelected, minSelected, name, options, router, selectionType, withBusy]);

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false}>
				<KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
					<TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
						<View style={styles.screen}>
							<BAISurface bordered style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}> 
								<ScrollView
									contentContainerStyle={styles.content}
									keyboardShouldPersistTaps='handled'
									keyboardDismissMode='on-drag'
									onScrollBeginDrag={dismissKeyboard}
								>
								<BAITextInput label='Modifier Set Name' value={name} onChangeText={setName} placeholder='Modifier Set Name' />
								<BAIText variant='caption' muted>
									Selection rules apply during checkout. Configure the minimum and maximum selections for this set.
								</BAIText>
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
										<Swipeable
											key={row.key}
											ref={(ref) => {
												optionRowRefs.current[row.key] = ref;
											}}
											overshootRight={false}
											rightThreshold={28}
											onSwipeableWillOpen={() => onOptionRowWillOpen(row.key)}
											onSwipeableClose={() => onOptionRowClose(row.key)}
											renderRightActions={() => renderRemoveAction(row)}
										>
											<BAISurface variant='interactive' style={styles.optionRow}>
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
																setOptions((prev) => prev.map((opt, optIdx) => (optIdx === idx ? { ...opt, name: value } : opt)))
															}
														/>
													</View>
													<View style={styles.priceWrap}>
														<BAITextInput
															label='Price'
															value={row.priceText}
															onChangeText={(value) =>
																setOptions((prev) => prev.map((opt, optIdx) => (optIdx === idx ? { ...opt, priceText: value } : opt)))
															}
															placeholder='0.00'
															keyboardType='decimal-pad'
														/>
													</View>
												</View>
												<MaterialCommunityIcons
													name='drag-horizontal-variant'
													size={24}
													color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
												/>
											</BAISurface>
										</Swipeable>
									),
								)}
								<BAIButton
									variant='outline'
									onPress={() => setOptions((prev) => [...prev, { key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false }])}
								>
									Add Option
								</BAIButton>
								{error ? (
									<BAIText variant='caption' style={{ color: theme.colors.error }}>
										{error}
									</BAIText>
								) : null}
								<View style={styles.footer}>
									<BAIButton variant='outline' onPress={guardedExit} style={styles.footerBtn}>
										Cancel
									</BAIButton>
									<BAIButton onPress={onSave} style={styles.footerBtn}>
										Save
									</BAIButton>
								</View>
								</ScrollView>
							</BAISurface>
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
	keyboardAvoider: { flex: 1 },
	screen: { flex: 1, padding: 12 },
	card: { flex: 1, borderRadius: 18 },
	content: { padding: 12, gap: 10 },
	rulesRow: { flexDirection: "row", gap: 10, paddingTop: 6, paddingBottom: 2 },
	ruleInput: { flex: 1 },
	optionRow: { borderRadius: 0, paddingVertical: 8, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
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
	swipeRemoveAction: {
		width: 92,
		justifyContent: "center",
		alignItems: "center",
	},
	footer: { flexDirection: "row", gap: 10, marginTop: 8 },
	footerBtn: { flex: 1 },
});
