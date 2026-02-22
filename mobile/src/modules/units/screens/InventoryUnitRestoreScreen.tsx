// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/units/[id]/restore.tsx
//
// Governance:
// - Restore is a PROCESS screen.
// - Exit cancels and returns to Unit Details.

import { useCallback, useMemo, useRef, useState } from "react";
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
import { useAppBusy } from "@/hooks/useAppBusy";
import { unitsApi } from "@/modules/units/units.api";
import { syncUnitListCaches } from "@/modules/units/units.cache";
import { unitKeys } from "@/modules/units/units.queries";
import type { Unit } from "@/modules/units/units.types";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";

const UNITS_ROUTE = "/(app)/(tabs)/inventory/units" as const;

function extractApiErrorMessage(err: unknown): string {
	const data = (err as any)?.response?.data;
	const msg = data?.message ?? data?.error?.message ?? (err as any)?.message ?? "Failed to restore unit.";
	return String(msg);
}

export default function UnitRestoreScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { withBusy, busy } = useAppBusy();
	const queryClient = useQueryClient();

	const params = useLocalSearchParams<{ id?: string }>();
	const unitId = String(params.id ?? "");

	const [error, setError] = useState<string | null>(null);

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

	const isUiDisabled = busy.isBusy || isNavLocked;

	const unitsQuery = useQuery<Unit[]>({
		queryKey: unitKeys.list({ includeArchived: true }),
		queryFn: () => unitsApi.listUnits({ includeArchived: true }),
		staleTime: 30_000,
	});

	const unit = useMemo(() => {
		const list = unitsQuery.data ?? [];
		return list.find((u) => u.id === unitId) ?? null;
	}, [unitId, unitsQuery.data]);

	const canRestore = !!unit && !unit.catalogId && !unit.isActive;

	const detailRoute = useMemo(() => {
		if (!unitId) return UNITS_ROUTE;
		return `/(app)/(tabs)/settings/units/${encodeURIComponent(unitId)}` as const;
	}, [unitId]);

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		router.replace(detailRoute as any);
	}, [detailRoute, isUiDisabled, lockNav, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onConfirmRestore = useCallback(async () => {
		if (!unit || !canRestore || isUiDisabled) return;
		if (!lockNav()) return;

		setError(null);
		await withBusy("Restoring unit…", async () => {
			try {
				const restoredUnit = await unitsApi.restoreUnit(unit.id);
				syncUnitListCaches(queryClient, restoredUnit);
				void queryClient.invalidateQueries({ queryKey: unitKeys.root });
				router.replace(detailRoute as any);
			} catch (err) {
				setError(extractApiErrorMessage(err));
			}
		});
	}, [canRestore, detailRoute, isUiDisabled, lockNav, queryClient, router, unit, withBusy]);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const headerOptions = useInventoryHeader("process", {
		title: "Restore Unit",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: "/(app)/(tabs)/inventory",
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						<BAIText variant='caption' muted>
							Restored units can be selected for new items again.
						</BAIText>

						<View style={{ height: 12 }} />

						{unitsQuery.isLoading ? (
							<BAIText variant='caption' muted>
								Loading unit...
							</BAIText>
						) : unitsQuery.isError ? (
							<View style={styles.stateBlock}>
								<BAIText variant='caption' muted>
									Could not load unit.
								</BAIText>
								<BAIRetryButton variant='outline' onPress={() => unitsQuery.refetch()} disabled={isUiDisabled}>
									Retry
								</BAIRetryButton>
							</View>
						) : !unit ? (
							<BAIText variant='caption' muted>
								Unit not found.
							</BAIText>
						) : !canRestore ? (
							<BAIText variant='caption' muted>
								This unit cannot be restored.
							</BAIText>
						) : (
							<BAIText variant='body'>This action will restore “{unit.name}”.</BAIText>
						)}

						{error ? (
							<>
								<View style={{ height: 10 }} />
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									{error}
								</BAIText>
							</>
						) : null}

						<View style={{ height: 14 }} />

						<View style={styles.actionsRow}>
							<BAIButton
								shape='pill'
								widthPreset='standard'
								variant='outline'
								intent='neutral'
								onPress={guardedOnExit}
								disabled={isUiDisabled}
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>

							<BAICTAPillButton
								variant='solid'
								intent='primary'
								onPress={onConfirmRestore}
								disabled={!canRestore || isUiDisabled}
								style={styles.actionBtn}
							>
								Restore
							</BAICTAPillButton>
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		padding: 12,
	},
	card: {
		borderRadius: 18,
	},
	stateBlock: {
		gap: 10,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 12,
	},
	actionBtn: {
		flex: 1,
	},
});
