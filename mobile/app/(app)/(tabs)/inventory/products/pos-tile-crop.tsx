// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/products/pos-tile-crop.tsx

import { Stack } from "expo-router";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import PosTileCropPhone from "./pos-tile-crop.phone";
import PosTileCropTablet from "./pos-tile-crop.tablet";

export default function PosTileCropIndex() {
	const { isTablet } = useResponsiveLayout();
	return (
		<>
			<Stack.Screen options={{ animation: "fade", animationDuration: 180 }} />
			{isTablet ? <PosTileCropTablet /> : <PosTileCropPhone />}
		</>
	);
}

