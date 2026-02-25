// BizAssist_mobile
// path: src/modules/discounts/screens/InventoryDiscountCreateScreen.tsx
//
// Header governance:
// - Create Discount is a PROCESS screen -> use EXIT.
// - Exit cancels and returns deterministically (returnTo or discounts ledger).

import React, { useCallback, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIInlineHeaderScaffold } from "@/components/ui/BAIInlineHeaderScaffold";
import { BAIMinorMoneyInput } from "@/components/ui/BAIMinorMoneyInput";
import { BAITextarea } from "@/components/ui/BAITextarea";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { BAIGroupTabs } from "@/components/ui/BAIGroupTabs";
import { BAISwitchRow } from "@/components/ui/BAISwitchRow";

import { useAppBusy } from "@/hooks/useAppBusy";
import { useNavLock } from "@/shared/hooks/useNavLock";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import {
	sanitizeEntityNameDraftInput,
	sanitizeEntityNameInput,
	sanitizeMoneyInput,
	sanitizeNoteDraftInput,
} from "@/shared/validation/sanitize";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import {
	buildInventoryDiscountDetailsRoute,
	normalizeDiscountReturnTo,
	resolveInventoryDiscountCreateExitRoute,
} from "@/modules/discounts/discounts.navigation";
import { useDiscountProcessExitGuard } from "@/modules/discounts/useDiscountProcessExitGuard";

import { DEFAULT_STACKABLE } from "@/modules/discounts/discounts.constants";
import type { CreateDiscountPayload, DiscountType } from "@/modules/discounts/discounts.types";
import { useCreateDiscount } from "@/modules/discounts/discounts.queries";
import { normalizeNote, validateName, validateValueByType } from "@/modules/discounts/discounts.validators";

function extractDiscountSaveErrorMessage(err: unknown): string {
	const data = (err as any)?.response?.data;
	const apiError = data?.error ?? {};
	const code =
		typeof apiError?.code === "string" ? apiError.code : typeof data?.code === "string" ? data.code : undefined;
	const limitRaw = data?.data?.limit ?? apiError?.limit;
	const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : 300;
	const message =
		typeof apiError?.message === "string"
			? apiError.message
			: typeof data?.message === "string"
				? data.message
				: undefined;

	if (code === "DISCOUNT_NAME_EXISTS") return "Discount name already exists.";
	if (code === "DISCOUNT_LIMIT_REACHED") return `You've reached the maximum of ${limit} discounts.`;
	return message ?? String((err as any)?.message ?? "Failed to create discount.");
}

export default function InventoryDiscountCreateScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { withBusy } = useAppBusy();
	const { safeReplace, canNavigate } = useNavLock();
	const { currencyCode } = useActiveBusinessMeta();

	const params = useLocalSearchParams<{ returnTo?: string }>();
	const returnTo = useMemo(() => normalizeDiscountReturnTo(params.returnTo), [params.returnTo]);

	const create = useCreateDiscount();

	const [name, setName] = useState("");
	const [noteText, setNoteText] = useState("");
	const [type, setType] = useState<DiscountType>("PERCENT");
	const [valueText, setValueText] = useState("");
	const [isStackable, setIsStackable] = useState(DEFAULT_STACKABLE);
	const [error, setError] = useState<string | null>(null);

	const isBusy = create.isPending;
	const isUiDisabled = isBusy || !canNavigate;

	const percentDisplay = useMemo(() => {
		if (type !== "PERCENT") return valueText;
		const v = valueText.trim();
		return v ? `${v}%` : "";
	}, [type, valueText]);

	const percentSelection = useMemo(() => {
		if (type !== "PERCENT") return undefined;
		const len = valueText.length;
		return { start: len, end: len };
	}, [type, valueText]);

	const nameCheck = useMemo(() => validateName(name), [name]);
	const valueCheck = useMemo(() => validateValueByType(type, valueText), [type, valueText]);
	const showNameError = name.trim().length > 0 && !nameCheck.ok;
	const showValueError = valueText.trim().length > 0 && !valueCheck.ok;

	const canSave = useMemo(() => {
		if (!nameCheck.ok) return false;
		if (!valueCheck.ok) return false;
		return !isUiDisabled;
	}, [isUiDisabled, nameCheck.ok, valueCheck.ok]);

	const onTypeChange = useCallback(
		(nextType: DiscountType) => {
			if (nextType === type) return;
			setType(nextType);
			// Reset value when switching formats to avoid invalid carryover.
			setValueText("");
		},
		[type],
	);

	const onExitBase = useCallback(() => {
		if (isUiDisabled) return;
		const route = resolveInventoryDiscountCreateExitRoute(returnTo);
		safeReplace(router as any, route as any);
	}, [isUiDisabled, returnTo, router, safeReplace]);
	const onExit = useDiscountProcessExitGuard(onExitBase);

	// NOTE governance:
	// - Draft typing: preserve spaces/newlines as user enters them (no whitespace normalization).
	// - Final normalization happens on blur + on save via normalizeNote.
	const onNoteChange = useCallback((t: string) => {
		setNoteText(sanitizeNoteDraftInput(t));
	}, []);

	const onNoteBlur = useCallback(() => {
		if (isUiDisabled) return;
		setNoteText((prev) => normalizeNote(prev));
	}, [isUiDisabled]);

	const onNameChange = useCallback((value: string) => {
		setName(sanitizeEntityNameDraftInput(value));
	}, []);

	const onNameBlur = useCallback(() => {
		if (isUiDisabled) return;
		setName((prev) => sanitizeEntityNameInput(prev));
	}, [isUiDisabled]);

	const onSave = useCallback(async () => {
		if (!canSave) return;

		setError(null);

		await withBusy("Creating discount...", async () => {
			const note = normalizeNote(noteText);
			const payload: CreateDiscountPayload = {
				name: nameCheck.ok ? nameCheck.value : name.trim(),
				note: note || undefined,
				type,
				value: valueCheck.ok ? valueCheck.value : "",
				isStackable,
			};

			try {
				const created = await create.mutateAsync(payload);
				if (returnTo) {
					const route = resolveInventoryDiscountCreateExitRoute(returnTo);
					safeReplace(router as any, route as any);
					return;
				}
				safeReplace(router as any, buildInventoryDiscountDetailsRoute(created.id, null) as any);
			} catch (e: any) {
				setError(extractDiscountSaveErrorMessage(e));
			}
		});
	}, [
		canSave,
		create,
		noteText,
		isStackable,
		name,
		nameCheck,
		returnTo,
		router,
		safeReplace,
		type,
		valueCheck,
		withBusy,
	]);

	const valuePlaceholder = type === "PERCENT" ? "0%" : undefined;
	const valueLimit = type === "PERCENT" ? FIELD_LIMITS.discountPercent : FIELD_LIMITS.discountAmount;
	const valueMaxLength = type === "PERCENT" ? valueLimit + 1 : valueLimit;

	return (
		<BAIInlineHeaderScaffold title='Create Discount' variant='exit' onLeftPress={onExit} disabled={isUiDisabled}>
			<BAIScreen padded={false} safeTop={false} style={styles.root}>
				<KeyboardAvoidingView
					style={styles.keyboardAvoider}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={0}
				>
					<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
						<View style={styles.keyboardContent}>
							<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
								<BAISurface style={styles.card} padded>
									<BAITextInput
										label='Discount name'
										value={name}
										onChangeText={onNameChange}
										onBlur={onNameBlur}
										maxLength={FIELD_LIMITS.discountName}
										placeholder='e.g. Senior discount'
										disabled={isUiDisabled}
									/>
									{showNameError ? (
										<BAIText variant='caption' style={{ color: theme.colors.error }}>
											{nameCheck.message}
										</BAIText>
									) : null}

									<BAITextarea
										label='Note'
										value={noteText}
										onChangeText={onNoteChange}
										onBlur={onNoteBlur}
										maxLength={FIELD_LIMITS.discountNote}
										placeholder='Note (optional)'
										visibleLines={2}
										minHeight={56}
										maxHeight={112}
										inputStyle={styles.noteInputPadding}
										scrollEnabled
										hideScrollIndicator
										disabled={isUiDisabled}
									/>

									<BAIText variant='caption' muted>
										Amount type
									</BAIText>

									<BAIGroupTabs
										tabs={[
											{ label: "Percent", value: "PERCENT" },
											{ label: "Amount", value: "FIXED" },
										]}
										value={type}
										onChange={onTypeChange}
										disabled={isUiDisabled}
									/>

									{type === "PERCENT" ? (
										<BAITextInput
											label='Percentage'
											value={percentDisplay}
											onChangeText={(v) => {
												const raw = v.replace(/%/g, "").trim();
												const cleaned = sanitizeMoneyInput(raw);
												const numeric = Number(cleaned);
												if (Number.isFinite(numeric) && numeric > 100) {
													setValueText("100");
													return;
												}
												setValueText(cleaned.length > valueLimit ? cleaned.slice(0, valueLimit) : cleaned);
											}}
											selection={valueText ? percentSelection : undefined}
											maxLength={valueMaxLength}
											keyboardType='decimal-pad'
											placeholder={valuePlaceholder}
											disabled={isUiDisabled}
										/>
									) : (
										<BAIMinorMoneyInput
											label='Amount'
											value={valueText}
											onChangeText={setValueText}
											currencyCode={currencyCode}
											maxMinorDigits={11}
											style={styles.moneyHalfInput}
											contentStyle={styles.moneyValueInputContent}
											disabled={isUiDisabled}
										/>
									)}

									{showValueError ? (
										<BAIText variant='caption' style={{ color: theme.colors.error }}>
											{valueCheck.message}
										</BAIText>
									) : null}

									<BAISwitchRow
										label='Stackable'
										description='Allow this discount to combine with others.'
										value={isStackable}
										onValueChange={setIsStackable}
										disabled={isUiDisabled}
										switchVariant='blue'
									/>

									{error ? (
										<BAIText variant='caption' style={{ color: theme.colors.error }}>
											{error}
										</BAIText>
									) : null}

									<View style={styles.actions}>
										<BAIButton
											variant='outline'
											intent='neutral'
											onPress={onExit}
											disabled={isUiDisabled}
											shape='pill'
											widthPreset='standard'
											style={styles.actionButton}
										>
											Cancel
										</BAIButton>
										<BAICTAButton
											mode='contained'
											onPress={onSave}
											disabled={!canSave}
											shape='pill'
											style={styles.actionButton}
										>
											Save
										</BAICTAButton>
									</View>
								</BAISurface>
							</View>
						</View>
					</TouchableWithoutFeedback>
				</KeyboardAvoidingView>
			</BAIScreen>
		</BAIInlineHeaderScaffold>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	keyboardAvoider: { flex: 1 },
	keyboardContent: { flex: 1 },
	screen: { flex: 1, padding: 12, paddingTop: 0 },
	card: { gap: 12 },
	moneyHalfInput: { width: "50%", alignSelf: "flex-start" },
	moneyValueInputContent: { paddingLeft: 16, paddingRight: 20 },
	noteInputPadding: { paddingTop: 16, paddingBottom: 16 },
	actions: { flexDirection: "row", gap: 10, flexWrap: "nowrap", marginTop: 20 },
	actionButton: { flex: 1 },
});
