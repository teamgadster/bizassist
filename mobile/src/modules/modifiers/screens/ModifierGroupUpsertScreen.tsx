import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Easing,
	Keyboard,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { runGovernedProcessExit } from "@/modules/inventory/navigation.governance";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import {
	buildModifierGroupDraftId,
	clearModifierGroupDraft,
	createModifierGroupDraft,
	getModifierGroupDraft,
	subscribeModifierGroupDraft,
	type ModifierOptionDraft,
	upsertModifierGroupDraft,
} from "@/modules/modifiers/drafts/modifierGroupDraft";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import type { ModifierSelectionType } from "@/modules/modifiers/modifiers.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { MONEY_INPUT_PRECISION } from "@/shared/money/money.constants";
import {
	digitsToMinorUnits,
	parseMinorUnits,
	sanitizeDigits,
} from "@/shared/money/money.minor";

type Props = { mode: "settings" | "inventory"; intent: "create" | "edit" };
const DELETE_ACTION_WIDTH = 88;
const DELETE_ACTION_GAP = 2;
const DELETE_REVEAL_INSET = DELETE_ACTION_WIDTH + DELETE_ACTION_GAP;
const PRICE_INPUT_MAX_MINOR_DIGITS = 11;
const PRICE_INPUT_MAX_WHOLE_DIGITS = PRICE_INPUT_MAX_MINOR_DIGITS - MONEY_INPUT_PRECISION;
const PRICE_INPUT_DECIMAL_DIGITS = MONEY_INPUT_PRECISION;
const PRICE_INPUT_SEPARATOR_DIGITS = 1;
const PRICE_INPUT_GROUPING_SEPARATORS = Math.floor((PRICE_INPUT_MAX_WHOLE_DIGITS - 1) / 3);
const PRICE_INPUT_ESTIMATED_CHAR_WIDTH = 10;
const PRICE_INPUT_BASE_PADDING = 20;
const PRICE_INPUT_CHARACTER_COUNT =
	PRICE_INPUT_MAX_WHOLE_DIGITS +
	PRICE_INPUT_GROUPING_SEPARATORS +
	PRICE_INPUT_SEPARATOR_DIGITS +
	PRICE_INPUT_DECIMAL_DIGITS;
const PRICE_INPUT_WIDTH = PRICE_INPUT_BASE_PADDING + PRICE_INPUT_CHARACTER_COUNT * PRICE_INPUT_ESTIMATED_CHAR_WIDTH;

function toSafeMinor(value: unknown): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	return Math.max(0, Math.trunc(parsed));
}

function resolveNextMinorFromInput(currentMinor: number, nextText: string): number {
	const safeCurrentMinor = toSafeMinor(currentMinor);
	const sanitized = sanitizeDigits(nextText);
	const currentDigits = sanitizeDigits(String(safeCurrentMinor));
	const capReached = currentDigits.length >= PRICE_INPUT_MAX_MINOR_DIGITS;
	const isGrowthAttempt = sanitized.length > currentDigits.length;

	// Backspace-safe cap guard: allow deletes/edits while silently blocking overflow growth.
	if (capReached && isGrowthAttempt) {
		return safeCurrentMinor;
	}

	const isSingleAppend = sanitized.length === currentDigits.length + 1 && sanitized.startsWith(currentDigits);

	// Silent growth lock: append-mode for single-key growth, full reparse for bulk edits/paste.
	return isSingleAppend
		? digitsToMinorUnits(currentDigits + sanitized[sanitized.length - 1], PRICE_INPUT_MAX_MINOR_DIGITS)
		: digitsToMinorUnits(sanitized, PRICE_INPUT_MAX_MINOR_DIGITS);
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
				deltaMinor: Math.max(0, Math.trunc(option.deltaMinor || 0)),
				isSoldOut: option.isSoldOut,
			})),
	});
}

type ModifierOptionRowProps = {
	row: ModifierOptionDraft;
	rowIndex: number;
	borderBottomColor: string;
	errorColor: string;
	onErrorColor: string;
	isDeleteRevealed: boolean;
	deleteIconRotate: Animated.AnimatedInterpolation<string | number>;
	deleteActionTranslateX: Animated.Value;
	deleteActionOpacity: Animated.Value;
	optionMainInsetRight: Animated.Value;
	maxPriceInputLength: number;
	formatPriceDisplay: (minorUnits: number) => string;
	onToggleDeleteReveal: (rowKey: string) => void;
	onDeleteOption: (row: ModifierOptionDraft) => void;
	onChangeOptionName: (rowIndex: number, value: string) => void;
	onChangePriceMinor: (rowIndex: number, nextMinor: number) => void;
};

const ModifierOptionRow = memo(function ModifierOptionRow({
	row,
	rowIndex,
	borderBottomColor,
	errorColor,
	onErrorColor,
	isDeleteRevealed,
	deleteIconRotate,
	deleteActionTranslateX,
	deleteActionOpacity,
	optionMainInsetRight,
	maxPriceInputLength,
	formatPriceDisplay,
	onToggleDeleteReveal,
	onDeleteOption,
	onChangeOptionName,
	onChangePriceMinor,
}: ModifierOptionRowProps) {
	const rowMinor = toSafeMinor(row.deltaMinor);
	const [isPriceFocused, setIsPriceFocused] = useState(false);
	const [editingMinor, setEditingMinor] = useState(rowMinor);
	const syncRafIdRef = useRef<number | null>(null);
	const latestEditingMinorRef = useRef(editingMinor);

	useEffect(() => {
		latestEditingMinorRef.current = editingMinor;
	}, [editingMinor]);

	useEffect(() => {
		if (!isPriceFocused) setEditingMinor(rowMinor);
	}, [isPriceFocused, rowMinor]);

	useEffect(() => {
		return () => {
			if (syncRafIdRef.current != null) {
				cancelAnimationFrame(syncRafIdRef.current);
				syncRafIdRef.current = null;
			}
		};
	}, []);

	const displayedMinor = isPriceFocused ? editingMinor : rowMinor;
	const inputValue = displayedMinor > 0 ? formatPriceDisplay(displayedMinor) : "";

	const onPriceFocus = useCallback(() => {
		if (syncRafIdRef.current != null) {
			cancelAnimationFrame(syncRafIdRef.current);
			syncRafIdRef.current = null;
		}
		setEditingMinor(rowMinor);
		setIsPriceFocused(true);
	}, [rowMinor]);

	const onPriceBlur = useCallback(() => {
		if (syncRafIdRef.current != null) {
			cancelAnimationFrame(syncRafIdRef.current);
			syncRafIdRef.current = null;
		}
		onChangePriceMinor(rowIndex, latestEditingMinorRef.current);
		setIsPriceFocused(false);
	}, [onChangePriceMinor, rowIndex]);

	const onPriceChange = useCallback(
		(value: string) => {
			const baseMinor = isPriceFocused ? editingMinor : rowMinor;
			const nextMinor = resolveNextMinorFromInput(baseMinor, value);
			if (nextMinor === baseMinor) return;
			setEditingMinor(nextMinor);
			if (syncRafIdRef.current != null) {
				cancelAnimationFrame(syncRafIdRef.current);
				syncRafIdRef.current = null;
			}
			syncRafIdRef.current = requestAnimationFrame(() => {
				syncRafIdRef.current = null;
				onChangePriceMinor(rowIndex, nextMinor);
			});
		},
		[editingMinor, isPriceFocused, onChangePriceMinor, rowIndex, rowMinor],
	);

	return (
		<View style={[styles.optionRow, { borderBottomColor }]}>
			<View style={styles.optionInlineRow}>
				<Animated.View
					style={[styles.optionMainContent, isDeleteRevealed ? { marginRight: optionMainInsetRight } : null]}
				>
					<Pressable onPress={() => onToggleDeleteReveal(row.key)} style={styles.removeBtn}>
						<View style={[styles.removeBtnFill, { backgroundColor: errorColor }]}>
							{isDeleteRevealed ? (
								<Animated.View style={{ transform: [{ rotate: deleteIconRotate }] }}>
									<MaterialCommunityIcons name='minus' size={16} color={onErrorColor} />
								</Animated.View>
							) : (
								<MaterialCommunityIcons name='minus' size={16} color={onErrorColor} />
							)}
						</View>
					</Pressable>
					<View style={styles.optionFields}>
						<BAITextInput
							label={undefined}
							placeholder='Modifier'
							value={row.name}
							maxLength={FIELD_LIMITS.productName}
							multiline={false}
							numberOfLines={1}
							height={56}
							style={styles.modifierInput}
							contentStyle={styles.optionInputContent}
							onChangeText={(value) => onChangeOptionName(rowIndex, value)}
						/>
					</View>
					<View style={styles.priceWrap}>
						<BAITextInput
							label={undefined}
							placeholder='₱0.00'
							value={inputValue}
							keyboardType='number-pad'
							multiline={false}
							numberOfLines={1}
							height={56}
							style={styles.modifierInput}
							contentStyle={styles.priceInputContent}
							maxLength={maxPriceInputLength}
							onChangeText={onPriceChange}
							onFocus={onPriceFocus}
							onBlur={onPriceBlur}
						/>
					</View>
				</Animated.View>
				{isDeleteRevealed ? (
					<Animated.View
						style={[
							styles.deleteActionWrap,
							{
								transform: [{ translateX: deleteActionTranslateX }],
								opacity: deleteActionOpacity,
							},
						]}
					>
						<Pressable
							onPress={() => onDeleteOption(row)}
							style={[styles.deleteActionBtn, { backgroundColor: errorColor }]}
						>
							<BAIText variant='subtitle' style={{ color: onErrorColor }}>
								Delete
							</BAIText>
						</Pressable>
					</Animated.View>
				) : null}
			</View>
		</View>
	);
});

export function ModifierGroupUpsertScreen({ mode, intent }: Props) {
	const router = useRouter();
	const tabBarHeight = useBottomTabBarHeight();
	const theme = useTheme();
	const { currencyCode } = useActiveBusinessMeta();
	const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
	const groupId = String(params.id ?? "").trim();
	const exitReturnTo = String(params.returnTo ?? "").trim();
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
	const [showSelectionRules, setShowSelectionRules] = useState(false);
	const [options, setOptions] = useState<ModifierOptionDraft[]>([
		{ key: makeOptionKey(), name: "", deltaMinor: 0, isSoldOut: false },
	]);
	const [appliedProductIds, setAppliedProductIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);
	const [hydratedFromServer, setHydratedFromServer] = useState(intent === "create");
	const [confirmExitOpen, setConfirmExitOpen] = useState(false);
	const [deleteRevealKey, setDeleteRevealKey] = useState<string | null>(null);
	const [modifiersListHeight, setModifiersListHeight] = useState(0);
	const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
	const deleteActionTranslateX = useRef(new Animated.Value(DELETE_ACTION_WIDTH)).current;
	const deleteActionOpacity = useRef(new Animated.Value(0)).current;
	const deleteIconRotation = useRef(new Animated.Value(0)).current;
	const optionMainInsetRight = useRef(new Animated.Value(0)).current;

	const backRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";
	const outline = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor: outline,
			backgroundColor: theme.colors.surface,
		}),
		[outline, theme.colors.surface],
	);

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
			seed.options.length > 0 ? seed.options : [{ key: makeOptionKey(), name: "", deltaMinor: 0, isSoldOut: false }],
		);
		setShowSelectionRules(seed.minSelected !== "0" || seed.maxSelected !== "1");
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
		if (!initialized) return;
		return subscribeModifierGroupDraft(draftId, (latestDraft) => {
			if (!latestDraft) return;
			setAppliedProductIds(Array.isArray(latestDraft.appliedProductIds) ? latestDraft.appliedProductIds : []);
		});
	}, [draftId, initialized]);

	useEffect(() => {
		if (!initialized || intent !== "edit" || !groupId || hydratedFromServer) return;
		withBusy("Loading modifier set...", async () => {
			try {
				const group = await modifiersApi.getGroup(groupId);
				const hydratedOptions = group.options.map((option) => ({
					key: makeOptionKey(),
					id: option.id,
					name: option.name,
					deltaMinor: parseMinorUnits(option.priceDeltaMinor),
					isSoldOut: option.isSoldOut,
					removed: option.isArchived,
				}));
				setName(group.name);
				setSelectionType(group.selectionType);
				setIsRequired(group.isRequired);
				setMinSelected(String(group.minSelected));
				setMaxSelected(String(group.maxSelected));
				setShowSelectionRules(String(group.minSelected) !== "0" || String(group.maxSelected) !== "1");
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
		runGovernedProcessExit(exitReturnTo || undefined, resolveExitRoute(), { router: router as any });
	}, [draftId, exitReturnTo, resolveExitRoute, router]);

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
				options: [{ key: "base", name: "", deltaMinor: 0, isSoldOut: false }],
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

	const applySetCount = appliedProductIds.length;
	const rulesSummary = `Min ${minSelected || "0"} · Max ${maxSelected || "1"}`;
	const applySetRoute =
		mode === "settings" ? "/(app)/(tabs)/settings/modifiers/apply-set" : "/(app)/(tabs)/inventory/modifiers/apply-set";

	const onPressApplySet = useCallback(() => {
		router.push({
			pathname: applySetRoute as any,
			params: { draftId } as any,
		});
	}, [applySetRoute, draftId, router]);

	const onToggleSelectionRules = useCallback(() => {
		setShowSelectionRules((prev) => !prev);
	}, []);

	const formatPriceDisplay = useMemo(() => {
		const code =
			String(currencyCode ?? "PHP")
				.trim()
				.toUpperCase() || "PHP";
		let formatter: Intl.NumberFormat | null = null;

		try {
			if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
				formatter = new Intl.NumberFormat(undefined, {
					style: "currency",
					currency: code,
					currencyDisplay: "symbol",
					minimumFractionDigits: MONEY_INPUT_PRECISION,
					maximumFractionDigits: MONEY_INPUT_PRECISION,
				});
			}
		} catch {
			formatter = null;
		}

		return (minorUnits: number) => {
			const safeMinor = toSafeMinor(minorUnits);
			const major = safeMinor / 10 ** MONEY_INPUT_PRECISION;
			if (formatter) return formatter.format(major);
			return `${code} ${major.toFixed(MONEY_INPUT_PRECISION)}`;
		};
	}, [currencyCode]);
	const maxPriceInputLength = useMemo(
		() =>
			formatPriceDisplay(
				digitsToMinorUnits("9".repeat(PRICE_INPUT_MAX_MINOR_DIGITS), PRICE_INPUT_MAX_MINOR_DIGITS),
			).length,
		[formatPriceDisplay],
	);

	const activeOptions = useMemo(() => options.filter((opt) => !opt.removed), [options]);
	const filledOptions = useMemo(() => activeOptions.filter((row) => row.name.trim().length > 0), [activeOptions]);
	const isSaveDisabled = useMemo(() => {
		const trimmedName = name.trim();
		if (!trimmedName) return true;
		if (filledOptions.length === 0) return true;

		const parsedMin = Number.parseInt(minSelected || "0", 10);
		const parsedMax = Number.parseInt(maxSelected || "0", 10);
		if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) return true;
		if (parsedMin < 0 || parsedMax < 0) return true;
		if (parsedMin > parsedMax) return true;

		return false;
	}, [filledOptions.length, maxSelected, minSelected, name]);

	const onAddModifier = useCallback(() => {
		const hasIncompleteRows = activeOptions.some((row) => !row.name.trim());
		if (hasIncompleteRows) {
			setError("Complete existing modifier rows before adding another.");
			return;
		}
		setError(null);
		setOptions((prev) => [...prev, { key: makeOptionKey(), name: "", deltaMinor: 0, isSoldOut: false }]);
	}, [activeOptions]);

	const onChangeOptionName = useCallback((rowIndex: number, value: string) => {
		setOptions((prev) => {
			const row = prev[rowIndex];
			if (!row || row.name === value) return prev;
			const next = [...prev];
			next[rowIndex] = { ...row, name: value };
			return next;
		});
	}, []);

	const removeDraftOptionLocally = useCallback((rowKey: string) => {
		setOptions((prev) => prev.filter((opt) => opt.key !== rowKey));
	}, []);

	const runDeleteActionAnimation = useCallback(
		(open: boolean, onDone?: () => void) => {
			Animated.parallel([
				Animated.timing(optionMainInsetRight, {
					toValue: open ? DELETE_REVEAL_INSET : 0,
					duration: 300,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: false,
				}),
				Animated.timing(deleteActionTranslateX, {
					toValue: open ? 0 : DELETE_ACTION_WIDTH,
					duration: 300,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(deleteActionOpacity, {
					toValue: open ? 1 : 0,
					duration: 300,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(deleteIconRotation, {
					toValue: open ? 1 : 0,
					duration: 300,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
			]).start(({ finished }) => {
				if (finished) onDone?.();
			});
		},
		[deleteActionOpacity, deleteActionTranslateX, deleteIconRotation, optionMainInsetRight],
	);

	const closeDeleteReveal = useCallback(() => {
		if (!deleteRevealKey) return;
		runDeleteActionAnimation(false, () => {
			deleteActionTranslateX.setValue(DELETE_ACTION_WIDTH);
			deleteActionOpacity.setValue(0);
			deleteIconRotation.setValue(0);
			optionMainInsetRight.setValue(0);
			setDeleteRevealKey(null);
		});
	}, [
		deleteActionOpacity,
		deleteActionTranslateX,
		deleteIconRotation,
		deleteRevealKey,
		optionMainInsetRight,
		runDeleteActionAnimation,
	]);

	const dismissKeyboard = useCallback(() => {
		Keyboard.dismiss();
		closeDeleteReveal();
	}, [closeDeleteReveal]);

	const onChangePriceMinor = useCallback((rowIndex: number, nextMinor: number) => {
		setOptions((prev) => {
			const row = prev[rowIndex];
			if (!row) return prev;

			const currentMinor = toSafeMinor(row.deltaMinor);
			if (nextMinor === currentMinor) {
				return prev;
			}

			const next = [...prev];
			next[rowIndex] = { ...row, deltaMinor: nextMinor };
			return next;
		});
	}, []);

	const onToggleDeleteReveal = useCallback(
		(rowKey: string) => {
			if (deleteRevealKey === rowKey) {
				runDeleteActionAnimation(false, () => setDeleteRevealKey(null));
				return;
			}

			deleteActionTranslateX.setValue(DELETE_ACTION_WIDTH);
			deleteActionOpacity.setValue(0);
			deleteIconRotation.setValue(0);
			optionMainInsetRight.setValue(0);

			if (deleteRevealKey) {
				runDeleteActionAnimation(false, () => {
					deleteActionTranslateX.setValue(DELETE_ACTION_WIDTH);
					deleteActionOpacity.setValue(0);
					deleteIconRotation.setValue(0);
					optionMainInsetRight.setValue(0);
					setDeleteRevealKey(rowKey);
					requestAnimationFrame(() => runDeleteActionAnimation(true));
				});
				return;
			}

			setDeleteRevealKey(rowKey);
			requestAnimationFrame(() => runDeleteActionAnimation(true));
		},
		[
			deleteActionOpacity,
			deleteActionTranslateX,
			deleteIconRotation,
			deleteRevealKey,
			optionMainInsetRight,
			runDeleteActionAnimation,
		],
	);

	const onDeleteOption = useCallback(
		(row: ModifierOptionDraft) => {
			setError(null);
			deleteActionTranslateX.setValue(DELETE_ACTION_WIDTH);
			deleteActionOpacity.setValue(0);
			deleteIconRotation.setValue(0);
			optionMainInsetRight.setValue(0);
			setDeleteRevealKey(null);

			if (!row.id) {
				removeDraftOptionLocally(row.key);
				return;
			}

			withBusy("Removing option...", async () => {
				try {
					await modifiersApi.archiveOption(row.id!);
					setOptions((prev) => prev.filter((opt) => opt.key !== row.key));
					await queryClient.invalidateQueries({ queryKey: ["modifiers"] });
				} catch (e: any) {
					setError(
						e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not remove modifier option.",
					);
				}
			});
		},
		[
			deleteActionOpacity,
			deleteActionTranslateX,
			deleteIconRotation,
			optionMainInsetRight,
			queryClient,
			removeDraftOptionLocally,
			withBusy,
		],
	);

	const deleteIconRotate = useMemo(
		() =>
			deleteIconRotation.interpolate({
				inputRange: [0, 1],
				outputRange: ["0deg", "90deg"],
			}),
		[deleteIconRotation],
	);

	const onSave = useCallback(() => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Modifier set name is required.");
			return;
		}
		if (filledOptions.length === 0) {
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
				let sortOrder = 0;
				for (let idx = 0; idx < options.length; idx += 1) {
					const row = options[idx];
					if (row.removed) {
						if (row.id) await modifiersApi.archiveOption(row.id);
						continue;
					}
					if (!row.name.trim()) {
						continue;
					}
					const priceDeltaMinor = String(Math.max(0, Math.trunc(row.deltaMinor || 0)));
					if (row.id) {
						await modifiersApi.updateOption(row.id, {
							name: row.name.trim(),
							priceDeltaMinor,
							isSoldOut: row.isSoldOut,
							sortOrder,
						});
					} else {
						await modifiersApi.createOption(targetGroupId, {
							name: row.name.trim(),
							priceDeltaMinor,
							sortOrder,
						});
					}
					sortOrder += 1;
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
				const successRoute = targetGroupId ? `${backRoute}/${encodeURIComponent(targetGroupId)}` : backRoute;
				router.replace(successRoute as any);
			} catch (e: any) {
				setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not save modifier set.");
			}
		});
	}, [
		appliedProductIds,
		backRoute,
		draftId,
		filledOptions,
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
					rightDisabled={isSaveDisabled}
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
				<TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
					<View style={[styles.wrap, { paddingBottom: tabBarHeight + 8 }]}>
						<View style={styles.contentWrap}>
							<BAISurface bordered padded={false} style={[styles.card, surfaceInteractive]}>
								<View style={styles.content}>
									<BAITextInput
										label='Modifier Set Name'
										value={name}
										onChangeText={setName}
										maxLength={FIELD_LIMITS.productName}
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
									<View
										style={[
											styles.advancedRulesContainer,
											{ borderColor: theme.colors.outlineVariant ?? theme.colors.outline },
										]}
									>
										<Pressable
											onPress={onToggleSelectionRules}
											style={({ pressed }) => [styles.advancedRulesRow, pressed ? { opacity: 0.86 } : null]}
										>
											<View style={styles.advancedRulesLabelWrap}>
												<BAIText variant='body'>Advanced rules</BAIText>
												<BAIText variant='caption' muted>
													{rulesSummary}
												</BAIText>
											</View>
											<MaterialCommunityIcons
												name={showSelectionRules ? "chevron-up" : "chevron-down"}
												size={24}
												color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
											/>
										</Pressable>
										{showSelectionRules ? (
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
										) : null}
									</View>
									<View style={styles.modifiersSection}>
										<BAIText variant='subtitle'>Modifiers</BAIText>
										<ScrollView
											style={styles.modifiersList}
											contentContainerStyle={[
												styles.modifiersListContent,
												{ paddingBottom: Math.max(0, modifiersListHeight * 0.5) },
											]}
											onLayout={(event) => setModifiersListHeight(event.nativeEvent.layout.height)}
											nestedScrollEnabled
											showsVerticalScrollIndicator={false}
											keyboardShouldPersistTaps='handled'
											keyboardDismissMode='on-drag'
										>
											{options.map((row, idx) =>
												row.removed ? null : (
													<ModifierOptionRow
														key={row.key}
														row={row}
														rowIndex={idx}
														borderBottomColor={theme.colors.outlineVariant ?? theme.colors.outline}
														errorColor={theme.colors.error}
														onErrorColor={theme.colors.onError}
														isDeleteRevealed={deleteRevealKey === row.key}
														deleteIconRotate={deleteIconRotate}
														deleteActionTranslateX={deleteActionTranslateX}
														deleteActionOpacity={deleteActionOpacity}
														optionMainInsetRight={optionMainInsetRight}
														maxPriceInputLength={maxPriceInputLength}
														formatPriceDisplay={formatPriceDisplay}
														onToggleDeleteReveal={onToggleDeleteReveal}
														onDeleteOption={onDeleteOption}
														onChangeOptionName={onChangeOptionName}
														onChangePriceMinor={onChangePriceMinor}
													/>
												),
											)}
											<BAIButton variant='outline' style={styles.addOptionButton} onPress={onAddModifier}>
												Add Modifier
											</BAIButton>
										</ScrollView>
									</View>
									{error ? (
										<BAIText variant='caption' style={{ color: theme.colors.error }}>
											{error}
										</BAIText>
									) : null}
								</View>
							</BAISurface>
						</View>
					</View>
				</TouchableWithoutFeedback>
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
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 0 },
	contentWrap: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center" },
	card: { flex: 1, borderRadius: 18, paddingTop: 12, paddingHorizontal: 12 },
	content: { flex: 1, gap: 10, paddingBottom: 10 },
	applySetRow: {
		minHeight: 50,
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
		minWidth: 76,
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	rulesRow: { flexDirection: "row", gap: 10, paddingTop: 6, paddingBottom: 2 },
	ruleInput: { flex: 1 },
	advancedRulesContainer: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingTop: 4,
		paddingBottom: 8,
	},
	advancedRulesRow: {
		minHeight: 46,
		paddingHorizontal: 0,
		paddingVertical: 2,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	advancedRulesLabelWrap: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	optionRow: {
		borderBottomWidth: 0,
		paddingVertical: 8,
	},
	modifiersSection: {
		flex: 1,
		minHeight: 0,
		gap: 10,
	},
	modifiersList: {
		flex: 1,
		minHeight: 0,
	},
	modifiersListContent: {
		gap: 6,
	},
	addOptionButton: {
		marginTop: 10,
	},
	optionInlineRow: {
		flexDirection: "row",
		alignItems: "center",
		overflow: "hidden",
		gap: 0,
		position: "relative",
	},
	optionMainContent: {
		flex: 1,
		minWidth: 0,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	removeBtn: {
		width: 30,
		height: 30,
		marginLeft: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	removeBtnFill: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	optionFields: { flex: 1, minWidth: 0 },
	modifierInput: { minWidth: 0 },
	optionInputContent: {
		textAlign: "center",
		textAlignVertical: "center",
		paddingTop: 0,
		paddingBottom: 0,
		paddingHorizontal: 6,
	},
	priceInputContent: {
		textAlign: "right",
		textAlignVertical: "center",
		paddingTop: 0,
		paddingBottom: 0,
		paddingHorizontal: 8,
		fontVariant: ["tabular-nums"],
		includeFontPadding: false,
	},
	priceWrap: { width: PRICE_INPUT_WIDTH },
	deleteActionBtn: {
		width: DELETE_ACTION_WIDTH,
		height: 56,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	deleteActionWrap: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		paddingLeft: DELETE_ACTION_GAP,
		justifyContent: "center",
	},
});
