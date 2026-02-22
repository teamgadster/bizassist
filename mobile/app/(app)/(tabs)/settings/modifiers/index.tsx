import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import ModifiersPhoneScreen from "./modifiers.phone";
import ModifiersTabletScreen from "./modifiers.tablet";

export default function SettingsModifiersIndexScreen() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <ModifiersTabletScreen /> : <ModifiersPhoneScreen />;
}
