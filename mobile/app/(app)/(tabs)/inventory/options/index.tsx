import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import { OptionSetLedgerScreen } from "@/modules/options/screens/OptionSetLedgerScreen";

export default function InventoryOptionsLedgerRoute() {
	const { isTablet } = useResponsiveLayout();
	return <OptionSetLedgerScreen layout={isTablet ? "tablet" : "phone"} mode='inventory' />;
}
