// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/categories/category.ledger.tsx

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";

import { CategoriesLedgerScreen } from "../../settings/categories/categories.ledger";

export default function InventoryCategoriesLedgerRoute() {
	const { isTablet } = useResponsiveLayout();
	return <CategoriesLedgerScreen layout={isTablet ? "tablet" : "phone"} mode='inventory' />;
}
