import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import SettingsItemsServicesPosTilePhotoLibraryPhone from "./pos-tile-photo-library.phone";
import SettingsItemsServicesPosTilePhotoLibraryTablet from "./pos-tile-photo-library.tablet";

export default function SettingsItemsServicesPosTilePhotoLibraryRoute() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <SettingsItemsServicesPosTilePhotoLibraryTablet /> : <SettingsItemsServicesPosTilePhotoLibraryPhone />;
}
