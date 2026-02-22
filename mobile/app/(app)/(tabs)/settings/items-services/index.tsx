// BizAssist_mobile
// path: app/(app)/(tabs)/settings/items-services/index.tsx
//
// Settings wrapper for inventory list surfaces (All Items / All Services):
// - Keeps user within Settings tab context.
// - Reuses Inventory screens with settings route scope.

import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import InventoryPhoneScreen from "@/modules/inventory/screens/InventoryPhoneScreen";
import InventoryTabletScreen from "@/modules/inventory/screens/InventoryTabletScreen";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { useAppHeader } from "@/modules/navigation/useAppHeader";

const SETTINGS_ITEMS_ROUTE = "/(app)/(tabs)/settings/items" as const;

export default function SettingsItemsServicesWrapperScreen() {
	const router = useRouter();
	const { isTablet } = useResponsiveLayout();

	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace(SETTINGS_ITEMS_ROUTE as any);
	}, [router]);

	const headerOptions = useAppHeader("detail", { title: "Items And Services", onBack });

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			{isTablet ? (
				<InventoryTabletScreen routeScope='settings-items-services' />
			) : (
				<InventoryPhoneScreen routeScope='settings-items-services' />
			)}
		</>
	);
}
