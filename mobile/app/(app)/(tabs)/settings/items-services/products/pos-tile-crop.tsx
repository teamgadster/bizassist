import { Stack } from "expo-router";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import SettingsItemsServicesPosTileCropPhone from "./pos-tile-crop.phone";
import SettingsItemsServicesPosTileCropTablet from "./pos-tile-crop.tablet";

export default function SettingsItemsServicesPosTileCropRoute() {
	const { isTablet } = useResponsiveLayout();
	return (
		<>
			<Stack.Screen options={{ animation: "fade", animationDuration: 180 }} />
			{isTablet ? <SettingsItemsServicesPosTileCropTablet /> : <SettingsItemsServicesPosTileCropPhone />}
		</>
	);
}
