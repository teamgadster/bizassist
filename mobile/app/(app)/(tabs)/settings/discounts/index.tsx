// BizAssist_mobile
// path: app/(app)/(tabs)/settings/discounts/index.tsx

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import { DiscountsLedgerScreen } from "./discounts.ledger";

export default function DiscountsIndexScreen() {
	const { isTablet } = useResponsiveLayout();
	return <DiscountsLedgerScreen layout={isTablet ? "tablet" : "phone"} />;
}
