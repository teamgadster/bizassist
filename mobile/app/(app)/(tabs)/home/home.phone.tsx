// BizAssist_mobile
// path: app/(app)/home/home.phone.tsx
//
// Refactor summary (Top App Bar “glass” effect WITHOUT expo-blur):
// - ✅ Header is transparent + “glass” (translucent wash + subtle hairline) — no expo-blur dependency
// - ✅ Removes header shadow/border for a clean bar
// - ✅ Uses headerHeight for deterministic content offset (no magic marginTop)
// - ✅ Keeps your ScrollView + “tab kiss” bottom inset intact

import { useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "expo-router";

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
import { InventoryRecentActivitySection } from "@/modules/inventory/components/InventoryRecentActivitySection";

type HomePhoneProps = {
	onOpenPOS: () => void;
	onOpenInventory: (filter?: InventoryHealthFilter) => void;
};

export default function HomePhone({ onOpenPOS, onOpenInventory }: HomePhoneProps) {
	const { height } = useWindowDimensions();
	const theme = useTheme();
	const navigation = useNavigation();
	const headerHeight = useHeaderHeight();

	// Match create.tsx bottom inset pattern
	const tabBarHeight = useBottomTabBarHeight();
	const TAB_KISS_GAP = 12;
	const screenBottomPad = tabBarHeight + TAB_KISS_GAP;

	// Source-of-truth for gating navigation
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

	const outline = (theme.colors as any)?.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = (theme.colors as any)?.surfaceVariant ?? theme.colors.surface;
	const rowPressedBg = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
	const inventoryDisabled = !canNavigate || !hasBusiness;

	// ✅ “Glass” top app bar (no expo-blur). This matches the reference visually: transparent + frosted wash.
	useLayoutEffect(() => {
		navigation.setOptions?.({
			headerTransparent: true,
			headerShadowVisible: false,
			headerStyle: { backgroundColor: "transparent" },
			headerBackground: () => (
				<View style={StyleSheet.absoluteFill}>
					{/* Translucent wash */}
					<View
						style={[
							StyleSheet.absoluteFill,
							{
								backgroundColor: theme.dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.70)",
							},
						]}
					/>

					{/* Optional “glass bloom” gradient-ish highlight (cheap but effective) */}
					<View
						style={[
							StyleSheet.absoluteFill,
							{
								opacity: theme.dark ? 0.1 : 0.18,
								backgroundColor: theme.dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,1)",
							},
						]}
					/>

					{/* Bottom hairline separator */}
					<View
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: 0,
							height: StyleSheet.hairlineWidth,
							backgroundColor: outline,
							opacity: theme.dark ? 0.28 : 0.22,
						}}
					/>
				</View>
			),
		});
	}, [navigation, theme.dark, outline]);

	const inventoryQuery = useQuery({
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
		<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
			<ScrollView
				style={[styles.scroll, { backgroundColor: theme.colors.background }]}
				contentContainerStyle={[
					styles.content,
					{
						minHeight: height,
						// ✅ Deterministic: content starts below the floating header
						paddingTop: headerHeight + 12,
						paddingBottom: screenBottomPad,
					},
				]}
				showsVerticalScrollIndicator={false}
				showsHorizontalScrollIndicator={false}
				keyboardShouldPersistTaps='handled'
			>
				<View style={styles.shell}>
					<BusinessContextCard layout='phoneGrid' style={styles.card} />

					<BAISurface style={[styles.card, styles.hero]}>
						<View style={styles.heroHeader}>
							<BAIText variant='title'>Dashboard</BAIText>
							<BAIText variant='body' muted>
								Track sales, inventory, and tasks at a glance.
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
								intent='primary'
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

					<BAISurface style={[styles.card, styles.section]}>
						<View style={styles.sectionHeaderRow}>
							<View style={styles.sectionHeaderText}>
								<BAIText variant='subtitle'>Inventory health</BAIText>
								<BAIText variant='caption' muted>
									Stay ahead of stockouts and shrink.
								</BAIText>
							</View>
							<BAIButton
								variant='outline'
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
										<BAIText variant='body'>Stocks on hand</BAIText>
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
						style={[styles.card, styles.section]}
					/>

					<BAISurface style={[styles.card, styles.section]}>
						<View style={styles.sectionHeader}>
							<BAIText variant='subtitle'>Next actions</BAIText>
							<BAIText variant='caption' muted>
								Suggested tasks to keep operations healthy.
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
				</View>
			</ScrollView>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },

	scroll: { flex: 1 },

	content: { flexGrow: 1, paddingHorizontal: 16 },

	shell: { width: "100%", alignSelf: "center", maxWidth: 520, gap: 12, marginTop: 50 },

	card: { marginBottom: 20 },

	hero: { gap: 12 },
	heroHeader: { gap: 6 },
	heroActions: { marginTop: 4, gap: 10 },

	statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	statusDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", opacity: 0.4 },
	statusItem: { flex: 1, gap: 4 },

	section: { gap: 12 },
	sectionHeader: { gap: 4 },
	sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
	sectionHeaderText: { flex: 1, gap: 4 },
	sectionHeaderAction: { alignSelf: "flex-start" },

	kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	kpiCard: {
		flexGrow: 1,
		flexBasis: "48%",
		minWidth: 140,
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
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
