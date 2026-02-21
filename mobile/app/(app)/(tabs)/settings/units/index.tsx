// BizAssist_mobile
// path: app/(app)/(tabs)/settings/units/index.tsx

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import UnitsPhoneScreen from "./units.phone";
import UnitsTabletScreen from "./units.tablet";

export default function UnitsIndexScreen() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <UnitsTabletScreen /> : <UnitsPhoneScreen />;
}
