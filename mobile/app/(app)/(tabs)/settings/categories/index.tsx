// BizAssist_mobile
// path: app/(app)/(tabs)/settings/categories/index.tsx

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import CategoriesPhoneScreen from "./categories.phone";
import CategoriesTabletScreen from "./categories.tablet";

export default function SettingsCategoriesIndexScreen() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <CategoriesTabletScreen /> : <CategoriesPhoneScreen />;
}
