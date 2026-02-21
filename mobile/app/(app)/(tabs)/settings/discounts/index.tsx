// BizAssist_mobile
// path: app/(app)/(tabs)/settings/discounts/index.tsx

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import DiscountsPhoneScreen from "./discounts.phone";
import DiscountsTabletScreen from "./discounts.tablet";

export default function DiscountsIndexScreen() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <DiscountsTabletScreen /> : <DiscountsPhoneScreen />;
}
