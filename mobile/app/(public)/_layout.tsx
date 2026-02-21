// path: app/(public)/_layout.tsx
import { useAppBackground } from "@/lib/theme/appBackground";
import { Stack } from "expo-router";

export default function PublicLayout() {
	const bg = useAppBackground();
	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }} />;
}
