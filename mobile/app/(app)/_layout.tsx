// BizAssist_mobile
// path: app/(app)/_layout.tsx
//
// App group stack wrapper.
// Governance:
// - The (tabs) group is the post-auth shell.
// - Header is hidden; tabs + screens own their own headers.

import React from "react";
import { Redirect, Stack } from "expo-router";
import { useTheme } from "react-native-paper";

import { useAuth } from "@/modules/auth/AuthContext";

export default function AppLayout() {
	const theme = useTheme();
	const { isAuthenticated, isBootstrapping } = useAuth();

	// Block unauthenticated access to post-auth routes.
	// Typed-routes: index route is folder path (/(auth)), not (/(auth)/index).
	if (!isBootstrapping && !isAuthenticated) {
		return <Redirect href='/(auth)' />;
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: theme.colors.background },
			}}
		>
			<Stack.Screen name='(tabs)' options={{ headerShown: false }} />
		</Stack>
	);
}
