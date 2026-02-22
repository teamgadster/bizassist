import { Stack } from "expo-router";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import SettingsItemsServicesPosTileRecentsPhone from "./pos-tile-recents.phone";
import SettingsItemsServicesPosTileRecentsTablet from "./pos-tile-recents.tablet";

export default function SettingsItemsServicesPosTileRecentsRoute() {
	const { isTablet } = useResponsiveLayout();
	return (
		<>
			<Stack.Screen options={{ animation: "fade", animationDuration: 180 }} />
			{isTablet ? <SettingsItemsServicesPosTileRecentsTablet /> : <SettingsItemsServicesPosTileRecentsPhone />}
		</>
	);
}
