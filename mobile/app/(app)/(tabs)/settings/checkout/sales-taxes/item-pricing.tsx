import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIRadioRow } from "@/components/ui/BAIRadioRow";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useSalesTaxDraft } from "@/modules/taxes/taxes.queries";

export default function SalesTaxItemPricingScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { draft, setDraft } = useSalesTaxDraft();

	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace("/(app)/(tabs)/settings/checkout/sales-taxes/create" as any);
	}, [router]);

	const headerOptions = useAppHeader("detail", { title: "Item pricing", onBack });

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface bordered padded style={styles.card}>
						<BAIRadioRow
							title='Add tax to item price'
							selected={draft.itemPricingMode === "ADD_TO_ITEM_PRICE"}
							onPress={() => setDraft((current) => ({ ...current, itemPricingMode: "ADD_TO_ITEM_PRICE" }))}
						/>
						<BAIRadioRow
							title='Include tax in item price'
							selected={draft.itemPricingMode === "INCLUDE_IN_ITEM_PRICE"}
							onPress={() => setDraft((current) => ({ ...current, itemPricingMode: "INCLUDE_IN_ITEM_PRICE" }))}
						/>
					</BAISurface>

					<BAIText variant='body' style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
						Item pricing allows you to determine whether the tax you are creating is added to the final item price or
						included in the item price.
					</BAIText>

					<BAIText variant='body' style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
						If it is included, the tax will appear in your reports, but your customers will not see the tax.
					</BAIText>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		padding: 12,
		gap: 14,
	},
	card: {
		gap: 10,
		borderRadius: 14,
	},
	helpText: {
		textAlign: "center",
		paddingHorizontal: 8,
	},
});
