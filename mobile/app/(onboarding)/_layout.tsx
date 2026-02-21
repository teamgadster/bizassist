// path: app/(onboarding)/_layout.tsx

import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { useTheme } from "react-native-paper";

import { APP_BG_DARK, APP_BG_LIGHT } from "@/lib/theme/appBackground";
import { useAuth } from "@/modules/auth/AuthContext";

export default function OnboardingLayout() {
	const theme = useTheme();

	/**
	 * Stable canvas for onboarding flows.
	 * Must follow resolved Display Mode (theme.dark), not raw device scheme.
	 */
	const bg = theme.dark ? APP_BG_DARK : APP_BG_LIGHT;

	const { isAuthenticated, isBootstrapping } = useAuth();

	/**
	 * Never return null from a layout.
	 * While auth is bootstrapping, render a themed surface.
	 */
	if (isBootstrapping) {
		return <View style={{ flex: 1, backgroundColor: bg }} />;
	}

	/**
	 * Onboarding is post-auth only.
	 * Redirect unauthenticated users immediately.
	 */
	if (!isAuthenticated) {
		return (
			<View style={{ flex: 1, backgroundColor: bg }}>
				<Redirect href='/(auth)/login' />
			</View>
		);
	}

	return (
		<View style={{ flex: 1, backgroundColor: bg }}>
			<Stack
				screenOptions={{
					headerShown: false,

					/**
					 * ✅ Hard rule: fade only.
					 * Onboarding should feel calm and non-spatial.
					 */
					animation: "default",

					/**
					 * Keeps transitions fully theme-correct and flash-free.
					 */
					contentStyle: { backgroundColor: bg },
				}}
			/>
		</View>
	);
}
