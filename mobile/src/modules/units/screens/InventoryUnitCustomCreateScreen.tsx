// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/units/custom-create.tsx
//
// Custom Unit Create (governance-aligned)
// - Creates custom units under the selected category
// - Returns selection to returnTo using unitPicker.contract
// - Abbreviation is capped to 5 characters (FIELD_LIMITS.unitAbbreviation)

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { mapInventoryRouteToScope, resolveInventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { BAIRadioRow } from "@/components/ui/BAIRadioRow";

import { useAppBusy } from "@/providers/AppBusyProvider";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { unitAbbreviationRegex } from "@/shared/validation/patterns";
import {
	sanitizeEntityNameDraftInput,
	sanitizeEntityNameInput,
	sanitizeUnitAbbreviationInput,
} from "@/shared/validation/sanitize";

import { unitsApi } from "@/modules/units/units.api";
import { syncUnitListCaches } from "@/modules/units/units.cache";
import type { PrecisionScale, UnitCategory } from "@/modules/units/units.types";
import {
	buildUnitSelectionParams,
	parseUnitSelectionParams,
	DRAFT_ID_KEY,
	INITIAL_NAME_KEY,
	RETURN_TO_KEY,
	UNIT_CONTEXT_PRODUCT_TYPE_KEY,
	UNIT_CREATE_CATEGORY_KEY,
	UNIT_SERVICE_GROUP_KEY,
	UNIT_SELECT_ROUTE,
} from "@/modules/units/unitPicker.contract";
import { clearUnitSelectionParams, replaceToReturnTo, resolveReturnTo } from "@/modules/units/units.navigation";
import { useUnitFlowBackGuard } from "@/modules/units/useUnitFlowBackGuard";

const CUSTOM_DEFAULT_PRECISION: PrecisionScale = 0;
const NAME_MIN_LENGTH = FIELD_LIMITS.unitNameMin;
const ABBR_MIN_LENGTH = FIELD_LIMITS.unitAbbreviationMin;
const CUSTOM_UNIT_LIMIT_FALLBACK = 100;

const PRECISION_OPTIONS: PrecisionScale[] = [0, 1, 2, 3, 4, 5];

function normalize(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

function precisionSuffix(scale: PrecisionScale): string {
	if (scale <= 0) return "(1)";
	return `(.${"0".repeat(Math.min(5, Math.max(1, scale)))})`;
}

function suggestAbbreviationFromName(name: string, maxLength: number): string {
	const trimmed = name.trim();
	if (!trimmed) return "";

	const words = trimmed
		.split(/\s+/)
		.map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
		.filter(Boolean);

	if (!words.length) return "";

	if (words.length >= 2) {
		return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.slice(0, maxLength);
	}

	return words[0].slice(0, maxLength);
}

function extractApiError(err: unknown): { code?: string; message?: string; limit?: number } {
	const data = (err as any)?.response?.data;
	const error = data?.error ?? {};
	const code = typeof error?.code === "string" ? error.code : typeof data?.code === "string" ? data.code : undefined;
	const message =
		typeof error?.message === "string" ? error.message : typeof data?.message === "string" ? data.message : undefined;
	const limitRaw = data?.data?.limit ?? error?.limit;
	const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : undefined;

	return { code, message, limit };
}

function validateUnitName(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return "Unit name is required.";
	if (trimmed.length < NAME_MIN_LENGTH) return `Unit name must be at least ${FIELD_LIMITS.unitNameMin} characters.`;
	if (trimmed.length > FIELD_LIMITS.unitName) return `Unit name must be ${FIELD_LIMITS.unitName} characters or less.`;
	return null;
}

function validateAbbreviation(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return "Abbreviation is required.";
	if (trimmed.length < ABBR_MIN_LENGTH)
		return `Abbreviation must be at least ${FIELD_LIMITS.unitAbbreviationMin} character.`;
	if (trimmed.length > FIELD_LIMITS.unitAbbreviation)
		return `Abbreviation must be ${FIELD_LIMITS.unitAbbreviation} characters or less.`;
	if (!unitAbbreviationRegex.test(trimmed)) return "Abbreviation contains invalid characters.";
	return null;
}

export default function UnitCustomCreateScreen() {
	const router = useRouter();
	const navigation = useNavigation();
	const theme = useTheme();
	const { withBusy, busy } = useAppBusy();
	const queryClient = useQueryClient();

	const params = useLocalSearchParams();
	const inbound = useMemo(() => parseUnitSelectionParams(params as any), [params]);

	const returnTo = resolveReturnTo(params as Record<string, unknown>);
	const routeScope = useMemo(() => resolveInventoryRouteScope(returnTo), [returnTo]);
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);

	const draftId = inbound.draftId || normalize((params as any)[DRAFT_ID_KEY]);

	const productType = normalize((params as any)[UNIT_CONTEXT_PRODUCT_TYPE_KEY]) === "SERVICE" ? "SERVICE" : "PHYSICAL";

	const initialName = String((inbound as any).initialName || normalize((params as any)[INITIAL_NAME_KEY]) || "");

	const initialAbbreviation = String((inbound as any).initialAbbreviation || "");
	const serviceGroup = inbound.serviceUnitGroup;
	const category: UnitCategory = "CUSTOM";

	const [name, setName] = useState<string>(initialName);
	const [abbreviation, setAbbreviation] = useState<string>(initialAbbreviation);
	const [precisionScale, setPrecisionScale] = useState<PrecisionScale>(CUSTOM_DEFAULT_PRECISION);

	const [nameTouched, setNameTouched] = useState(false);
	const [abbreviationTouched, setAbbreviationTouched] = useState(false);
	const [abbreviationEditedManually, setAbbreviationEditedManually] = useState(
		() => initialAbbreviation.trim().length > 0,
	);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [serverNameError, setServerNameError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const nameError = useMemo(() => validateUnitName(name), [name]);
	const abbreviationError = useMemo(() => validateAbbreviation(abbreviation), [abbreviation]);

	const effectiveNameError = serverNameError ?? nameError;
	const canSave = !nameError && !abbreviationError && !serverNameError;
	const isSaving = busy.isBusy;

	React.useEffect(() => {
		if (abbreviationEditedManually) return;
		const suggested = suggestAbbreviationFromName(name, FIELD_LIMITS.unitAbbreviation);
		setAbbreviation((prev) => {
			if (prev === suggested) return prev;
			return suggested;
		});
	}, [abbreviationEditedManually, name]);

	const exitRef = useRef(false);
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

	const isUiDisabled = isSaving || isNavLocked;

	const onCancel = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		exitRef.current = true;
		clearUnitSelectionParams(router as any);
		router.replace({
			pathname: toScopedRoute(UNIT_SELECT_ROUTE) as any,
			params: {
				[RETURN_TO_KEY]: returnTo,
				[DRAFT_ID_KEY]: draftId || undefined,
				[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
				[UNIT_CREATE_CATEGORY_KEY]: "CUSTOM",
				[UNIT_SERVICE_GROUP_KEY]: serviceGroup,
			} as any,
		});
	}, [draftId, isUiDisabled, lockNav, productType, returnTo, router, serviceGroup, toScopedRoute]);
	const guardedOnCancel = useProcessExitGuard(onCancel, false);

	const headerOptions = useInventoryHeader("process", {
		title: "Custom Unit",
		disabled: isUiDisabled,
		onExit: guardedOnCancel,
	});

	const onSave = useCallback(async () => {
		if (isUiDisabled || !lockNav()) return;

		if (!canSave) {
			setSubmitAttempted(true);
			setNameTouched(true);
			setAbbreviationTouched(true);
			return;
		}

		setSubmitError(null);
		setServerNameError(null);

		await withBusy("Creating unit", async () => {
			try {
				const unit = await unitsApi.createCustomUnit({
					intent: "CREATE_CUSTOM",
					category,
					name: sanitizeEntityNameInput(name).trim(),
					abbreviation: sanitizeUnitAbbreviationInput(abbreviation).trim(),
					precisionScale,
				});

				syncUnitListCaches(queryClient, unit);

				const selectionParams = buildUnitSelectionParams({
					selectedUnitId: unit.id,
					selectedUnitName: unit.name,
					selectedUnitAbbreviation: unit.abbreviation ?? "",
					selectedUnitCategory: unit.category,
					selectedUnitPrecisionScale: unit.precisionScale,
					selectionSource: "created",
					draftId: draftId || undefined,
					returnTo,
					productType,
				});

				exitRef.current = true;
				clearUnitSelectionParams(router as any);
				replaceToReturnTo(router as any, returnTo, selectionParams);
			} catch (err) {
				const { code, message, limit } = extractApiError(err);
				setSubmitAttempted(true);

				if (code === "UNIT_NAME_EXISTS") {
					setServerNameError(message ?? "Unit name already exists.");
					setNameTouched(true);
					return;
				}

				if (code === "CUSTOM_UNIT_LIMIT_REACHED") {
					const cap = limit ?? CUSTOM_UNIT_LIMIT_FALLBACK;
					setSubmitError(`You've reached the maximum of ${cap} custom units.`);
					return;
				}

				setSubmitError(message ?? "Failed to create unit. Please try again.");
			}
		});
	}, [
		abbreviation,
		canSave,
		category,
		draftId,
		isUiDisabled,
		lockNav,
		name,
		precisionScale,
		productType,
		queryClient,
		returnTo,
		router,
		withBusy,
	]);

	const showNameError = submitAttempted || nameTouched || !!serverNameError;
	const showAbbreviationError = submitAttempted || abbreviationTouched;

	useUnitFlowBackGuard(navigation, exitRef, guardedOnCancel);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>
						<BAIInlineHeaderMount options={headerOptions} />

			<BAIScreen tabbed padded={false} safeTop={false}>
				<Pressable style={styles.screen} onPress={Keyboard.dismiss}>
					<BAISurface style={styles.card} padded>
						<BAIText variant='title'>Create Custom Unit</BAIText>
						<BAIText variant='caption' muted>
							Create a custom unit for your business
						</BAIText>

						<View style={{ height: 4 }} />

						<BAITextInput
							label='Unit name'
							value={name}
							onChangeText={(v) => setName(sanitizeEntityNameDraftInput(v))}
							onBlur={() => {
								setName((prev) => sanitizeEntityNameInput(prev));
								setNameTouched(true);
							}}
							placeholder='e.g., Centimeter'
							maxLength={FIELD_LIMITS.unitName}
							error={showNameError && !!effectiveNameError}
							errorMessage={showNameError ? (effectiveNameError ?? undefined) : undefined}
						/>

						<View style={{ height: 2 }} />

						<BAITextInput
							label='Abbreviation'
							value={abbreviation}
							onChangeText={(v) =>
								setAbbreviation(() => {
									setAbbreviationEditedManually(true);
									const cleaned = sanitizeUnitAbbreviationInput(v);
									return cleaned.length > FIELD_LIMITS.unitAbbreviation
										? cleaned.slice(0, FIELD_LIMITS.unitAbbreviation)
										: cleaned;
								})
							}
							onBlur={() => setAbbreviationTouched(true)}
							placeholder='e.g., cm'
							maxLength={FIELD_LIMITS.unitAbbreviation}
							autoCapitalize='none'
							error={showAbbreviationError && !!abbreviationError}
							errorMessage={showAbbreviationError ? (abbreviationError ?? undefined) : undefined}
						/>
						<View
							style={[
								styles.abbreviationDivider,
								{ borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
							]}
						/>

						{submitError ? (
							<BAIText variant='caption' style={{ color: theme.colors.error }}>
								{submitError}
							</BAIText>
						) : null}

						<View style={{ height: submitError ? 12 : 0 }} />

						<ScrollView
							style={styles.lowerScroll}
							contentContainerStyle={styles.lowerScrollContent}
							keyboardShouldPersistTaps='handled'
							showsVerticalScrollIndicator={false}
						>
							<BAIText variant='title' muted>
								✅ Precision
							</BAIText>

							<View style={{ height: 8 }} />

							<View style={styles.precisionList}>
								{PRECISION_OPTIONS.map((p) => (
									<BAIRadioRow
										key={p}
										title={p === 0 ? "Whole units (1)" : `${p} decimal${p === 1 ? "" : "s"} ${precisionSuffix(p)}`}
										selected={precisionScale === p}
										onPress={() => setPrecisionScale(p)}
									/>
								))}
							</View>

							<View style={{ height: 18 }} />

							<View style={styles.actionsRow}>
								<BAIButton
									variant='outline'
									disabled={isUiDisabled}
									onPress={guardedOnCancel}
									style={styles.actionButton}
									shape='pill'
									widthPreset='standard'
									intent='neutral'
								>
									Cancel
								</BAIButton>
								<BAICTAPillButton
									variant='solid'
									disabled={!canSave || isUiDisabled}
									onPress={onSave}
									style={styles.actionButton}
								>
									Save Unit
								</BAICTAPillButton>
							</View>
						</ScrollView>
					</BAISurface>
				</Pressable>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	card: { marginHorizontal: 16, borderRadius: 24, flex: 1 },
	abbreviationDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		marginTop: 10,
		marginBottom: 6,
	},
	lowerScroll: { flex: 1 },
	lowerScrollContent: {
		paddingBottom: 24,
	},
	precisionList: { gap: 10 },
	actionsRow: { flexDirection: "row", gap: 12 },
	actionButton: { flex: 1 },
});
