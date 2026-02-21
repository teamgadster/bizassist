// path: src/components/business/BusinessContextCard.tsx
import { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";

type BusinessContextCardLayout = "phoneGrid" | "tabletRow";

type BusinessContextCardProps = {
	/**
	 * Keeps the component “tiny” but flexible:
	 * - phoneGrid = phone-style 2-row wrap grid
	 * - tabletRow = tablet dense row cards
	 */
	layout?: BusinessContextCardLayout;

	/**
	 * Optional container style so screens can place the card naturally without forcing layout.
	 */
	style?: ViewStyle | ViewStyle[];

	/**
	 * If true, shows Store name if available (phone uses this).
	 */
	showStore?: boolean;

	/**
	 * Allows screens to gate other CTAs based on presence of business.
	 * If omitted, the card handles its own empty state.
	 */
	onMissingBusinessActionLabel?: string; // e.g. "Setup required"
};

export function BusinessContextCard({
	layout = "phoneGrid",
	style,
	showStore = true,
	onMissingBusinessActionLabel = "Setup Required",
}: BusinessContextCardProps) {
	const theme = useTheme();

	const { isLoading, isError, refetch, hasBusiness, businessName, countryLabel, currencyCode, timezone, storeName } =
		useActiveBusinessMeta();

	const headerRight = useMemo(() => {
		if (isLoading) {
			return (
				<BAIText variant='caption' muted>
					Loading…
				</BAIText>
			);
		}

		if (isError) {
			// We do NOT show “Unavailable” because that reads like a feature-state.
			// This is an operational dependency (network/API). We give an action instead.
			return (
				<BAIButton mode='outlined' onPress={refetch} widthPreset='standard' shape='pill'>
					Retry
				</BAIButton>
			);
		}

		return null;
	}, [isLoading, isError, refetch]);

	const metaBody = useMemo(() => {
		if (!hasBusiness) return null;

		if (layout === "tabletRow") {
			return (
				<View style={styles.tabletRow}>
					<BAISurface style={styles.tabletMetaCard}>
						<BAIText variant='caption' muted>
							Business
						</BAIText>
						<BAIText variant='body'>{businessName || "—"}</BAIText>
					</BAISurface>

					<BAISurface style={styles.tabletMetaCard}>
						<BAIText variant='caption' muted>
							Country
						</BAIText>
						<BAIText variant='body'>{countryLabel || "—"}</BAIText>
					</BAISurface>

					<BAISurface style={styles.tabletMetaCard}>
						<BAIText variant='caption' muted>
							Currency
						</BAIText>
						<BAIText variant='body'>{currencyCode || "—"}</BAIText>
					</BAISurface>

					<BAISurface style={styles.tabletMetaCard}>
						<BAIText variant='caption' muted>
							Timezone
						</BAIText>
						<BAIText variant='body'>{timezone || "—"}</BAIText>
					</BAISurface>
				</View>
			);
		}

		// phoneGrid (wrap layout)
		return (
			<>
				<BAIText variant='title'>{businessName || "—"}</BAIText>

				<View style={styles.phoneGrid}>
					<View style={styles.phoneMetaItem}>
						<BAIText variant='caption' muted>
							Country
						</BAIText>
						<BAIText variant='body'>{countryLabel || "—"}</BAIText>
					</View>

					<View style={styles.phoneMetaItem}>
						<BAIText variant='caption' muted>
							Currency
						</BAIText>
						<BAIText variant='body'>{currencyCode || "—"}</BAIText>
					</View>

					<View style={styles.phoneMetaItem}>
						<BAIText variant='caption' muted>
							Timezone
						</BAIText>
						<BAIText variant='body'>{timezone || "—"}</BAIText>
					</View>

					{showStore ? (
						<View style={styles.phoneMetaItem}>
							<BAIText variant='caption' muted>
								Store
							</BAIText>
							<BAIText variant='body'>{storeName || "Main Store"}</BAIText>
						</View>
					) : null}
				</View>
			</>
		);
	}, [hasBusiness, layout, businessName, countryLabel, currencyCode, timezone, showStore, storeName]);

	return (
		<BAISurface style={[styles.card, style]}>
			<View style={styles.header}>
				<BAIText variant='subtitle'>Business</BAIText>
				{headerRight}
			</View>

			{isError ? (
				<BAIText variant='caption' muted>
					Can’t load business context. Check your connection and try again.
				</BAIText>
			) : null}

			{hasBusiness ? (
				metaBody
			) : (
				<>
					<BAIText variant='body' muted>
						No active business yet. Complete setup to unlock POS and Inventory.
					</BAIText>

					<BAIButton mode='outlined' disabled style={{ marginTop: 8 }} widthPreset='standard' shape='pill'>
						{onMissingBusinessActionLabel}
					</BAIButton>
				</>
			)}

			{/* Subtle divider line for the card to read “structured” without changing app layout */}
			<View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant ?? theme.colors.outline }]} />
		</BAISurface>
	);
}

const styles = StyleSheet.create({
	card: { gap: 10 },

	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: 10,
	},

	divider: {
		height: StyleSheet.hairlineWidth,
		opacity: 0.15,
		marginTop: 4,
	},

	// PHONE GRID
	phoneGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	phoneMetaItem: {
		minWidth: 120,
		flexGrow: 1,
		gap: 2,
	},

	// TABLET ROW (dense but readable)
	tabletRow: {
		marginTop: 10,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	tabletMetaCard: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		minWidth: 240,
		flexGrow: 1,
		gap: 4,
	},
});
