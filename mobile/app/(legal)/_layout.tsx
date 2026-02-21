// path: app/(legal)/_layout.tsx
import { useAppBackground } from "@/lib/theme/appBackground";
import { Stack } from "expo-router";

export default function LegalLayout() {
	const bg = useAppBackground();
	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }} />;
}
