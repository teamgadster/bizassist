import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import SettingsItemsServicesPosTileRecentsPhone from "./pos-tile-recents.phone";
import SettingsItemsServicesPosTileRecentsTablet from "./pos-tile-recents.tablet";

export default function SettingsItemsServicesPosTileRecentsRoute() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <SettingsItemsServicesPosTileRecentsTablet /> : <SettingsItemsServicesPosTileRecentsPhone />;
}
