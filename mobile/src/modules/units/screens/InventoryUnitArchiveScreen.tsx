// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/units/[id]/archive.tsx
//
// Governance:
// - Archive is a PROCESS screen.
// - Exit cancels and returns to Unit Details.

import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
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
const PROTECTED_CATALOG_ID = "ea" as const;

function extractApiErrorMessage(err: unknown): string {
	const data = (err as any)?.response?.data;
	const msg = data?.message ?? data?.error?.message ?? (err as any)?.message ?? "Failed to archive unit.";
	return String(msg);
}

export default function UnitArchiveScreen() {
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

	const canArchive = !!unit && !unit.catalogId && unit.isActive && unit.catalogId !== PROTECTED_CATALOG_ID;

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

	const onConfirmArchive = useCallback(async () => {
		if (!unit || !canArchive || isUiDisabled) return;
		if (!lockNav()) return;

		setError(null);
		await withBusy("Archiving unit…", async () => {
			try {
				const archivedUnit = await unitsApi.archiveUnit(unit.id);
				syncUnitListCaches(queryClient, archivedUnit);
				void queryClient.invalidateQueries({ queryKey: unitKeys.root });
				router.replace(detailRoute as any);
			} catch (err) {
				setError(extractApiErrorMessage(err));
			}
		});
	}, [canArchive, detailRoute, isUiDisabled, lockNav, queryClient, router, unit, withBusy]);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const headerOptions = useInventoryHeader("process", {
		title: "Archive Unit",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						<BAIText variant='caption' muted>
							Archived units remain in history but can’t be selected for new items.
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
						) : !canArchive ? (
							<BAIText variant='caption' muted>
								This unit cannot be archived.
							</BAIText>
						) : (
							<BAIText variant='body'>This action will archive “{unit.name}”.</BAIText>
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
								intent='danger'
								onPress={onConfirmArchive}
								disabled={!canArchive || isUiDisabled}
								style={styles.actionBtn}
							>
								Archive
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
