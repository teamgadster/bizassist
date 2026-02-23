import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import { inventoryKeys } from "@/modules/inventory/inventory.queries";
import { formatOnHandValue } from "@/modules/inventory/inventory.selectors";
import type { InventoryProduct } from "@/modules/inventory/inventory.types";
import { getModifierGroupDraft, upsertModifierGroupDraft } from "@/modules/modifiers/drafts/modifierGroupDraft";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { unitDisplayToken } from "@/modules/units/units.format";

type Props = {
	mode: "settings" | "inventory";
};

type RowItemProps = {
	item: InventoryProduct;
	selected: boolean;
	onToggle: (id: string) => void;
};

function isService(item: InventoryProduct): boolean {
	const normalized = String((item as any)?.type ?? "")
		.trim()
		.toUpperCase();
	return normalized === "SERVICE";
}

function getServiceDurationLabel(item: InventoryProduct): string | null {
	const total = Number((item as any)?.durationTotalMinutes);
	if (!Number.isFinite(total) || total <= 0) return null;
	const hours = Math.floor(total / 60);
	const minutes = total % 60;
	if (hours > 0 && minutes > 0) return `${hours} hr, ${minutes} mins`;
	if (hours > 0) return `${hours} hr`;
	return `${minutes} mins`;
}

function getItemStockWithUnitLabel(item: InventoryProduct): string {
	const stockValue = formatOnHandValue(item);
	const quantityValue = (item as any)?.onHandCachedRaw ?? (item as any)?.onHandCached;
	const unitToken = unitDisplayToken(item as any, "quantity", quantityValue);
	return unitToken ? `${stockValue} ${unitToken}` : stockValue;
}

function ProductRow({ item, selected, onToggle }: RowItemProps) {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const onSurface = theme.colors.onSurface;
	const onSurfaceVariant = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;
	const primary = theme.colors.primary;

	const label = item.name?.trim() || "Unnamed";
	const durationLabel = isService(item) ? getServiceDurationLabel(item) : null;
	const subtitle = isService(item) ? (durationLabel ?? "Service") : getItemStockWithUnitLabel(item);
	const rightMeta = item.category?.name?.trim() || "";
	const initials = label.slice(0, 2).toUpperCase();

	return (
		<Pressable
			onPress={() => onToggle(item.id)}
			style={({ pressed }) => [
				styles.row,
				{ borderBottomColor: borderColor, backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent" },
			]}
			>
				<View style={styles.rowLeft}>
					<View style={[styles.thumb, { borderColor, backgroundColor: theme.colors.surfaceVariant }]}>
						<BAIText variant='body' style={{ color: onSurfaceVariant }}>
							{initials}
						</BAIText>
					</View>
					<View style={styles.nameWrap}>
						<BAIText variant='subtitle' numberOfLines={1}>
							{label}
						</BAIText>
						<BAIText variant='caption' style={{ color: onSurfaceVariant }} numberOfLines={1}>
							{subtitle}
						</BAIText>
					</View>
				</View>

			<View style={styles.rowRight}>
				{rightMeta ? (
					<BAIText variant='body' style={{ color: onSurface }} numberOfLines={1}>
						{rightMeta}
					</BAIText>
				) : null}
				<MaterialCommunityIcons
					name={selected ? "check-circle" : "checkbox-blank-circle-outline"}
					size={36}
					color={selected ? primary : onSurfaceVariant}
				/>
			</View>
		</Pressable>
	);
}

async function listAllProductsAndServices() {
	const all: InventoryProduct[] = [];
	let cursor: string | undefined;

	for (let page = 0; page < 20; page += 1) {
		const res = await inventoryApi.listProducts({
			includeArchived: false,
			limit: 100,
			cursor,
		});
		all.push(...(res.items ?? []));
		if (!res.nextCursor) break;
		cursor = res.nextCursor;
	}

	return all;
}

export function ModifierGroupApplySetPickerScreen({ mode }: Props) {
	const router = useRouter();
	const params = useLocalSearchParams<{ draftId?: string }>();
	const draftId = String(params.draftId ?? "").trim();
	const backRoute =
		mode === "settings" ? "/(app)/(tabs)/settings/modifiers/create" : "/(app)/(tabs)/inventory/modifiers/create";

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	useEffect(() => {
		if (!draftId) return;
		const draft = getModifierGroupDraft(draftId);
		if (!draft) return;
		setSelectedIds(Array.isArray(draft.appliedProductIds) ? draft.appliedProductIds : []);
	}, [draftId]);

	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace({ pathname: backRoute as any, params: { draftId } as any });
	}, [backRoute, draftId, router]);

	const headerOptions = useAppHeader("detail", { title: "Apply Set", onBack });

	const productsQuery = useQuery({
		queryKey: [...inventoryKeys.productsRoot(), "apply-set", "all-active"],
		queryFn: listAllProductsAndServices,
		staleTime: 30_000,
	});

	const rows = useMemo(() => {
		const next = [...(productsQuery.data ?? [])];
		next.sort((a, b) => a.name.localeCompare(b.name));
		return next;
	}, [productsQuery.data]);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const onToggle = useCallback(
		(id: string) => {
			if (!draftId) return;
			setSelectedIds((prev) => {
				const exists = prev.includes(id);
				const next = exists ? prev.filter((value) => value !== id) : [...prev, id];
				const draft = getModifierGroupDraft(draftId);
				if (draft) {
					upsertModifierGroupDraft(draftId, { appliedProductIds: next });
				}
				return next;
			});
		},
		[draftId],
	);

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface bordered padded={false} style={styles.card}>
						{productsQuery.isLoading ? (
							<View style={styles.centerState}>
								<BAIActivityIndicator size='small' />
								<BAIText variant='body' muted>
									Loading items and services...
								</BAIText>
							</View>
						) : productsQuery.isError ? (
							<View style={styles.centerState}>
								<BAIText variant='body'>Could not load items and services.</BAIText>
							</View>
						) : (
							<FlatList
								data={rows}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => (
									<ProductRow item={item} selected={selectedSet.has(item.id)} onToggle={onToggle} />
								)}
								ItemSeparatorComponent={null}
								contentContainerStyle={styles.listContent}
							/>
						)}
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 12,
		paddingBottom: 12,
		paddingTop: 0,
	},
	card: {
		flex: 1,
		borderRadius: 16,
		overflow: "hidden",
	},
	centerState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		padding: 16,
	},
	listContent: {
		paddingBottom: 8,
	},
	row: {
		minHeight: 74,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	rowLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		minWidth: 0,
		gap: 10,
	},
	thumb: {
		width: 46,
		height: 46,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
	nameWrap: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	rowRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		maxWidth: "42%",
	},
});
