// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/products/pos-tile-photo-library.phone.tsx

import { Stack } from "expo-router";

import InventoryProductPosTilePhotoLibraryPhoneScreen from "@/modules/inventory/screens/InventoryProductPosTilePhotoLibraryPhoneScreen";

export default function InventoryProductPosTilePhotoLibraryPhoneRoute() {
	return (
		<>
			<Stack.Screen options={{ animation: "fade", animationDuration: 180 }} />
			<InventoryProductPosTilePhotoLibraryPhoneScreen />
		</>
	);
}
