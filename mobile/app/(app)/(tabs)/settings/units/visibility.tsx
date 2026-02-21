// BizAssist_mobile
// path: app/(app)/(tabs)/settings/units/visibility.tsx
//
// Header governance:
// - This is a Settings detail screen → use BACK (not Exit).
// - Back is deterministic to Unit Management.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAISwitchRow } from "@/components/ui/BAISwitchRow";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { formatCompactNumber } from "@/lib/locale/businessLocale";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { unitsApi } from "@/modules/units/units.api";
import { syncUnitListCaches } from "@/modules/units/units.cache";
import { unitKeys, useUnitVisibilityMutation, useUnitVisibilityQuery } from "@/modules/units/units.queries";
import type { PrecisionScale, Unit } from "@/modules/units/units.types";
import { displayUnitAbbreviation, displayUnitLabel, isEachUnitLike } from "@/modules/units/units.display";
import { getEachUnit, isProtectedEach } from "@/modules/units/units.visibility";
import { SETTINGS_UNITS_ROUTE } from "@/modules/units/units.navigation";
import { useAppHeader } from "@/modules/navigation/useAppHeader";

const COUNT_CATALOG_ID = "ea";
const COUNT_PRECISION: PrecisionScale = 0;
const UNIT_VISIBILITY_ACTION_WIDTH = 112;
const UNIT_VISIBILITY_PROTECTED_ACTION_WIDTH = 148;

const CONTENT_MAX_WIDTH_TABLET = 1100;

function sortUnits(units: Unit[]): Unit[] {
	return [...units].sort((a, b) => {
		const aLabel = displayUnitLabel(a).toLowerCase();
		const bLabel = displayUnitLabel(b).toLowerCase();
		return aLabel.localeCompare(bLabel);
	});
}

function moveEachToTop(units: Unit[]): Unit[] {
	const list = [...units];
	const idx = list.findIndex((u) => isProtectedEach(u));
	if (idx <= 0) return list;
	const [each] = list.splice(idx, 1);
	return [each, ...list];
}

export default function UnitVisibilityScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const tabBarHeight = useBottomTabBarHeight();
	const { withBusy, busy } = useAppBusy();
	const queryClient = useQueryClient();
	const { countryCode } = useActiveBusinessMeta();

	const isTablet = width >= 768;
	const contentMaxWidth = isTablet ? CONTENT_MAX_WIDTH_TABLET : undefined;

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor,
			backgroundColor: surfaceAlt,
		}),
		[borderColor, surfaceAlt],
	);

	const [showHidden, setShowHidden] = useState(false);

	const unitsQuery = useQuery<Unit[]>({
		queryKey: unitKeys.list({ includeArchived: false }),
		queryFn: () => unitsApi.listUnits({ includeArchived: false }),
		staleTime: 300_000,
	});

	const visibilityQuery = useUnitVisibilityQuery();
	const visibilityMutation = useUnitVisibilityMutation();

	const hiddenUnitIds = visibilityQuery.hiddenUnitIds;
	const hiddenCount = hiddenUnitIds.size;
	const compactHidden = formatCompactNumber(hiddenCount, countryCode);
	const hiddenSubtitle =
		hiddenCount > 0 ? `${compactHidden} hidden. View and restore units.` : "View and restore units.";

	const activeUnits = useMemo(() => (unitsQuery.data ?? []).filter((u) => u.isActive), [unitsQuery.data]);
	const eachUnit = useMemo(() => getEachUnit(activeUnits), [activeUnits]);

	const countSeededRef = useRef(false);

	useEffect(() => {
		if (eachUnit || activeUnits.some((u) => isEachUnitLike(u))) return;
		if (!unitsQuery.isFetched || countSeededRef.current) return;
		countSeededRef.current = true;

		unitsApi
			.enableCatalogUnit({
				intent: "ENABLE_CATALOG",
				catalogId: COUNT_CATALOG_ID,
				precisionScale: COUNT_PRECISION,
			})
			.then((unit) => {
				syncUnitListCaches(queryClient, unit);
			})
			.catch(() => {
				// noop
			});
	}, [activeUnits, eachUnit, queryClient, unitsQuery.isFetched]);

	const visibleUnits = useMemo(
		() => sortUnits(activeUnits.filter((u) => !hiddenUnitIds.has(u.id) || isProtectedEach(u))),
		[activeUnits, hiddenUnitIds],
	);

	const hiddenUnits = useMemo(
		() => sortUnits(activeUnits.filter((u) => hiddenUnitIds.has(u.id) && !isProtectedEach(u))),
		[activeUnits, hiddenUnitIds],
	);

	const displayUnits = useMemo(() => {
		const combined = showHidden ? [...hiddenUnits, ...visibleUnits] : visibleUnits;
		return moveEachToTop(combined);
	}, [hiddenUnits, showHidden, visibleUnits]);

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

	const isUiDisabled = busy.isBusy || visibilityMutation.isPending || isNavLocked;
	const isLoading = unitsQuery.isLoading || visibilityQuery.isLoading;
	const isError = unitsQuery.isError || visibilityQuery.isError;
	const onBack = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		router.replace(SETTINGS_UNITS_ROUTE as any);
	}, [isUiDisabled, lockNav, router]);
	const headerOptions = useAppHeader("detail", { title: "Unit Visibility", disabled: isUiDisabled, onBack });

	const onHideUnit = useCallback(
		async (unit: Unit) => {
			if (isUiDisabled || isProtectedEach(unit)) return;

			await withBusy("Hiding unit…", async () => {
				await visibilityMutation.mutateAsync({ action: "HIDE", unitId: unit.id });
			});
		},
		[isUiDisabled, visibilityMutation, withBusy],
	);

	const onRestoreUnit = useCallback(
		async (unit: Unit) => {
			if (isUiDisabled) return;

			await withBusy("Restoring unit…", async () => {
				await visibilityMutation.mutateAsync({ action: "RESTORE", unitId: unit.id });
			});
		},
		[isUiDisabled, visibilityMutation, withBusy],
	);

	const handleRetry = useCallback(() => {
		unitsQuery.refetch();
		visibilityQuery.refetch();
	}, [unitsQuery, visibilityQuery]);

	const renderUnitRow = useCallback(
		(unit: Unit) => {
			const abbr = displayUnitAbbreviation(unit);
			const meta = abbr ? `${unit.category} • ${abbr}` : unit.category;

			const isProtected = isProtectedEach(unit);
			const isHidden = hiddenUnitIds.has(unit.id);

			const actionLabel = isProtected ? "Always Visible" : isHidden ? "Restore" : "Hide";
			const actionIntent = isProtected ? "neutral" : isHidden ? "success" : "neutral";
			const actionVariant = isProtected ? "ghost" : isHidden ? "solid" : "outline";
			const actionDisabled = isUiDisabled || isProtected;
			const actionStyle = isProtected ? styles.protectedActionButton : styles.actionButton;
			const actionLabelStyle = isHidden ? { color: theme.colors.onPrimary } : undefined;

			const onPress = isHidden ? () => onRestoreUnit(unit) : () => onHideUnit(unit);

			return (
				<BAISurface key={unit.id} style={[styles.row, surfaceInteractive]} padded={false} bordered>
					<View style={styles.rowContent}>
						<View style={styles.rowLeft}>
							<BAIText variant='body' numberOfLines={1}>
								{displayUnitLabel(unit)}
							</BAIText>
							<BAIText variant='caption' muted numberOfLines={1}>
								{meta}
							</BAIText>
						</View>

						<BAIButton
							size='sm'
							variant={actionVariant}
							intent={actionIntent}
							onPress={onPress}
							disabled={actionDisabled}
							style={actionStyle}
							labelStyle={actionLabelStyle}
							widthPreset='standard'
						>
							{actionLabel}
						</BAIButton>
					</View>
				</BAISurface>
			);
		},
		[borderColor, hiddenUnitIds, isUiDisabled, onHideUnit, onRestoreUnit, theme.colors.onPrimary],
	);

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false}>
				<View style={[styles.screen, { paddingBottom: tabBarHeight + 12 }]}>
					<View style={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}>
						{/* Non-scrollable header area */}
						<BAISurface style={[styles.card, { borderColor }]} padded bordered>
							<View style={styles.header}>
								<BAIText variant='title'>Manage Unit Visibility</BAIText>
							</View>

							<BAISwitchRow
								label={showHidden ? "Hidden units visible" : "Show hidden units"}
								description={hiddenSubtitle}
								value={showHidden}
								onValueChange={setShowHidden}
								disabled={isUiDisabled}
							/>

							{/* Section title stays fixed */}
							<View style={styles.sectionHeader}>
								<BAIText variant='caption' muted>
									{showHidden ? "All units" : "Visible units"}
								</BAIText>
							</View>

							{/* ONLY the list scrolls */}
							<View style={styles.listRegion}>
								{isLoading ? (
									<BAISurface style={[styles.stateCard, { borderColor }]} padded bordered>
										<View style={styles.loadingState}>
											<BAIActivityIndicator size='large' tone='primary' />
											<View style={{ height: 10 }} />
											<BAIText variant='subtitle'>Loading visibility…</BAIText>
										</View>
									</BAISurface>
								) : isError ? (
									<BAISurface style={[styles.stateCard, { borderColor }]} padded bordered>
										<BAIText variant='subtitle'>Could not load unit visibility.</BAIText>
										<View style={{ height: 12 }} />
										<BAIRetryButton variant='outline' onPress={handleRetry} disabled={isUiDisabled}>
											Retry
										</BAIRetryButton>
									</BAISurface>
								) : displayUnits.length === 0 ? (
									<BAISurface style={[styles.stateCard, { borderColor }]} padded bordered>
										<BAIText variant='subtitle'>No units found.</BAIText>
										<BAIText variant='caption' muted>
											Create a unit to see it listed here.
										</BAIText>
									</BAISurface>
								) : (
					<FlatList
						data={displayUnits}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => renderUnitRow(item)}
						style={styles.listScroll}
						contentContainerStyle={styles.listContent}
										showsVerticalScrollIndicator={false}
										alwaysBounceVertical={false}
										removeClippedSubviews
						initialNumToRender={12}
						windowSize={7}
						ListFooterComponent={<View style={{ height: 6 }} />}
					/>
				)}
			</View>
		</BAISurface>
					</View>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,

		paddingHorizontal: 14,
	},

	content: {
		flex: 1,
		width: "100%",
		alignSelf: "center",
	},

	card: {
		flex: 1, // critical: allows listRegion to actually get height
		width: "100%",
		borderRadius: 18,
		gap: 10,
	},

	header: {
		gap: 4,
	},

	sectionHeader: {
		paddingTop: 0,
	},

	// The list region is the only scrollable zone. It must have flexible height.
	listRegion: {
		flex: 1,
		minHeight: 220, // fallback so small screens still show a list area
	},

	listScroll: {
		flex: 1,
	},

	listContent: {
		gap: 0,
		paddingBottom: 6,
	},

	row: {
		borderRadius: 12,
		marginBottom: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},

	rowContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},

	actionButton: {
		width: UNIT_VISIBILITY_ACTION_WIDTH,
		minWidth: UNIT_VISIBILITY_ACTION_WIDTH,
		maxWidth: UNIT_VISIBILITY_ACTION_WIDTH,
		flexShrink: 0,
	},
	protectedActionButton: {
		width: UNIT_VISIBILITY_PROTECTED_ACTION_WIDTH,
		minWidth: UNIT_VISIBILITY_PROTECTED_ACTION_WIDTH,
		maxWidth: UNIT_VISIBILITY_PROTECTED_ACTION_WIDTH,
		flexShrink: 0,
	},

	rowLeft: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},

	stateCard: {
		borderRadius: 18,
	},

	loadingState: {
		alignItems: "center",
		paddingVertical: 10,
	},
});
