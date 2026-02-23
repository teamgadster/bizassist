// BizAssist_mobile
// path: app/(app)/(tabs)/settings/items.tsx

import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppHeader } from "@/modules/navigation/useAppHeader";

type ItemSettingsRow = {
	key: string;
	title: string;
	subtitle?: string;
	iconFamily?: "material" | "ion";
	icon: keyof typeof MaterialCommunityIcons.glyphMap | keyof typeof Ionicons.glyphMap;
	iconSize?: number;
	onPress?: () => void;
	disabled?: boolean;
};

function ItemRow({
	item,
	borderColor,
	onSurface,
	onSurfaceVariant,
	iconTint,
}: {
	item: ItemSettingsRow;
	borderColor: string;
	onSurface: string;
	onSurfaceVariant: string;
	iconTint: string;
}) {
	return (
		<Pressable
			onPress={item.onPress}
			disabled={!item.onPress || item.disabled}
			style={({ pressed }) => [
				styles.row,
				{ borderBottomColor: borderColor, opacity: item.disabled ? 0.55 : 1 },
				pressed && item.onPress ? styles.rowPressed : null,
			]}
		>
			<View style={styles.rowLeft}>
				<View style={[styles.iconCircle, { borderColor }]}>
					{item.iconFamily === "ion" ? (
						<Ionicons
							name={item.icon as keyof typeof Ionicons.glyphMap}
							size={item.iconSize ?? 20}
							color={iconTint}
						/>
					) : (
						<MaterialCommunityIcons
							name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
							size={item.iconSize ?? 20}
							color={iconTint}
						/>
					)}
				</View>
				<View style={styles.rowTextWrap}>
					<BAIText variant='body' style={{ color: onSurface }}>
						{item.title}
					</BAIText>
					{item.subtitle ? (
						<BAIText variant='caption' style={{ color: onSurfaceVariant }}>
							{item.subtitle}
						</BAIText>
					) : null}
				</View>
			</View>
			<View style={styles.rowRight}>
				<MaterialCommunityIcons name='chevron-right' size={30} color={iconTint} />
			</View>
		</Pressable>
	);
}

export default function SettingsItemsScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { width } = useWindowDimensions();

	const isTablet = width >= 768;
	const railMaxWidth = 560;

	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace("/(app)/(tabs)/settings" as any);
	}, [router]);
	const headerOptions = useAppHeader("detail", { title: "Items", onBack });
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const onSurface = theme.colors.onSurface;
	const onSurfaceVariant = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;
	const iconTint = onSurfaceVariant;

	const goToInventoryItems = useCallback(() => {
		router.push({
			pathname: "/(app)/(tabs)/settings/items-services" as any,
			params: { type: "ITEMS" } as any,
		});
	}, [router]);

	const goToInventoryServices = useCallback(() => {
		router.push({
			pathname: "/(app)/(tabs)/settings/items-services" as any,
			params: { type: "SERVICES" } as any,
		});
	}, [router]);

	const rows: ItemSettingsRow[] = useMemo(
		() => [
			{
				key: "allItems",
				title: "All Items",
				subtitle: "Browse and manage all item products",
				icon: "package-variant-closed",
				iconSize: 21,
				onPress: goToInventoryItems,
			},
			{
				key: "allServices",
				title: "All Services",
				subtitle: "Browse and manage all service products",
				iconFamily: "ion",
				icon: "briefcase-outline",
				onPress: goToInventoryServices,
			},
			{
				key: "categories",
				title: "Categories",
				subtitle: "Organize items and services",
				iconFamily: "ion",
				icon: "layers-outline",
				onPress: () => router.push("/(app)/(tabs)/settings/categories" as any),
			},
			{
				key: "discounts",
				title: "Discounts",
				subtitle: "Configure discount rules",
				iconFamily: "ion",
				icon: "pricetag-outline",
				onPress: () => router.push("/(app)/(tabs)/settings/discounts" as any),
			},
			{
				key: "modifiers",
				title: "Modifiers",
				subtitle: "Set default item modifiers",
				icon: "view-grid-outline",
				onPress: () => router.push("/(app)/(tabs)/settings/modifiers" as any),
			},
			{
				key: "units",
				title: "Units",
				subtitle: "Manage units and measurements",
				icon: "ruler-square",
				onPress: () => router.push("/(app)/(tabs)/settings/units" as any),
			},
		],
		[goToInventoryItems, goToInventoryServices, router],
	);

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<View style={styles.centerWrap}>
						<View style={[styles.column, isTablet ? { maxWidth: railMaxWidth } : null]}>
							<BAIText variant='title' style={styles.title}>
								Items
							</BAIText>

							<BAISurface style={[styles.listCard, { borderColor }]} padded={false} bordered>
								{rows.map((item) => (
									<ItemRow
										key={item.key}
										item={item}
										borderColor={borderColor}
										onSurface={onSurface}
										onSurfaceVariant={onSurfaceVariant}
										iconTint={iconTint}
									/>
								))}
							</BAISurface>
						</View>
					</View>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		padding: 12,
	},
	centerWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
	},
	column: {
		width: "100%",
		gap: 12,
	},
	title: { marginTop: 2 },
	listCard: {
		borderRadius: 18,
		overflow: "hidden",
	},
	row: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	rowPressed: { opacity: 0.85 },
	rowLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
		paddingRight: 10,
	},
	iconCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	rowTextWrap: { flex: 1, minWidth: 0, gap: 2 },
	rowRight: { alignItems: "center", justifyContent: "center" },
});
