// BizAssist_mobile
// path: src/modules/inventory/components/InventoryRecentActivitySection.tsx

import { useMemo, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { InventoryMovementRow } from "@/modules/inventory/components/InventoryMovementRow";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import { inventoryKeys } from "@/modules/inventory/inventory.queries";
import type { InventoryHealthFilter } from "@/modules/inventory/inventory.filters";
import type { InventoryMovement, InventoryProduct } from "@/modules/inventory/inventory.types";
import type { UnitDisplayInput } from "@/modules/units/units.format";

type Props = {
	outline: string;
	surfaceAlt: string;
	inventoryDisabled: boolean;
	handleNav: (type: "POS" | "INV", fn: () => void) => void;
	onOpenInventory: (filter?: InventoryHealthFilter) => void;
	hasBusiness: boolean;
	inventoryQuery: UseQueryResult<{ items: InventoryProduct[] }>;
	variant?: "phone" | "tablet";
	style?: StyleProp<ViewStyle>;
};

function parseTimestampMillis(value?: string | null): number {
	if (!value) return 0;
	const t = Date.parse(value);
	return Number.isFinite(t) ? t : 0;
}

function selectActivityProduct(items: InventoryProduct[], ready: boolean): InventoryProduct | null {
	if (!ready || items.length === 0) return null;

	// Prefer tracked items; fall back to any item if none are tracked.
	const tracked = items.filter((item) => item.trackInventory);
	const pool = tracked.length > 0 ? tracked : items;

	const sorted = [...pool].sort((a, b) => {
		const bTime = parseTimestampMillis(b.updatedAt ?? b.createdAt ?? null);
		const aTime = parseTimestampMillis(a.updatedAt ?? a.createdAt ?? null);
		return bTime - aTime;
	});

	return sorted[0] ?? null;
}

export function InventoryRecentActivitySection({
	outline,
	surfaceAlt,
	inventoryDisabled,
	handleNav,
	onOpenInventory,
	hasBusiness,
	inventoryQuery,
	variant = "phone",
	style,
}: Props) {
	const activityProduct = useMemo(
		() => selectActivityProduct(inventoryQuery.data?.items ?? [], inventoryQuery.isSuccess),
		[inventoryQuery.data?.items, inventoryQuery.isSuccess],
	);

	const activityProductId = activityProduct?.id ?? "";
	const activityUnit: UnitDisplayInput | null = activityProduct?.unit ?? activityProduct ?? null;
	const activityPrecision = activityProduct?.unitPrecisionScale ?? activityProduct?.unit?.precisionScale ?? undefined;

	const movementsQuery = useQuery({
		queryKey: activityProductId
			? inventoryKeys.movements(activityProductId, 5)
			: ["inventory", "movements", "home", "disabled"],
		queryFn: () => inventoryApi.listMovements(activityProductId, { limit: 5 }),
		enabled: hasBusiness && !!activityProductId,
		staleTime: 30_000,
	});

	const movements = movementsQuery.data?.items ?? [];
	const visibleMovements: InventoryMovement[] =
		movements.length > 0 ? movements.slice(0, variant === "tablet" ? 4 : 3) : [];

	let body: ReactNode;

	if (!hasBusiness) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body'>Add a business to see inventory activity.</BAIText>
				<BAIText variant='caption' muted>
					Connect a store to start tracking movements.
				</BAIText>
			</View>
		);
	} else if (inventoryQuery.isLoading) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body' muted>
					Loading inventory…
				</BAIText>
			</View>
		);
	} else if (inventoryQuery.isError) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body'>Unable to load inventory.</BAIText>
				<BAIText variant='caption' muted>
					Pull to refresh or reopen Inventory.
				</BAIText>
			</View>
		);
	} else if (!activityProductId) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body'>No items yet.</BAIText>
				<BAIText variant='caption' muted>
					Create a product to start capturing activity.
				</BAIText>
			</View>
		);
	} else if (movementsQuery.isLoading) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body' muted>
					Loading activity…
				</BAIText>
			</View>
		);
	} else if (movementsQuery.isError) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body'>Couldn&apos;t load recent activity.</BAIText>
				<BAIText variant='caption' muted>
					Try again from Inventory.
				</BAIText>
			</View>
		);
	} else if (visibleMovements.length === 0) {
		body = (
			<View style={styles.messageBlock}>
				<BAIText variant='body'>No recent activity</BAIText>
				<BAIText variant='caption' muted>
					Stock movements appear after sales or adjustments.
				</BAIText>
			</View>
		);
	} else {
		body = (
			<View style={styles.activityList}>
				{visibleMovements.map((movement) => (
					<View
						key={movement.id}
						style={[styles.activityRowWrap, { backgroundColor: surfaceAlt, borderColor: outline }]}
					>
						<InventoryMovementRow
							movement={movement}
							compact={variant === "tablet"}
							showDateTime={variant === "tablet"}
							precisionScale={activityPrecision ?? undefined}
							unit={activityUnit}
						/>
					</View>
				))}

				{activityProduct?.name ? (
					<BAIText variant='caption' muted style={styles.sourceNote}>
						Showing latest for {activityProduct.name}
					</BAIText>
				) : null}
			</View>
		);
	}

	return (
		<BAISurface style={[styles.section, style]}>
			<View style={styles.sectionHeaderRow}>
				<View style={styles.sectionHeaderText}>
					<BAIText variant='subtitle'>Recent activity</BAIText>
					<BAIText variant='caption' muted>
						Latest sales and inventory events.
					</BAIText>
				</View>
				<BAIButton
					variant={variant === "tablet" ? "ghost" : "outline"}
					intent='neutral'
					size='sm'
					onPress={() => handleNav("INV", () => onOpenInventory())}
					disabled={inventoryDisabled}
					style={styles.sectionHeaderAction}
					widthPreset='standard'
				>
					View Activity
				</BAIButton>
			</View>

			<View style={styles.list}>{body}</View>
		</BAISurface>
	);
}

const styles = StyleSheet.create({
	section: { gap: 12 },
	sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
	sectionHeaderText: { flex: 1, gap: 4 },
	sectionHeaderAction: { alignSelf: "flex-start" },

	list: { gap: 10 },
	activityList: { gap: 10 },
	activityRowWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" },
	messageBlock: { gap: 4 },
	sourceNote: { marginTop: -2 },
});
