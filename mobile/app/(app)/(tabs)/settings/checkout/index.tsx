import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppHeader } from "@/modules/navigation/useAppHeader";

type CheckoutRow = {
	key: string;
	title: string;
	value?: string;
	onPress?: () => void;
};

function Row({ item, borderColor, onSurface, onSurfaceVariant }: { item: CheckoutRow; borderColor: string; onSurface: string; onSurfaceVariant: string }) {
	return (
		<Pressable
			onPress={item.onPress}
			disabled={!item.onPress}
			style={({ pressed }) => [
				styles.row,
				{ borderBottomColor: borderColor, opacity: item.onPress ? 1 : 0.94 },
				pressed && item.onPress ? styles.rowPressed : null,
			]}
		>
			<BAIText variant='subtitle' style={{ color: onSurface }}>
				{item.title}
			</BAIText>
			<View style={styles.rowRight}>
				{item.value ? (
					<BAIText variant='body' style={{ color: onSurfaceVariant }}>
						{item.value}
					</BAIText>
				) : null}
				{item.onPress ? (
					<MaterialCommunityIcons name='chevron-right' size={24} color={onSurfaceVariant} />
				) : null}
			</View>
		</Pressable>
	);
}

export default function CheckoutSettingsScreen() {
	const router = useRouter();
	const theme = useTheme();

	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace("/(app)/(tabs)/settings" as any);
	}, [router]);

	const headerOptions = useAppHeader("detail", { title: "Checkout", onBack });

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const onSurface = theme.colors.onSurface;
	const onSurfaceVariant = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	const rows: CheckoutRow[] = [
		{ key: "quick", title: "Quick amounts", value: "Off" },
		{
			key: "taxes",
			title: "Sales taxes",
			onPress: () => router.push("/(app)/(tabs)/settings/checkout/sales-taxes" as any),
		},
		{ key: "tickets", title: "Order tickets", value: "Manual" },
		{ key: "payment", title: "Payment" },
		{ key: "crm", title: "Customer management", value: "On" },
	];

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface bordered padded={false} style={styles.card}>
						{rows.map((item) => (
							<Row
								key={item.key}
								item={item}
								borderColor={borderColor}
								onSurface={onSurface}
								onSurfaceVariant={onSurfaceVariant}
							/>
						))}
					</BAISurface>
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
	card: {
		borderRadius: 16,
		overflow: "hidden",
	},
	row: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	rowPressed: { opacity: 0.84 },
	rowRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
});
