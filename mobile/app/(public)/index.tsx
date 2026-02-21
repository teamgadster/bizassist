// path: app/index.tsx
import { Redirect, useRootNavigationState } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAIText } from "@/components/ui/BAIText";

export default function IndexScreen() {
	const rootNavigationState = useRootNavigationState();

	// Until the root navigation tree is mounted, avoid navigating.
	// Show the branded loading UI as the temporary app loading state.
	if (!rootNavigationState?.key) {
		return (
			<BAIScreen>
				<View style={styles.container}>
					{/* Branding */}
					<BAIText variant='title' style={styles.logoText}>
						BizAssist AI
					</BAIText>
					<BAIText variant='subtitle' muted style={styles.subtitle}>
						Preparing your business workspace...
					</BAIText>

					{/* Loader */}
					<View style={styles.loaderContainer}>
						<BAIActivityIndicator size='large' />
					</View>

					<BAIText variant='caption' muted style={styles.note}>
						Running startup checks and restoring your session.
					</BAIText>
				</View>
			</BAIScreen>
		);
	}

	// Once the root navigation is ready, immediately hand off to the
	// dedicated bootstrap screen which performs the real auth/session logic.
	return <Redirect href='/(system)/bootstrap' />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		gap: 16,
		justifyContent: "center",
	},
	logoText: {
		textAlign: "center",
	},
	subtitle: {
		textAlign: "center",
		marginBottom: 8,
	},
	loaderContainer: {
		marginTop: 16,
		alignItems: "center",
	},
	note: {
		marginTop: 24,
		textAlign: "center",
		paddingHorizontal: 24,
	},
});
