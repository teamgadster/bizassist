import { useCallback, useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIGroupTabs, type BAIGroupTab } from "@/components/ui/BAIGroupTabs";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeSearchInput } from "@/shared/validation/sanitize";
import { useAttributesList } from "../attributes.queries";

type Filter = "active" | "archived";

export function AttributesLedgerScreen({ mode = "inventory" }: { mode?: "inventory" | "settings" }) {
	const router = useRouter();
	const theme = useTheme();
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<Filter>("active");
	const query = useAttributesList(true);

	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/items-services/attributes" : "/(app)/(tabs)/inventory/attributes";
	const backRoute = mode === "settings" ? "/(app)/(tabs)/settings/items-services" : "/(app)/(tabs)/inventory";

	const searched = useMemo(() => {
		const q = search.trim().toLowerCase();
		const items = query.data ?? [];
		if (!q) return items;
		return items.filter((item) => item.name.toLowerCase().includes(q));
	}, [query.data, search]);
	const active = useMemo(() => searched.filter((item) => !item.isArchived), [searched]);
	const archived = useMemo(() => searched.filter((item) => item.isArchived), [searched]);
	const items = filter === "active" ? active : archived;

	const tabs = useMemo<readonly BAIGroupTab<Filter>[]>(
		() => [
			{ label: "Active", value: "active", count: active.length },
			{ label: "Archived", value: "archived", count: archived.length },
		],
		[active.length, archived.length],
	);

	const onBack = useCallback(() => {
		router.replace(backRoute as any);
	}, [backRoute, router]);
	const onCreate = useCallback(() => {
		router.push(`${baseRoute}/create` as any);
	}, [baseRoute, router]);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom style={styles.root}>
				<BAIHeader
					title='Attributes'
					variant='back'
					onLeftPress={onBack}
					onRightPress={onCreate}
					rightSlot={() => (
						<View style={[styles.addCircle, { backgroundColor: theme.colors.primary }]}>
							<MaterialCommunityIcons name='plus' size={30} color={theme.colors.onPrimary} />
						</View>
					)}
				/>
				<TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
					<View style={styles.wrap}>
						<BAISurface style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} bordered>
							<BAISearchBar
								value={search}
								onChangeText={(value) => {
									const cleaned = sanitizeSearchInput(value);
									setSearch(cleaned.length > FIELD_LIMITS.search ? cleaned.slice(0, FIELD_LIMITS.search) : cleaned);
								}}
								placeholder='Search attributes...'
								maxLength={FIELD_LIMITS.search}
							/>
							<BAIGroupTabs tabs={tabs} value={filter} onChange={setFilter} />
							<View style={styles.listWrap}>
								{query.isLoading ? (
									<View style={styles.stateWrap}>
										<BAIText muted>Loading attributes...</BAIText>
									</View>
								) : query.isError ? (
									<View style={styles.stateWrap}>
										<BAIRetryButton compact onPress={() => query.refetch()}>
											Retry
										</BAIRetryButton>
									</View>
								) : items.length === 0 ? (
									<View style={styles.stateWrap}>
										<BAIText muted>
											{filter === "active" ? "No active attributes." : "No archived attributes."}
										</BAIText>
									</View>
								) : (
									<FlatList
										data={items}
										keyExtractor={(item) => item.id}
										contentContainerStyle={styles.listContent}
										renderItem={({ item }) => (
											<BAISurface style={[styles.row, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} bordered>
												<Pressable
													style={styles.rowPress}
													onPress={() => router.push(`${baseRoute}/${encodeURIComponent(item.id)}/edit` as any)}
												>
													<View style={styles.rowLeft}>
														<BAIText variant='subtitle' numberOfLines={1}>
															{item.name}
														</BAIText>
														<BAIText variant='caption' muted numberOfLines={1}>
															{item.selectionType} • {item.options.filter((option) => !option.isArchived).length} options
														</BAIText>
													</View>
													<MaterialCommunityIcons
														name='chevron-right'
														size={22}
														color={theme.colors.onSurfaceVariant}
													/>
												</Pressable>
											</BAISurface>
										)}
									/>
								)}
							</View>
						</BAISurface>
					</View>
				</TouchableWithoutFeedback>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 8 },
	card: { flex: 1, borderRadius: 18, gap: 8 },
	listWrap: { flex: 1, minHeight: 0 },
	stateWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	listContent: { gap: 8, paddingBottom: 8 },
	row: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
	rowPress: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	rowLeft: { flex: 1, marginRight: 8 },
	addCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
