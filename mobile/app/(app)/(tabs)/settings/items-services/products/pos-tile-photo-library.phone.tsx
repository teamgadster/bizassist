import { Stack } from "expo-router";

import InventoryProductPosTilePhotoLibraryPhoneScreen from "@/modules/inventory/screens/InventoryProductPosTilePhotoLibraryPhoneScreen";

export default function SettingsItemsServicesPosTilePhotoLibraryPhoneRoute() {
	return (
		<>
			<Stack.Screen options={{ animation: "fade", animationDuration: 180 }} />
			<InventoryProductPosTilePhotoLibraryPhoneScreen routeScope='settings-items-services' />
		</>
	);
}
