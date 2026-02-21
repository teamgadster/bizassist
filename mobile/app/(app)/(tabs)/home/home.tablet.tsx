// BizAssist_mobile
// path: app/(app)/home/home.tablet.tsx

import { useMemo, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { BusinessContextCard } from "@/components/business/BusinessContextCard";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import { inventoryKeys } from "@/modules/inventory/inventory.queries";
import { getInventoryHealthCounts, type InventoryHealthFilter } from "@/modules/inventory/inventory.filters";
import type { InventoryProduct } from "@/modules/inventory/inventory.types";
import { InventoryRecentActivitySection } from "@/modules/inventory/components/InventoryRecentActivitySection";

type HomeTabletProps = {
	onOpenPOS: () => void;
	onOpenInventory: (filter?: InventoryHealthFilter) => void;
};

export default function HomeTablet({ onOpenPOS, onOpenInventory }: HomeTabletProps) {
	const { width, height } = useWindowDimensions();
	const theme = useTheme();

	/**
	 * GOVERNANCE:
	 * - Landscape MUST be a true 2-panel layout (primary + right rail) and occupy full width.
	 * - Portrait stays stacked and keeps the existing tablet max-width behavior.
	 */
	const isLandscape = width > height;

	// Source-of-truth for gating
	const { hasBusiness } = useActiveBusinessMeta();

	// Governance: prevent double-taps for navigation actions via disabled-state latch.
	const [navLock, setNavLock] = useState<"POS" | "INV" | null>(null);
	const canNavigate = useMemo(() => navLock === null, [navLock]);

	const handleNav = useMemo(() => {
		return (type: "POS" | "INV", fn: () => void) => {
			if (!canNavigate) return;
			setNavLock(type);
			try {
				fn();
			} finally {
				setTimeout(() => setNavLock(null), 350);
			}
		};
	}, [canNavigate]);

	// Borders + subtle alt surfaces
	const outline = theme.colors.outline;
	const surfaceAlt = (theme.colors as any)?.surfaceVariant ?? theme.colors.surface;
	const rowPressedBg = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

	const inventoryDisabled = !canNavigate || !hasBusiness;

	const inventoryQuery = useQuery<{ items: InventoryProduct[] }>({
		queryKey: inventoryKeys.products(""),
		queryFn: () => inventoryApi.listProducts({ limit: 100 }),
		staleTime: 120_000,
		enabled: hasBusiness,
	});

	const inventoryItems = useMemo(() => inventoryQuery.data?.items ?? [], [inventoryQuery.data?.items]);
	const inventoryHealth = useMemo(() => {
		if (!inventoryQuery.isSuccess) return null;
		return getInventoryHealthCounts(inventoryItems);
	}, [inventoryItems, inventoryQuery.isSuccess]);

	const lowStockLabel = inventoryHealth ? String(inventoryHealth.low) : "—";
	const outOfStockLabel = inventoryHealth ? String(inventoryHealth.out) : "—";
	const stockOnHandLabel = inventoryHealth ? String(inventoryHealth.healthy) : "—";
	const reorderLabel = inventoryHealth ? String(inventoryHealth.missingReorder) : "—";

	const showLowRow = inventoryHealth ? inventoryHealth.low > 0 : true;
	const showOutRow = inventoryHealth ? inventoryHealth.out > 0 : true;
	const showStockOnHandRow = inventoryHealth ? inventoryHealth.thresholds > 0 : true;
	const showReorderRow = inventoryHealth ? inventoryHealth.thresholds === 0 : false;

	return (
		<BAIScreen
			tabbed
			scroll
			padded={false}
			// Portrait retains your existing centered tablet layout.
			// Landscape explicitly opts out so the 2-panel layout can occupy the full screen width.
			constrainWidth={!isLandscape}
			contentContainerStyle={styles.content}
		>
			<View style={[styles.shell, isLandscape ? styles.twoPane : styles.stack]}>
				{/* PRIMARY PANEL */}
				<View style={[styles.primaryPane, isLandscape && styles.primaryPaneTwoPane]}>
					<BusinessContextCard layout='tabletRow' showStore={false} style={[styles.card, styles.tabletContextCard]} />

					<BAISurface style={[styles.card, styles.hero]}>
						<View style={styles.heroHeader}>
							<BAIText variant='title'>Dashboard</BAIText>
							<BAIText variant='body' muted>
								See sales performance and operational priorities in one view.
							</BAIText>
						</View>

						<View style={styles.heroActions}>
							<BAICTAButton
								variant='solid'
								intent='primary'
								size='lg'
								onPress={() => handleNav("POS", onOpenPOS)}
								disabled={!canNavigate || !hasBusiness}
							>
								Open POS
							</BAICTAButton>

							<BAIButton
								variant='outline'
								intent='neutral'
								onPress={() => handleNav("INV", () => onOpenInventory())}
								disabled={!canNavigate || !hasBusiness}
							>
								Open Inventory
							</BAIButton>
						</View>

						<View style={styles.statusRow}>
							<View style={styles.statusItem}>
								<BAIText variant='caption' muted>
									Store status
								</BAIText>
								<BAIText variant='body'>{hasBusiness ? "Ready to sell" : "Setup required"}</BAIText>
							</View>

							<View style={[styles.statusDivider, { backgroundColor: outline }]} />

							<View style={styles.statusItem}>
								<BAIText variant='caption' muted>
									Last sync
								</BAIText>
								<BAIText variant='body'>—</BAIText>
							</View>
						</View>
					</BAISurface>

					<BAISurface style={[styles.card, styles.section]}>
						<View style={styles.sectionHeader}>
							<BAIText variant='subtitle'>Today’s snapshot</BAIText>
							<BAIText variant='caption' muted>
								Sales data appears after your first checkout.
							</BAIText>
						</View>

						<View style={styles.kpiGrid}>
							<View style={[styles.kpiCard, { backgroundColor: surfaceAlt, borderColor: outline }]}>
								<BAIText variant='caption' muted>
									Sales
								</BAIText>
								<BAIText variant='subtitle'>—</BAIText>
								<BAIText variant='caption' muted>
									vs yesterday —
								</BAIText>
							</View>

							<View style={[styles.kpiCard, { backgroundColor: surfaceAlt, borderColor: outline }]}>
								<BAIText variant='caption' muted>
									Orders
								</BAIText>
								<BAIText variant='subtitle'>—</BAIText>
								<BAIText variant='caption' muted>
									Avg ticket —
								</BAIText>
							</View>

							<View style={[styles.kpiCard, { backgroundColor: surfaceAlt, borderColor: outline }]}>
								<BAIText variant='caption' muted>
									Items sold
								</BAIText>
								<BAIText variant='subtitle'>—</BAIText>
								<BAIText variant='caption' muted>
									Top item —
								</BAIText>
							</View>

							<View style={[styles.kpiCard, { backgroundColor: surfaceAlt, borderColor: outline }]}>
								<BAIText variant='caption' muted>
									Refunds
								</BAIText>
								<BAIText variant='subtitle'>—</BAIText>
								<BAIText variant='caption' muted>
									Last 24h —
								</BAIText>
							</View>
						</View>
					</BAISurface>

					{/* Portrait: put the rail content below (stacked) */}
					{!isLandscape ? (
						<View style={styles.stackSecondaryBlock}>
							<SecondaryRail
								outline={outline}
								surfaceAlt={surfaceAlt}
								rowPressedBg={rowPressedBg}
								inventoryDisabled={inventoryDisabled}
								handleNav={handleNav}
								onOpenInventory={onOpenInventory}
								hasBusiness={hasBusiness}
								inventoryQuery={inventoryQuery}
								showLowRow={showLowRow}
								showOutRow={showOutRow}
								showStockOnHandRow={showStockOnHandRow}
								showReorderRow={showReorderRow}
								lowStockLabel={lowStockLabel}
								outOfStockLabel={outOfStockLabel}
								stockOnHandLabel={stockOnHandLabel}
								reorderLabel={reorderLabel}
							/>
						</View>
					) : null}
				</View>

				{/* RIGHT RAIL (Landscape only) */}
				{isLandscape ? (
					<View style={styles.secondaryPane}>
						<SecondaryRail
							outline={outline}
							surfaceAlt={surfaceAlt}
							rowPressedBg={rowPressedBg}
							inventoryDisabled={inventoryDisabled}
							handleNav={handleNav}
							onOpenInventory={onOpenInventory}
							hasBusiness={hasBusiness}
							inventoryQuery={inventoryQuery}
							showLowRow={showLowRow}
							showOutRow={showOutRow}
							showStockOnHandRow={showStockOnHandRow}
							showReorderRow={showReorderRow}
							lowStockLabel={lowStockLabel}
							outOfStockLabel={outOfStockLabel}
							stockOnHandLabel={stockOnHandLabel}
							reorderLabel={reorderLabel}
						/>
					</View>
				) : null}
			</View>
		</BAIScreen>
	);
}

function SecondaryRail(props: {
	outline: string;
	surfaceAlt: string;
	rowPressedBg: string;
	inventoryDisabled: boolean;
	handleNav: (type: "POS" | "INV", fn: () => void) => void;
	onOpenInventory: (filter?: InventoryHealthFilter) => void;
	hasBusiness: boolean;
	inventoryQuery: UseQueryResult<{ items: InventoryProduct[] }, Error>;

	showLowRow: boolean;
	showOutRow: boolean;
	showStockOnHandRow: boolean;
	showReorderRow: boolean;

	lowStockLabel: string;
	outOfStockLabel: string;
	stockOnHandLabel: string;
	reorderLabel: string;
}) {
	const {
		outline,
		surfaceAlt,
		rowPressedBg,
		inventoryDisabled,
		handleNav,
		onOpenInventory,
		hasBusiness,
		inventoryQuery,
		showLowRow,
		showOutRow,
		showStockOnHandRow,
		showReorderRow,
		lowStockLabel,
		outOfStockLabel,
		stockOnHandLabel,
		reorderLabel,
	} = props;

	return (
		<>
			<BAISurface style={[styles.card, styles.section]}>
				<View style={styles.sectionHeaderRow}>
					<View style={styles.sectionHeaderText}>
						<BAIText variant='subtitle'>Inventory health</BAIText>
						<BAIText variant='caption' muted>
							Review replenishment signals.
						</BAIText>
					</View>
					<BAIButton
						variant='ghost'
						intent='neutral'
						size='sm'
						onPress={() => handleNav("INV", () => onOpenInventory())}
						disabled={inventoryDisabled}
						style={styles.sectionHeaderAction}
						widthPreset='standard'
					>
						View Inventory
					</BAIButton>
				</View>

				<View style={styles.list}>
					{showLowRow ? (
						<Pressable
							onPress={() => handleNav("INV", () => onOpenInventory("low"))}
							disabled={inventoryDisabled}
							style={({ pressed }) => [
								styles.listRow,
								{ backgroundColor: surfaceAlt, borderColor: outline },
								pressed && !inventoryDisabled && { backgroundColor: rowPressedBg },
								inventoryDisabled && styles.listRowDisabled,
							]}
						>
							<View style={styles.listInfo}>
								<BAIText variant='body'>Low stock</BAIText>
								<BAIText variant='caption' muted>
									Reorder suggested
								</BAIText>
							</View>
							<BAIText variant='subtitle'>{lowStockLabel}</BAIText>
						</Pressable>
					) : null}

					{showOutRow ? (
						<Pressable
							onPress={() => handleNav("INV", () => onOpenInventory("out"))}
							disabled={inventoryDisabled}
							style={({ pressed }) => [
								styles.listRow,
								{ backgroundColor: surfaceAlt, borderColor: outline },
								pressed && !inventoryDisabled && { backgroundColor: rowPressedBg },
								inventoryDisabled && styles.listRowDisabled,
							]}
						>
							<View style={styles.listInfo}>
								<BAIText variant='body'>Out of stock</BAIText>
								<BAIText variant='caption' muted>
									Immediate attention
								</BAIText>
							</View>
							<BAIText variant='subtitle'>{outOfStockLabel}</BAIText>
						</Pressable>
					) : null}

					{showStockOnHandRow ? (
						<Pressable
							onPress={() => handleNav("INV", () => onOpenInventory("healthy"))}
							disabled={inventoryDisabled}
							style={({ pressed }) => [
								styles.listRow,
								{ backgroundColor: surfaceAlt, borderColor: outline },
								pressed && !inventoryDisabled && { backgroundColor: rowPressedBg },
								inventoryDisabled && styles.listRowDisabled,
							]}
						>
							<View style={styles.listInfo}>
								<BAIText variant='body'>On hand</BAIText>
								<BAIText variant='caption' muted>
									Above reorder points
								</BAIText>
							</View>
							<BAIText variant='subtitle'>{stockOnHandLabel}</BAIText>
						</Pressable>
					) : null}

					{showReorderRow ? (
						<Pressable
							onPress={() => handleNav("INV", () => onOpenInventory("reorder"))}
							disabled={inventoryDisabled}
							style={({ pressed }) => [
								styles.listRow,
								{ backgroundColor: surfaceAlt, borderColor: outline },
								pressed && !inventoryDisabled && { backgroundColor: rowPressedBg },
								inventoryDisabled && styles.listRowDisabled,
							]}
						>
							<View style={styles.listInfo}>
								<BAIText variant='body'>Set stock thresholds</BAIText>
								<BAIText variant='caption' muted>
									Add reorder points to track stock
								</BAIText>
							</View>
							<BAIText variant='subtitle'>{reorderLabel}</BAIText>
						</Pressable>
					) : null}
				</View>
			</BAISurface>

			<InventoryRecentActivitySection
				outline={outline}
				surfaceAlt={surfaceAlt}
				inventoryDisabled={inventoryDisabled}
				handleNav={handleNav}
				onOpenInventory={onOpenInventory}
				hasBusiness={hasBusiness}
				inventoryQuery={inventoryQuery}
				variant='tablet'
				style={[styles.card, styles.section]}
			/>

			<BAISurface style={[styles.card, styles.section]}>
				<View style={styles.sectionHeader}>
					<BAIText variant='subtitle'>Upcoming reminders</BAIText>
					<BAIText variant='caption' muted>
						Routine checks to keep the store steady.
					</BAIText>
				</View>

				<View style={styles.list}>
					<View style={[styles.listRow, { backgroundColor: surfaceAlt, borderColor: outline }]}>
						<View style={styles.listInfo}>
							<BAIText variant='body'>Weekly cycle count</BAIText>
							<BAIText variant='caption' muted>
								Inventory accuracy
							</BAIText>
						</View>
						<BAIText variant='caption' muted>
							This week
						</BAIText>
					</View>

					<View style={[styles.listRow, { backgroundColor: surfaceAlt, borderColor: outline }]}>
						<View style={styles.listInfo}>
							<BAIText variant='body'>Supplier check-in</BAIText>
							<BAIText variant='caption' muted>
								Replenishment ETA
							</BAIText>
						</View>
						<BAIText variant='caption' muted>
							Upcoming
						</BAIText>
					</View>
				</View>
			</BAISurface>

			<BAISurface style={[styles.card, styles.section]}>
				<View style={styles.sectionHeader}>
					<BAIText variant='subtitle'>Priority actions</BAIText>
					<BAIText variant='caption' muted>
						Keep sales and inventory moving.
					</BAIText>
				</View>

				<View style={styles.list}>
					<View style={[styles.listRow, { backgroundColor: surfaceAlt, borderColor: outline }]}>
						<View style={styles.listInfo}>
							<BAIText variant='body'>Review high-velocity items</BAIText>
							<BAIText variant='caption' muted>
								Inventory planning
							</BAIText>
						</View>
						<BAIText variant='caption' muted>
							Today
						</BAIText>
					</View>

					<View style={[styles.listRow, { backgroundColor: surfaceAlt, borderColor: outline }]}>
						<View style={styles.listInfo}>
							<BAIText variant='body'>Check staff notes</BAIText>
							<BAIText variant='caption' muted>
								Shift handoff
							</BAIText>
						</View>
						<BAIText variant='caption' muted>
							Now
						</BAIText>
					</View>

					<View style={[styles.listRow, { backgroundColor: surfaceAlt, borderColor: outline }]}>
						<View style={styles.listInfo}>
							<BAIText variant='body'>Audit cash drawer</BAIText>
							<BAIText variant='caption' muted>
								Closeout prep
							</BAIText>
						</View>
						<BAIText variant='caption' muted>
							End of day
						</BAIText>
					</View>
				</View>
			</BAISurface>
		</>
	);
}

const styles = StyleSheet.create({
	content: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingBottom: 24,
		paddingTop: 12,
	},

	shell: {
		width: "100%",
		gap: 12,
	},

	// Landscape: true 2-panel
	twoPane: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},

	// Portrait: stacked
	stack: {
		flexDirection: "column",
		alignItems: "stretch",
		gap: 12,
	},

	primaryPane: {
		gap: 12,
	},
	primaryPaneTwoPane: {
		flex: 1,
		minWidth: 0, // prevents horizontal overflow in edge cases
	},

	/**
	 * Landscape rail:
	 * - Must flex so the overall 2-panel layout consumes full width.
	 * - Still enforce min/max so it remains a “rail” and not a second primary panel.
	 */
	secondaryPane: {
		flexGrow: 0,
		flexShrink: 0,
		flexBasis: 420, // starting point
		minWidth: 360,
		maxWidth: 520,
		gap: 12,
	},

	stackSecondaryBlock: {
		gap: 12,
	},

	card: { marginBottom: 0 },
	tabletContextCard: { marginBottom: 4 },

	hero: { gap: 12 },
	heroHeader: { gap: 6 },
	heroActions: { gap: 10 },

	statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	statusDivider: { width: 1, alignSelf: "stretch", opacity: 0.4 },
	statusItem: { flex: 1, gap: 4 },

	section: { gap: 12 },
	sectionHeader: { gap: 4 },
	sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
	sectionHeaderText: { flex: 1, gap: 4 },
	sectionHeaderAction: { alignSelf: "flex-start" },

	kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	kpiCard: {
		flexGrow: 1,
		flexBasis: "45%",
		minWidth: 200,
		borderWidth: 1,
		borderRadius: 12,
		padding: 14,
		gap: 4,
	},

	list: { gap: 10 },
	listRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
	},
	listInfo: { flex: 1, gap: 2, paddingRight: 12 },
	listRowDisabled: { opacity: 0.5 },
});
