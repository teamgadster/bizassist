// BizAssist_mobile
// path: app/(app)/(tabs)/settings/units/[id]/edit.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { useAppBusy } from "@/hooks/useAppBusy";
import { unitsApi } from "@/modules/units/units.api";
import { syncUnitListCaches } from "@/modules/units/units.cache";
import { precisionHint } from "@/modules/units/units.format";
import { unitKeys } from "@/modules/units/units.queries";
import type { Unit } from "@/modules/units/units.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { labelRegex, unitAbbreviationRegex } from "@/shared/validation/patterns";
import {
	sanitizeLabelDraftInput,
	sanitizeLabelInput,
	sanitizeUnitAbbreviationInput,
} from "@/shared/validation/sanitize";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";

const UNITS_ROUTE = "/(app)/(tabs)/settings/units" as const;

// Governance: "Each" is system-owned and cannot be edited or archived.
const PROTECTED_CATALOG_ID = "ea" as const;

const NAME_MIN_LENGTH = FIELD_LIMITS.unitNameMin;
const ABBR_MIN_LENGTH = FIELD_LIMITS.unitAbbreviationMin;

function categoryLabel(category: Unit["category"]): string {
	if (category === "COUNT") return "Count";
	if (category === "WEIGHT") return "Weight";
	if (category === "VOLUME") return "Volume";
	if (category === "LENGTH") return "Length";
	if (category === "AREA") return "Area";
	if (category === "TIME") return "Time";
	if (category === "CUSTOM") return "Custom";
	return category;
}

function precisionLabel(scale: number): string {
	const safe = Math.max(0, Math.min(5, Math.trunc(scale || 0)));
	if (safe === 0) return "Whole units (1)";
	return `${safe} decimal${safe === 1 ? "" : "s"} (${precisionHint(safe)})`;
}

function extractApiError(err: unknown): { code?: string; message?: string } {
	const data = (err as any)?.response?.data;
	const error = data?.error ?? {};
	const code = typeof error?.code === "string" ? error.code : typeof data?.code === "string" ? data.code : undefined;
	const message =
		typeof error?.message === "string" ? error.message : typeof data?.message === "string" ? data.message : undefined;
	return { code, message };
}

function validateUnitName(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return "Unit name is required.";
	if (trimmed.length < NAME_MIN_LENGTH) return `Unit name must be at least ${FIELD_LIMITS.unitNameMin} characters.`;
	if (trimmed.length > FIELD_LIMITS.unitName) return `Unit name must be ${FIELD_LIMITS.unitName} characters or less.`;
	if (!labelRegex.test(trimmed)) return "Unit name contains invalid characters.";
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

export default function UnitEditScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { withBusy, busy } = useAppBusy();
	const queryClient = useQueryClient();

	const params = useLocalSearchParams<{ id?: string }>();
	const unitId = String(params.id ?? "");

	const [name, setName] = useState("");
	const [abbreviation, setAbbreviation] = useState("");
	const [nameTouched, setNameTouched] = useState(false);
	const [abbrTouched, setAbbrTouched] = useState(false);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [serverNameError, setServerNameError] = useState<string | null>(null);
	const [serverAbbrError, setServerAbbrError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	const unitsQuery = useQuery<Unit[]>({
		queryKey: unitKeys.list({ includeArchived: true }),
		queryFn: () => unitsApi.listUnits({ includeArchived: true }),
		staleTime: 300_000,
	});

	const unit = useMemo(() => {
		const list = unitsQuery.data ?? [];
		return list.find((u) => u.id === unitId) ?? null;
	}, [unitId, unitsQuery.data]);

	const isProtectedUnit = useMemo(() => !!unit && unit.catalogId === PROTECTED_CATALOG_ID, [unit]);

	const isCustomActive = !!unit && !unit.catalogId && unit.isActive;

	useEffect(() => {
		if (!unit) return;
		setName(unit.name ?? "");
		setAbbreviation(unit.abbreviation ?? "");
		setNameTouched(false);
		setAbbrTouched(false);
		setSubmitAttempted(false);
		setServerNameError(null);
		setServerAbbrError(null);
		setSubmitError(null);
	}, [unit]);

	const nameError = useMemo(() => validateUnitName(name), [name]);
	const abbrError = useMemo(() => validateAbbreviation(abbreviation), [abbreviation]);

	const effectiveNameError = serverNameError ?? (nameTouched || submitAttempted ? nameError : null);
	const effectiveAbbrError = serverAbbrError ?? (abbrTouched || submitAttempted ? abbrError : null);

	const hasChanges = useMemo(() => {
		if (!unit) return false;
		return (
			sanitizeLabelInput(name).trim() !== unit.name ||
			sanitizeUnitAbbreviationInput(abbreviation).trim() !== unit.abbreviation
		);
	}, [abbreviation, name, unit]);

	const canSubmit = !!unit && isCustomActive && hasChanges && !nameError && !abbrError;
	const isUiDisabled = busy.isBusy || isNavLocked || isSubmitting;

	const unitDetailsRoute = useMemo(() => {
		if (!unitId) return UNITS_ROUTE;
		return `/(app)/(tabs)/settings/units/${encodeURIComponent(unitId)}` as const;
	}, [unitId]);

	const goBackSafe = useCallback(() => {
		router.replace(unitDetailsRoute as any);
	}, [router, unitDetailsRoute]);

	const onSave = useCallback(async () => {
		if (!unit || !isCustomActive) return;
		if (isUiDisabled) return;

		if (!canSubmit) {
			setSubmitAttempted(true);
			setNameTouched(true);
			setAbbrTouched(true);
			return;
		}

		if (!lockNav()) return;

		const nextName = sanitizeLabelInput(name).trim();
		const nextAbbr = sanitizeUnitAbbreviationInput(abbreviation).trim();

		setSubmitError(null);
		setServerNameError(null);
		setServerAbbrError(null);
		setIsSubmitting(true);

		await withBusy("Saving unit...", async () => {
			try {
				const updatedUnit = await unitsApi.updateUnit(unit.id, { name: nextName, abbreviation: nextAbbr });
				syncUnitListCaches(queryClient, updatedUnit);
				void queryClient.invalidateQueries({ queryKey: unitKeys.root });
				router.replace(unitDetailsRoute as any);
			} catch (err) {
				const { code, message } = extractApiError(err);

				if (code === "UNIT_NAME_EXISTS") {
					setServerNameError(message ?? "Unit name already exists.");
				} else if (code === "UNIT_ABBREVIATION_EXISTS") {
					setServerAbbrError(message ?? "Abbreviation already exists.");
				} else if (message && message.toLowerCase().includes("abbreviation")) {
					setServerAbbrError(message);
				} else {
					setSubmitError(message ?? "Failed to update unit.");
				}
			} finally {
				setIsSubmitting(false);
			}
		});
	}, [abbreviation, canSubmit, isCustomActive, isUiDisabled, lockNav, name, queryClient, router, unit, unitDetailsRoute, withBusy]);

	// Process screen => Exit (X). Cancel intent + discard unsaved changes.
	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		goBackSafe();
	}, [goBackSafe, isUiDisabled, lockNav]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const headerOptions = useAppHeader("process", { title: "Edit Unit", disabled: isUiDisabled, onExit: guardedOnExit });

	const content = (
		<>
			{unitsQuery.isLoading ? (
				<BAISurface style={[styles.banner, { borderColor }]} padded>
					<BAIText variant='caption' muted>
						Loading unit...
					</BAIText>
				</BAISurface>
			) : null}

			{unitsQuery.isError ? (
				<BAISurface style={[styles.banner, { borderColor }]} padded>
					<BAIText variant='subtitle'>Could not load unit.</BAIText>
					<View style={{ height: 12 }} />
					<BAIRetryButton
						variant='outline'
						onPress={() => unitsQuery.refetch()}
						disabled={isUiDisabled || isProtectedUnit}
					>
						Retry
					</BAIRetryButton>
				</BAISurface>
			) : null}

			{!unitsQuery.isLoading && !unitsQuery.isError && !unit ? (
				<BAISurface style={[styles.banner, { borderColor }]} padded>
					<BAIText variant='subtitle'>Unit not found.</BAIText>
					<View style={{ height: 12 }} />
					<BAIButton
						variant='outline'
						intent='neutral'
						shape='pill'
						widthPreset='standard'
						onPress={guardedOnExit}
						disabled={isUiDisabled || isProtectedUnit}
					>
						Cancel
					</BAIButton>
				</BAISurface>
			) : null}

			{unit && !isCustomActive ? (
				<BAISurface style={[styles.banner, { borderColor }]} padded>
					<BAIText variant='subtitle'>This unit is read-only.</BAIText>
					<BAIText variant='caption' muted>
						System and archived units cannot be edited.
					</BAIText>
					<View style={{ height: 12 }} />
					<BAIButton
						variant='outline'
						intent='neutral'
						shape='pill'
						widthPreset='standard'
						onPress={guardedOnExit}
						disabled={isUiDisabled || isProtectedUnit}
					>
						Cancel
					</BAIButton>
				</BAISurface>
			) : null}

			{unit && isCustomActive ? (
				<BAISurface style={[styles.card, { borderColor }]} padded>
					<BAITextInput
						label='Unit name'
						value={name}
						onChangeText={(v) => {
							setNameTouched(true);
							setServerNameError(null);
							const cleaned = sanitizeLabelDraftInput(v);
							setName(cleaned.length > FIELD_LIMITS.unitName ? cleaned.slice(0, FIELD_LIMITS.unitName) : cleaned);
						}}
						maxLength={FIELD_LIMITS.unitName}
						autoCapitalize='words'
						placeholder='e.g. Per piece'
						error={!!effectiveNameError}
						errorMessage={effectiveNameError ?? undefined}
					/>

					<BAITextInput
						label='Abbreviation'
						value={abbreviation}
						onChangeText={(v) => {
							setAbbrTouched(true);
							setServerAbbrError(null);
							const cleaned = sanitizeUnitAbbreviationInput(v);
							setAbbreviation(
								cleaned.length > FIELD_LIMITS.unitAbbreviation
									? cleaned.slice(0, FIELD_LIMITS.unitAbbreviation)
									: cleaned,
							);
						}}
						maxLength={FIELD_LIMITS.unitAbbreviation}
						autoCapitalize='characters'
						placeholder='e.g. pc'
						error={!!effectiveAbbrError}
						errorMessage={effectiveAbbrError ?? undefined}
					/>

					<BAISurface style={[styles.lockedInfo, { borderColor }]} padded>
						<View style={styles.lockedRow}>
							<BAIText variant='caption' muted style={styles.lockedKey}>
								Category
							</BAIText>
							<BAIText variant='subtitle'>{categoryLabel(unit.category)}</BAIText>
						</View>

						<View style={styles.lockedRow}>
							<BAIText variant='caption' muted style={styles.lockedKey}>
								Precision
							</BAIText>
							<BAIText variant='subtitle'>{precisionLabel(unit.precisionScale)}</BAIText>
						</View>

						<BAIText variant='caption' muted style={styles.lockedNote}>
							Category and precision are locked for governance.
						</BAIText>
					</BAISurface>

					{submitError ? (
						<BAIText variant='caption' style={{ color: theme.colors.error }}>
							{submitError}
						</BAIText>
					) : null}

					<View style={styles.actionRow}>
						<BAIButton
							variant='outline'
							intent='neutral'
							onPress={guardedOnExit}
							disabled={isUiDisabled || isProtectedUnit}
							style={styles.actionBtn}
							shape='pill'
							widthPreset='standard'
						>
							Cancel
						</BAIButton>

						<BAICTAPillButton
							variant='solid'
							intent='primary'
							onPress={onSave}
							disabled={isUiDisabled || !canSubmit}
							style={styles.actionBtn}
						>
							Save
						</BAICTAPillButton>
					</View>
				</BAISurface>
			) : null}
		</>
	);

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>{content}</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	notice: {
		marginTop: 12,
		padding: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 12,
	},
	screen: {
		flex: 1,
		gap: 12,
		padding: 12,
	},

	banner: {
		borderWidth: 1,
		borderRadius: 16,
	},

	card: {
		borderWidth: 1,
		borderRadius: 18,
	},

	lockedInfo: {
		marginTop: 12,
		borderWidth: 1,
		borderRadius: 16,
	},
	lockedRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: 12,
	},
	lockedKey: {
		flexShrink: 0,
	},
	lockedNote: {
		marginTop: 10,
	},

	actionRow: {
		marginTop: 14,
		flexDirection: "row",
		gap: 12,
	},
	actionBtn: {
		flex: 1,
	},
});
