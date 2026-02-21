// path: src/modules/business/components/BusinessContextCard.tsx
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";

type BusinessContextCardProps = {
	/**
	 * "inline": compact single-line context for headers (Inventory/POS).
	 * "card": full meta grid for Settings (or future shells).
	 */
	variant?: "inline" | "card";

	/**
	 * Optional title label for card variant.
	 * Default: "Business"
	 */
	title?: string;

	/**
	 * Show store name in meta.
	 * Default true (card), false (inline)
	 */
	showStore?: boolean;
};

export function BusinessContextCard({ variant = "card", title = "Business", showStore }: BusinessContextCardProps) {
	const theme = useTheme();
	const outline = theme.colors.outlineVariant ?? theme.colors.outline;

	const meta = useActiveBusinessMeta();

	const resolvedShowStore = useMemo(() => {
		if (typeof showStore === "boolean") return showStore;
		return variant === "card";
	}, [showStore, variant]);

	// Inline header mode: minimal, non-disruptive.
	if (variant === "inline") {
		if (meta.isLoading) {
			return (
				<BAIText variant='caption' muted>
					Loading business…
				</BAIText>
			);
		}

		if (meta.isError) {
			return (
				<View style={styles.inlineRow}>
					<BAIText variant='caption' muted>
						Business unavailable
					</BAIText>
					<BAIButton mode='outlined' onPress={meta.refetch} compact>
						Retry
					</BAIButton>
				</View>
			);
		}

		if (!meta.hasBusiness) {
			return (
				<BAIText variant='caption' muted>
					No active business
				</BAIText>
			);
		}

		const parts = [meta.businessName, meta.countryLabel, meta.currencyCode || "—", meta.timezone || "—"].filter(
			Boolean
		);

		return (
			<BAIText variant='caption' muted numberOfLines={1}>
				{parts.join(" • ")}
			</BAIText>
		);
	}

	// Card mode: full meta grid for Settings or Home shells.
	return (
		<BAISurface style={[styles.card, { borderColor: outline }]} padded={false}>
			<View style={styles.cardInner}>
				<View style={styles.headerRow}>
					<BAIText variant='subtitle'>{title}</BAIText>

					{meta.isLoading ? (
						<BAIText variant='caption' muted>
							Loading…
						</BAIText>
					) : meta.isError ? (
						<BAIButton mode='outlined' onPress={meta.refetch} compact>
							Retry
						</BAIButton>
					) : null}
				</View>

				{meta.hasBusiness ? (
					<>
						<BAIText variant='title' numberOfLines={1}>
							{meta.businessName}
						</BAIText>

						<View style={styles.grid}>
							<View style={styles.item}>
								<BAIText variant='caption' muted>
									Country
								</BAIText>
								<BAIText variant='body'>{meta.countryLabel || "—"}</BAIText>
							</View>

							<View style={styles.item}>
								<BAIText variant='caption' muted>
									Currency
								</BAIText>
								<BAIText variant='body'>{meta.currencyCode || "—"}</BAIText>
							</View>

							<View style={styles.item}>
								<BAIText variant='caption' muted>
									Timezone
								</BAIText>
								<BAIText variant='body'>{meta.timezone || "—"}</BAIText>
							</View>

							{resolvedShowStore ? (
								<View style={styles.item}>
									<BAIText variant='caption' muted>
										Store
									</BAIText>
									<BAIText variant='body'>{meta.storeName || "Main Store"}</BAIText>
								</View>
							) : null}
						</View>
					</>
				) : (
					<>
						<BAIText variant='body' muted>
							No active business yet. Complete setup to unlock POS and Inventory.
						</BAIText>
						<BAIButton mode='outlined' disabled>
							Setup required
						</BAIButton>
					</>
				)}
			</View>
		</BAISurface>
	);
}

const styles = StyleSheet.create({
	inlineRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	card: {
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
	},
	cardInner: {
		padding: 12,
		gap: 10,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	item: {
		minWidth: 140,
		flexGrow: 1,
		gap: 2,
	},
});