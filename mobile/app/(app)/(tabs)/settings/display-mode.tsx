// BizAssist_mobile
// path: app/(app)/(tabs)/settings/display-mode.tsx

import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";

import { DisplayModeSelectorCard } from "@/components/settings/DisplayModeSelectorCard";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppHeader } from "@/modules/navigation/useAppHeader";

export default function DisplayModeScreen() {
	const router = useRouter();
	const { width } = useWindowDimensions();
	const railMaxWidth = 560;
	const isTablet = width >= 768;
	const onBack = useCallback(() => {
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace("/(app)/(tabs)/settings" as any);
	}, [router]);
	const headerOptions = useAppHeader("detail", { title: "Display mode", onBack });

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<View style={styles.centerWrap}>
						<View style={[styles.column, isTablet && { maxWidth: railMaxWidth }]}>
							<DisplayModeSelectorCard showHelper={false} />

							<BAISurface style={styles.note} padded>
								<BAIText variant='caption' muted>
									System follows your device appearance. Light and Dark override system-wide settings for this app only.
								</BAIText>
							</BAISurface>
						</View>
					</View>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingTop: 12,
		paddingBottom: 12,
	},
	centerWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
	},
	column: {
		width: "100%",
		paddingHorizontal: 14,
		gap: 12,
	},
	note: {
		borderRadius: 18,
	},
});
