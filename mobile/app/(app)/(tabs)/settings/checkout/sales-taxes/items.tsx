import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Switch, useTheme } from "react-native-paper";

import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { businessApi } from "@/modules/business/business.api";
import { resolveActiveBusinessIdFromContext as resolveActiveBusinessId } from "@/modules/business/business.context";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import type { InventoryProduct } from "@/modules/inventory/inventory.types";
import { useSalesTaxDraft } from "@/modules/taxes/taxes.queries";

const SALES_TAX_ITEMS_QUERY_KEY = (businessId: string) => ["sales-taxes", "items-catalog", businessId] as const;
const SALES_TAX_CREATE_ROUTE = "/(app)/(tabs)/settings/checkout/sales-taxes/create" as const;
const SALES_TAX_CATALOG_LIMIT = 100;

function filterItemsBySearch(items: InventoryProduct[], search: string): InventoryProduct[] {
	const query = search.trim().toLowerCase();
	if (!query) return items;
	return items.filter((item) => item.name.toLowerCase().includes(query));
}

function toggleId(currentIds: string[], id: string): string[] {
	const nextSet = new Set(currentIds);
	if (nextSet.has(id)) nextSet.delete(id);
	else nextSet.add(id);
	return Array.from(nextSet);
}

function Row({
	item,
	checked,
	borderColor,
	onToggle,
}: {
	item: InventoryProduct;
	checked: boolean;
	borderColor: string;
	onToggle: () => void;
}) {
	return (
		<Pressable
			onPress={onToggle}
			style={({ pressed }) => [styles.itemRow, { borderBottomColor: borderColor }, pressed ? styles.rowPressed : null]}
		>
			<BAIText variant='subtitle' style={styles.itemName}>
				{item.name}
			</BAIText>
			<Switch value={checked} onValueChange={onToggle} />
		</Pressable>
	);
}

export default function SalesTaxItemsScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { draft, setDraft } = useSalesTaxDraft();
	const [search, setSearch] = useState("");
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const textMutedColor = theme.colors.onSurfaceVariant;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor,
			backgroundColor: surfaceAlt,
		}),
		[borderColor, surfaceAlt],
	);

	const activeBusinessQuery = useQuery({
		queryKey: ["business", "active"],
		queryFn: () => businessApi.getActiveBusiness(),
		staleTime: 60_000,
	});
	const activeBusinessId = useMemo(() => resolveActiveBusinessId(activeBusinessQuery.data), [activeBusinessQuery.data]);

	const itemsQuery = useQuery({
		queryKey: SALES_TAX_ITEMS_QUERY_KEY(activeBusinessId || "no-business"),
		queryFn: () =>
			inventoryApi.listProducts({ type: "PHYSICAL", includeArchived: false, limit: SALES_TAX_CATALOG_LIMIT }),
		enabled: !!activeBusinessId,
		staleTime: 60_000,
	});

	const allItems = useMemo(
		() => (itemsQuery.data?.items ?? []).filter((item) => item.isActive),
		[itemsQuery.data?.items],
	);
	const visibleItems = useMemo(() => filterItemsBySearch(allItems, search), [allItems, search]);

	const selectedSet = useMemo(() => new Set(draft.itemIds), [draft.itemIds]);
	const totalVisibleCount = visibleItems.length;
	const countLabel =
		totalVisibleCount > 0 ? `${totalVisibleCount} ${totalVisibleCount === 1 ? "item" : "items"}` : "No items";

	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace(SALES_TAX_CREATE_ROUTE as any);
	}, [router]);

	const onDone = onBack;

	const onTaxAll = useCallback(() => {
		setDraft((current) => ({ ...current, itemIds: allItems.map((item) => item.id) }));
	}, [allItems, setDraft]);

	const onExemptAll = useCallback(() => {
		setDraft((current) => ({ ...current, itemIds: [] }));
	}, [setDraft]);

	const onToggleItem = useCallback(
		(itemId: string) => {
			setDraft((current) => ({ ...current, itemIds: toggleId(current.itemIds, itemId) }));
		},
		[setDraft],
	);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<BAIHeader
					title='Items'
					variant='back'
					onLeftPress={onBack}
					onRightPress={onDone}
					rightSlot={({ disabled }) => (
						<View
							style={[
								styles.headerActionPill,
								{ backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary },
							]}
						>
							<BAIText
								variant='body'
								style={[
									styles.headerActionText,
									{ color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary },
								]}
							>
								Done
							</BAIText>
						</View>
					)}
				/>

				<View style={styles.screen}>
					<BAISurface bordered padded style={[styles.mainCard, surfaceInteractive]}>
						<View style={styles.searchRow}>
							<View style={styles.searchWrap}>
								<BAISearchBar value={search} onChangeText={setSearch} placeholder='Search' />
							</View>
							<Pressable style={styles.filterIcon}>
								<MaterialCommunityIcons name='tune-variant' size={24} color={theme.colors.onSurfaceVariant} />
							</Pressable>
						</View>

						<BAIText variant='body' style={[styles.countLabel, { color: theme.colors.onSurfaceVariant }]}>
							{countLabel}
						</BAIText>

						<View style={styles.bulkActionsRow}>
							<BAIButton
								variant='solid'
								intent='primary'
								onPress={onTaxAll}
								shape='pill'
								style={styles.bulkActionButton}
							>
								Tax all
							</BAIButton>
							<BAIButton
								variant='solid'
								intent='primary'
								onPress={onExemptAll}
								shape='pill'
								style={styles.bulkActionButton}
							>
								Exempt all
							</BAIButton>
						</View>

						{itemsQuery.isLoading || activeBusinessQuery.isLoading ? (
							<BAIText variant='body' style={{ color: textMutedColor }}>
								Loading items...
							</BAIText>
						) : activeBusinessQuery.isError || !activeBusinessId ? (
							<View style={styles.feedbackWrap}>
								<BAIText variant='body' style={{ color: textMutedColor }}>
									Unable to resolve your active business.
								</BAIText>
								<BAIButton
									variant='soft'
									intent='neutral'
									shape='pill'
									widthPreset='standard'
									style={styles.retryButton}
									onPress={() => {
										activeBusinessQuery.refetch();
									}}
								>
									Retry
								</BAIButton>
							</View>
						) : itemsQuery.isError ? (
							<View style={styles.feedbackWrap}>
								<BAIText variant='body' style={{ color: textMutedColor }}>
									Couldn&apos;t load items right now.
								</BAIText>
								<BAIButton
									variant='soft'
									intent='neutral'
									shape='pill'
									widthPreset='standard'
									style={styles.retryButton}
									onPress={() => {
										itemsQuery.refetch();
									}}
								>
									Retry
								</BAIButton>
							</View>
						) : visibleItems.length === 0 ? (
							<BAIText variant='body' style={{ color: textMutedColor }}>
								No items found.
							</BAIText>
						) : (
							<FlatList
								data={visibleItems}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => (
									<Row
										item={item}
										checked={selectedSet.has(item.id)}
										borderColor={borderColor}
										onToggle={() => onToggleItem(item.id)}
									/>
								)}
								contentContainerStyle={styles.listContent}
								style={styles.list}
								keyboardShouldPersistTaps='handled'
								showsVerticalScrollIndicator={false}
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
		gap: 10,
		paddingTop: 0,
		padding: 12,
	},
	mainCard: {
		flex: 1,
		borderRadius: 16,
		gap: 10,
	},
	headerActionPill: {
		width: 90,
		height: 40,
		paddingHorizontal: 16,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	headerActionText: {
		fontSize: 16,
		fontWeight: "600",
	},
	searchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	searchWrap: {
		flex: 1,
	},
	filterIcon: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
	},
	countLabel: {
		textAlign: "right",
	},
	bulkActionsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	bulkActionButton: {
		flex: 1,
	},
	list: {
		flex: 1,
		minHeight: 0,
	},
	listContent: {
		paddingBottom: 24,
	},
	feedbackWrap: {
		gap: 8,
	},
	retryButton: {
		alignSelf: "flex-start",
	},
	itemRow: {
		paddingVertical: 14,
		paddingHorizontal: 2,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	itemName: {
		flex: 1,
	},
	rowPressed: {
		opacity: 0.85,
	},
});
