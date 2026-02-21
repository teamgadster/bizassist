// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/discounts/discount.ledger.tsx

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import { DiscountsLedgerScreen } from "../../settings/discounts/discounts.ledger";

export default function InventoryDiscountsLedgerRoute() {
	const { isTablet } = useResponsiveLayout();
	return <DiscountsLedgerScreen layout={isTablet ? "tablet" : "phone"} mode='inventory' />;
}
