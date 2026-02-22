// BizAssist_mobile
// path: src/modules/options/screens/OptionSetLedgerScreen.tsx

import { useCallback, useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIGroupTabs, type BAIGroupTab } from "@/components/ui/BAIGroupTabs";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import {
	appendReturnToQuery,
	buildInventoryOptionDetailsRoute,
	buildSettingsOptionDetailsRoute,
	INVENTORY_OPTIONS_CREATE_ROUTE,
	normalizeReturnTo,
	SETTINGS_OPTIONS_CREATE_ROUTE,
} from "@/modules/options/options.navigation";
import { useOptionSetsList } from "@/modules/options/options.queries";
import type { OptionSet } from "@/modules/options/options.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeSearchInput } from "@/shared/validation/sanitize";

const FILTER_TABS: BAIGroupTab<"active" | "archived" | "all">[] = [
	{ label: "Active", value: "active" },
	{ label: "Archived", value: "archived" },
	{ label: "All", value: "all" },
];

type OptionSetLedgerMode = "settings" | "inventory";

type OptionSetLedgerLayout = "phone" | "tablet";

const SETTINGS_ROOT_ROUTE = "/(app)/(tabs)/settings" as const;
const INVENTORY_ROOT_ROUTE = "/(app)/(tabs)/inventory" as const;
const ROOT_ROUTE_BY_MODE: Record<OptionSetLedgerMode, string> = {
	settings: SETTINGS_ROOT_ROUTE,
	inventory: INVENTORY_ROOT_ROUTE,
};

function normalizeRoutePath(route: string | null | undefined): string {
	return String(route ?? "").split("?")[0].split("#")[0].trim();
}

function optionCountLabel(item: OptionSet): string {
	const count = item.values.filter((value) => value.isActive !== false).length;
	return `${count} option${count === 1 ? "" : "s"}`;
}

function OptionSetRow({
	item,
	onPress,
	disabled,
}: {
	item: OptionSet;
	onPress: () => void;
	disabled: boolean;
}) {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor,
			backgroundColor: surfaceAlt,
		}),
		[borderColor, surfaceAlt],
	);

	return (
		<Pressable onPress={onPress} disabled={disabled}>
			{({ pressed }) => (
				<BAISurface
					style={[
						styles.row,
						surfaceInteractive,
						pressed && !disabled ? styles.rowPressed : undefined,
						disabled ? styles.rowDisabled : undefined,
					]}
					padded
					bordered
				>
					<View style={styles.rowLeft}>
						<BAIText variant='subtitle' numberOfLines={1}>
							{item.name}
						</BAIText>
						<BAIText variant='caption' muted numberOfLines={1}>
							{optionCountLabel(item)}
						</BAIText>
					</View>
					<MaterialCommunityIcons
						name='chevron-right'
						size={24}
						color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
					/>
				</BAISurface>
			)}
		</Pressable>
	);
}

export function OptionSetLedgerScreen({ layout, mode = "settings" }: { layout: OptionSetLedgerLayout; mode?: OptionSetLedgerMode }) {
	const router = useRouter();
	const pathname = usePathname();
	const theme = useTheme();
	const params = useLocalSearchParams<{ returnTo?: string }>();
	const { busy } = useAppBusy();

	const returnTo = useMemo(() => normalizeReturnTo(params.returnTo), [params.returnTo]);
	const currentPath = useMemo(() => normalizeRoutePath(pathname), [pathname]);

	const [qText, setQText] = useState("");
	const [filter, setFilter] = useState<"active" | "archived" | "all">("active");
	const q = qText.trim();
	const hasSearch = q.length > 0;

	const query = useOptionSetsList({ q: q || undefined, includeArchived: true, limit: 250 });

	const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
	const activeItems = useMemo(() => items.filter((item) => item.isActive), [items]);
	const archivedItems = useMemo(() => items.filter((item) => !item.isActive), [items]);
	const filteredItems = useMemo(() => {
		if (filter === "active") return activeItems;
		if (filter === "archived") return archivedItems;
		return items;
	}, [activeItems, archivedItems, filter, items]);

	const tabs = useMemo(
		() =>
			FILTER_TABS.map((tab) => ({
				...tab,
				count: tab.value === "active" ? activeItems.length : tab.value === "archived" ? archivedItems.length : items.length,
			})),
		[activeItems.length, archivedItems.length, items.length],
	);

	const isUiDisabled = !!busy?.isBusy;
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const contentMaxWidth = layout === "tablet" ? 1100 : undefined;

	const rootRoute = ROOT_ROUTE_BY_MODE[mode];

	const resolveSafeRoute = useCallback(
		(candidate: string, fallback: string): string => {
			const candidatePath = normalizeRoutePath(candidate);
			if (!candidatePath || candidatePath === currentPath) return fallback;
			return candidate;
		},
		[currentPath],
	);

	const onCancel = useCallback(() => {
		if (isUiDisabled) return;
		const exitRoute = resolveSafeRoute(returnTo ?? rootRoute, rootRoute);
		router.replace(exitRoute as any);
	}, [isUiDisabled, resolveSafeRoute, returnTo, rootRoute, router]);

	const onBack = useCallback(() => {
		if (isUiDisabled) return;
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		onCancel();
	}, [isUiDisabled, onCancel, router]);

	const onCreate = useCallback(() => {
		if (isUiDisabled) return;
		const base = mode === "settings" ? SETTINGS_OPTIONS_CREATE_ROUTE : INVENTORY_OPTIONS_CREATE_ROUTE;
		router.push(appendReturnToQuery(base, returnTo) as any);
	}, [isUiDisabled, mode, returnTo, router]);

	const onPressRow = useCallback(
		(item: OptionSet) => {
			if (isUiDisabled) return;
			const route =
				mode === "settings"
					? buildSettingsOptionDetailsRoute(item.id, returnTo)
					: buildInventoryOptionDetailsRoute(item.id, returnTo);
			router.push(route as any);
		},
		[isUiDisabled, mode, returnTo, router],
	);

	const appHeaderOptions = useAppHeader("detail", { title: "Options", disabled: isUiDisabled, onBack });
	const inventoryHeaderOptions = useInventoryHeader("detail", {
		title: "Options",
		disabled: isUiDisabled,
		onBack,
	});
	const headerOptions = mode === "settings" ? appHeaderOptions : inventoryHeaderOptions;

	const emptyTitle = filter === "archived" ? "No archived option sets." : "No option sets yet.";
	const searchEmptyTitle = `No option sets match: ${q}.`;

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
					<View style={styles.screen}>
						<View style={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}>
							<BAISurface style={[styles.card, { borderColor }]} padded bordered>
								<View style={styles.headerRow}>
									<BAIText variant='title'>Manage Options</BAIText>
								</View>

								<View style={styles.actionsRow}>
									<BAIButton
										variant='outline'
										intent='neutral'
										onPress={onCancel}
										disabled={isUiDisabled}
										shape='pill'
										widthPreset='standard'
										style={styles.actionBtn}
									>
										Cancel
									</BAIButton>
									<BAIButton
										variant='solid'
										intent='primary'
										onPress={onCreate}
										disabled={isUiDisabled}
										shape='pill'
										widthPreset='standard'
										style={styles.actionBtn}
									>
										Create
									</BAIButton>
								</View>

								<BAISearchBar
									value={qText}
									onChangeText={(value) => {
										const cleaned = sanitizeSearchInput(value);
										setQText(cleaned.length > FIELD_LIMITS.search ? cleaned.slice(0, FIELD_LIMITS.search) : cleaned);
									}}
									placeholder='Search options'
									onClear={hasSearch ? () => setQText("") : undefined}
									disabled={isUiDisabled}
								/>

								<BAIGroupTabs<"active" | "archived" | "all">
									tabs={tabs}
									value={filter}
									onChange={setFilter}
									disabled={isUiDisabled}
								/>

								{query.isLoading ? (
									<View style={styles.stateWrap}>
										<BAIActivityIndicator size='large' tone='primary' />
										<BAIText variant='subtitle'>Loading options…</BAIText>
									</View>
								) : query.isError ? (
									<View style={styles.stateWrap}>
										<BAIText variant='subtitle'>Could not load options.</BAIText>
										<BAIRetryButton variant='outline' onPress={() => query.refetch()} disabled={isUiDisabled}>
											Retry
										</BAIRetryButton>
									</View>
								) : filteredItems.length === 0 ? (
									<View style={styles.stateWrap}>
										<BAIText variant='subtitle'>{hasSearch ? searchEmptyTitle : emptyTitle}</BAIText>
										<BAIText variant='caption' muted>
											Create an option set to use it in Create Item.
										</BAIText>
									</View>
								) : (
									<FlatList
										data={filteredItems}
										keyExtractor={(item) => item.id}
										renderItem={({ item }) => (
											<OptionSetRow item={item} onPress={() => onPressRow(item)} disabled={isUiDisabled} />
										)}
										keyboardShouldPersistTaps='handled'
										showsVerticalScrollIndicator={false}
										contentContainerStyle={styles.listContent}
										ItemSeparatorComponent={() => <View style={styles.itemGap} />}
									/>
								)}
							</BAISurface>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 14,
	},
	content: {
		flex: 1,
		width: "100%",
		alignSelf: "center",
	},
	card: {
		flex: 1,
		borderRadius: 18,
		gap: 10,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	actionsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	actionBtn: {
		flex: 1,
	},
	row: {
		borderWidth: 1,
		borderRadius: 14,
	},
	rowPressed: {
		opacity: 0.88,
	},
	rowDisabled: {
		opacity: 0.6,
	},
	rowLeft: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	listContent: {
		paddingBottom: 8,
	},
	itemGap: {
		height: 8,
	},
	stateWrap: {
		paddingVertical: 24,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
});
