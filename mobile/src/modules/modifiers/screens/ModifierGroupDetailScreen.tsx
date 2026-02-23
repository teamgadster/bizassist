import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Switch, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { formatCompactNumber } from "@/lib/locale/businessLocale";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import { formatMoney } from "@/shared/money/money.format";

function formatMinor(minor: string): string {
	const value = Number.parseInt(String(minor || "0"), 10);
	if (!Number.isFinite(value)) return "0.00";
	return (value / 100).toFixed(2);
}

export function ModifierGroupDetailScreen({ mode }: { mode: "settings" | "inventory" }) {
	const router = useRouter();
	const tabBarHeight = useBottomTabBarHeight();
	const theme = useTheme();
	const params = useLocalSearchParams<{ id?: string }>();
	const groupId = String(params.id ?? "").trim();
	const { countryCode, currencyCode } = useActiveBusinessMeta();
	const { withBusy } = useAppBusy();
	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";

	const query = useQuery({
		queryKey: ["modifiers", "group", groupId],
		queryFn: () => modifiersApi.getGroup(groupId),
		enabled: !!groupId,
	});

	const group = query.data;

	const onToggleSoldOut = useCallback(
		(optionId: string, isSoldOut: boolean) => {
			withBusy("Updating option...", async () => {
				await modifiersApi.updateOption(optionId, { isSoldOut: !isSoldOut });
				await query.refetch();
			});
		},
		[query, withBusy],
	);

	const onRestoreGroup = useCallback(() => {
		if (!group) return;
		router.push(`${baseRoute}/${encodeURIComponent(group.id)}/restore` as any);
	}, [baseRoute, group, router]);

	const onArchiveGroup = useCallback(() => {
		if (!group || group.isArchived) return;
		router.push(`${baseRoute}/${encodeURIComponent(group.id)}/archive` as any);
	}, [baseRoute, group, router]);

	const header = useAppHeader("detail", {
		title: "Modifier Details",
		onBack: () => router.replace(baseRoute as any),
	});
	const inventoryHeader = useInventoryHeader("detail", {
		title: "Modifier Details",
		onBack: () => router.replace(baseRoute as any),
	});

	return (
		<>
			<Stack.Screen options={mode === "settings" ? header : inventoryHeader} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<View style={[styles.wrap, { paddingBottom: tabBarHeight + 8 }]}>
					<View style={styles.content}>
						<BAISurface
							bordered
							padded
							style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
						>
							{query.isLoading ? (
								<View style={styles.stateWrap}>
									<BAIText variant='body'>Loading modifier set...</BAIText>
								</View>
							) : query.isError || !group ? (
								<View style={styles.stateWrap}>
									<BAIRetryButton onPress={() => query.refetch()}>Retry</BAIRetryButton>
								</View>
							) : (
								<>
									<View style={styles.header}>
										<BAIText variant='title'>{group.name}</BAIText>
									</View>
									<View style={styles.actionsRow}>
										<BAIButton
											variant='outline'
											intent='neutral'
											shape='pill'
											widthPreset='standard'
											onPress={() => router.replace(baseRoute as any)}
											style={styles.actionButton}
										>
											Back
										</BAIButton>
										<BAIButton
											variant='outline'
											shape='pill'
											widthPreset='standard'
											onPress={() => router.push(`${baseRoute}/${group.id}/edit` as any)}
											style={styles.actionButton}
										>
											Edit
										</BAIButton>
									</View>

									<BAISurface
										bordered
										style={[styles.summary, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
									>
										<BAIText variant='caption' muted>
											{formatCompactNumber(group.options.length, countryCode)} modifier
											{group.options.length === 1 ? "" : "s"}
										</BAIText>
										<BAIButton
											variant='outline'
											shape='pill'
											onPress={group.isArchived ? onRestoreGroup : onArchiveGroup}
											intent={group.isArchived ? "primary" : "danger"}
										>
											{group.isArchived ? "Restore Modifier Set" : "Archive Modifier Set"}
										</BAIButton>
									</BAISurface>

									<FlatList
										data={group.options}
										keyExtractor={(item) => item.id}
										ListHeaderComponent={
											<View style={styles.tableHead}>
												<BAIText variant='subtitle'>Modifiers</BAIText>
												<BAIText variant='subtitle'>Availability</BAIText>
											</View>
										}
										renderItem={({ item }) => (
											<BAISurface
												variant='interactive'
												style={[styles.optionRow, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
											>
												<View style={styles.optionTop}>
													<BAIText variant='subtitle'>{item.name}</BAIText>
													<BAIText variant='subtitle' muted>
														{formatMoney({ amount: formatMinor(item.priceDeltaMinor), currencyCode })}
													</BAIText>
												</View>
												<View style={styles.optionBottom}>
													{item.isSoldOut ? (
														<View style={[styles.statusChip, { borderColor: theme.colors.error }]}>
															<BAIText variant='caption' style={{ color: theme.colors.error }}>
																Sold out
															</BAIText>
														</View>
													) : (
														<BAIText variant='subtitle'>Available</BAIText>
													)}
													<Switch
														value={!item.isSoldOut}
														disabled={group.isArchived}
														onValueChange={() => onToggleSoldOut(item.id, item.isSoldOut)}
													/>
												</View>
											</BAISurface>
										)}
										contentContainerStyle={styles.listContent}
										keyboardShouldPersistTaps='handled'
										showsVerticalScrollIndicator={false}
									/>
								</>
							)}
						</BAISurface>
					</View>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 12 },
	content: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center" },
	card: { flex: 1, borderRadius: 18, gap: 10 },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
	actionsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	actionButton: { flex: 1 },
	stateWrap: { paddingTop: 8, alignItems: "flex-start" },
	summary: { borderRadius: 12, padding: 12, gap: 8 },
	listContent: { gap: 8, paddingBottom: 14 },
	tableHead: {
		paddingTop: 4,
		paddingBottom: 10,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	optionRow: {
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: 12,
		paddingHorizontal: 10,
		gap: 8,
	},
	optionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	optionBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	statusChip: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
});
