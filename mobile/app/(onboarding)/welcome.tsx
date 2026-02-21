// path: app/(onboarding)/welcome.tsx
import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

export default function OnboardingWelcome() {
	return (
		<BAIScreen scroll contentContainerStyle={styles.screen}>
			<BAISurface style={styles.card}>
				<BAIText variant='title' style={styles.title}>
					Welcome to BizAssist AI
				</BAIText>

				<BAIText variant='body' muted style={styles.subtitle}>
					Let’s set up your business so you can start using POS and Inventory.
				</BAIText>

				<BAICTAButton style={styles.primaryButton} onPress={() => router.push("/(onboarding)/module-choice")}>
					Continue
				</BAICTAButton>
			</BAISurface>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 16,
	},

	card: {
		width: "100%",
		maxWidth: 520,
		padding: 24,
		gap: 14,
	},

	title: {
		textAlign: "center",
	},

	subtitle: {
		textAlign: "center",
	},

	primaryButton: {
		marginTop: 12,
	},
});
