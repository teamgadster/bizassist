import { useCallback, useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { formatCompactNumber } from "@/lib/locale/businessLocale";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import type { ModifierGroup } from "@/modules/modifiers/modifiers.types";
import { BAITextInput } from "@/components/ui/BAITextInput";

const modifierGroupsKey = ["modifiers", "groups", "settings"] as const;

function Row({
	item,
	onOpen,
	countryCode,
}: {
	item: ModifierGroup;
	onOpen: (item: ModifierGroup) => void;
	countryCode?: string | null;
}) {
	const theme = useTheme();
	const totalOptionsLabel = `${formatCompactNumber(item.options.length, countryCode)} modifier${item.options.length === 1 ? "" : "s"}`;
	const availableLabel = `${formatCompactNumber(item.availableOptionsCount, countryCode)} available`;
	const soldOutLabel = `${formatCompactNumber(item.soldOutOptionsCount, countryCode)} sold out`;
	return (
		<Pressable onPress={() => onOpen(item)}>
			<BAISurface variant='interactive' style={styles.row}>
				<View style={styles.rowTop}>
					<View style={{ flex: 1 }}>
						<BAIText variant='subtitle'>{item.name}</BAIText>
						<BAIText variant='caption' muted>
							{totalOptionsLabel}
						</BAIText>
					</View>
					<View style={styles.statsCol}>
						{item.isArchived ? (
							<View style={[styles.archivedChip, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}>
								<BAIText variant='caption' muted>
									Archived
								</BAIText>
							</View>
						) : null}
						<BAIText variant='subtitle'>{availableLabel}</BAIText>
						{item.soldOutOptionsCount > 0 ? (
							<BAIText variant='caption' style={{ color: theme.colors.error }}>
								{soldOutLabel}
							</BAIText>
						) : null}
					</View>
					<MaterialCommunityIcons
						name='chevron-right'
						size={24}
						color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
					/>
				</View>
			</BAISurface>
		</Pressable>
	);
}

export function ModifiersLedgerScreen({ layout, mode = "settings" }: { layout: "phone" | "tablet"; mode?: "settings" | "inventory" }) {
	const router = useRouter();
	const theme = useTheme();
	const { countryCode } = useActiveBusinessMeta();
	const [search, setSearch] = useState("");
	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";
	const backRoute = mode === "settings" ? "/(app)/(tabs)/settings" : "/(app)/(tabs)/inventory";

	const groupsQuery = useQuery({
		queryKey: modifierGroupsKey,
		queryFn: () => modifiersApi.listGroups(true),
		staleTime: 30_000,
	});

	const onOpen = useCallback(
		(item: ModifierGroup) => {
			router.push(`${baseRoute}/${encodeURIComponent(item.id)}` as any);
		},
		[baseRoute, router],
	);

	const items = useMemo(() => {
		const all = groupsQuery.data ?? [];
		const q = search.trim().toLowerCase();
		if (!q) return all;
		return all.filter((group) => group.name.toLowerCase().includes(q));
	}, [groupsQuery.data, search]);

	const dismissKeyboard = useCallback(() => {
		Keyboard.dismiss();
	}, []);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
					<View style={[styles.container, layout === "tablet" ? styles.tablet : null]}>
					<View style={styles.headRow}>
						<Pressable style={[styles.navBtn, { backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface }]} onPress={() => router.replace(backRoute as any)}>
							<MaterialCommunityIcons name='arrow-left' size={26} color={theme.colors.onSurface} />
						</Pressable>
						<BAIText variant='title'>Modifiers</BAIText>
						<Pressable style={[styles.navBtn, { backgroundColor: theme.colors.onBackground }]} onPress={() => router.push(`${baseRoute}/create` as any)}>
							<MaterialCommunityIcons name='plus' size={28} color={theme.colors.background} />
						</Pressable>
					</View>
					<BAITextInput
						placeholder='Search'
						value={search}
						onChangeText={setSearch}
					/>
					{groupsQuery.isLoading ? (
						<BAIText variant='body'>Loading modifiers...</BAIText>
					) : groupsQuery.isError ? (
						<BAIRetryButton compact onPress={() => groupsQuery.refetch()}>
							Retry
						</BAIRetryButton>
					) : items.length === 0 ? (
						<BAISurface bordered style={styles.emptyWrap}>
							<BAIText variant='body'>{search.trim() ? "No matching modifiers." : "No modifiers yet."}</BAIText>
							<BAIText variant='caption' muted>
								{search.trim() ? "Try a different search term." : "Create your first modifier group."}
							</BAIText>
						</BAISurface>
					) : (
						<FlatList
							data={items}
							keyExtractor={(item) => item.id}
							renderItem={({ item }) => <Row item={item} onOpen={onOpen} countryCode={countryCode} />}
							contentContainerStyle={styles.listContent}
						/>
					)}
					</View>
				</TouchableWithoutFeedback>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 12, gap: 8 },
	tablet: { maxWidth: 720, width: "100%", alignSelf: "center" },
	headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
	navBtn: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
	listContent: { gap: 2, paddingBottom: 8 },
	row: { paddingVertical: 14, borderRadius: 0, borderBottomWidth: StyleSheet.hairlineWidth },
	rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	statsCol: { alignItems: "flex-end", paddingRight: 4, minWidth: 120 },
	archivedChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 2 },
	emptyWrap: { padding: 14, borderRadius: 14, gap: 6 },
});
