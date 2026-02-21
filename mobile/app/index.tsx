// BizAssist_mobile path: app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
	// Single canonical entry gate (prevents platform-dependent initial route selection)
	return <Redirect href='/(system)/bootstrap' />;
}
