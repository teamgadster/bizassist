// path: app/(auth)/_layout.tsx
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useTheme } from "react-native-paper";

import { useAppBackground } from "@/lib/theme/appBackground";

export default function AuthLayout() {
	const bg = useAppBackground();
	const theme = useTheme();
	const pathname = usePathname();

	const isAuthCover = pathname === "/" || pathname === "/index";
	const statusBarStyle = isAuthCover ? "light" : theme.dark ? "light" : "dark";

	return (
		<View style={{ flex: 1, backgroundColor: bg }}>
			<StatusBar style={statusBarStyle} translucent backgroundColor={bg} />

			<Stack
				screenOptions={{
					headerShown: false,
					animation: "default",
					contentStyle: { backgroundColor: bg },
				}}
			/>
		</View>
	);
}
