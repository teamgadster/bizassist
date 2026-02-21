import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import SettingsItemsServicesPosTileCropPhone from "./pos-tile-crop.phone";
import SettingsItemsServicesPosTileCropTablet from "./pos-tile-crop.tablet";

export default function SettingsItemsServicesPosTileCropRoute() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <SettingsItemsServicesPosTileCropTablet /> : <SettingsItemsServicesPosTileCropPhone />;
}
