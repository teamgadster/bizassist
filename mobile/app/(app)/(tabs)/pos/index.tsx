// BizAssist_mobile path: app/(app)/(tabs)/pos/index.tsx
import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import PosPhone from "./pos.phone";
import PosTablet from "./pos.tablet";

export default function PosIndex() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <PosTablet /> : <PosPhone />;
}
