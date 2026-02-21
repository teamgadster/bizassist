// BizAssist_mobile
// path: app/(app)/(tabs)/settings/index.tsx

import { Redirect } from "expo-router";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import { useAuth } from "@/modules/auth/AuthContext";

import SettingsPhoneScreen from "./settings.phone";
import SettingsTabletScreen from "./settings.tablet";

export default function SettingsIndexScreen() {
	const { isAuthenticated } = useAuth();
	const { isTablet } = useResponsiveLayout();

	// Guard: if auth state drops, leave the tabs workspace immediately.
	if (!isAuthenticated) {
		return <Redirect href='/(auth)/login' />;
	}

	return isTablet ? <SettingsTabletScreen /> : <SettingsPhoneScreen />;
}
