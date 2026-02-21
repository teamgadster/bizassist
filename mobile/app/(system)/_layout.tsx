// BizAssist_mobile path: app/(system)/_layout.tsx
import { Stack } from "expo-router";

export default function SystemLayout() {
	return (
		<Stack
			initialRouteName='bootstrap'
			screenOptions={{
				headerShown: false,
			}}
		>
			{/* Canonical system entry gate */}
			<Stack.Screen name='bootstrap' options={{ headerShown: false }} />

			{/* Diagnostics (never default entry) */}
			<Stack.Screen name='health' options={{ headerShown: false }} />
		</Stack>
	);
}
