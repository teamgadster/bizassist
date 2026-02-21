// path: app/(system)/onboarding.tsx

import { useRouter } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { markOnboardingCompleted } from "@/modules/onboarding/onboarding.storage";

import WelcomeIllustration from "../../assets/images/BizAssist-logo.png";

export default function OnboardingScreen() {
	const router = useRouter();

	const handleSignUp = () => {
		markOnboardingCompleted();
		router.push("/(auth)/register");
	};

	const handleLogin = () => {
		markOnboardingCompleted();
		router.push("/(auth)/login");
	};

	return (
		<BAIScreen scroll contentContainerStyle={styles.screenContent}>
			<View style={styles.root}>
				<BAISurface style={styles.surface}>
					<View style={styles.illustrationContainer}>
						<Image source={WelcomeIllustration} style={styles.illustration} resizeMode='contain' />
					</View>

					<View style={styles.textContainer}>
						<BAIText variant='title' style={styles.title}>
							Welcome to BizAssist AI
						</BAIText>

						<BAIText variant='subtitle' muted style={styles.subtitle}>
							Your AI-powered business assistant—smart automation, streamlined operations, and insights built for modern
							teams.
						</BAIText>
					</View>

					<View style={styles.actions}>
						<BAICTAButton
							intent='success'
							variant='solid'
							mode='contained'
							onPress={handleSignUp}
							style={styles.primaryButton}
							contentStyle={styles.primaryButtonContent}
							size='lg'
						>
							Sign Up
						</BAICTAButton>

						<BAICTAButton
							intent='primary'
							variant='outline'
							mode='contained'
							onPress={handleLogin}
							style={styles.secondaryButton}
							contentStyle={styles.secondaryButtonContent}
							size='lg'
						>
							Log In
						</BAICTAButton>
					</View>
				</BAISurface>
			</View>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	screenContent: {
		flexGrow: 1,
		paddingBottom: 24, // safe-area / gesture breathing room
	},

	root: {
		flexGrow: 1,
		alignSelf: "center",
		width: "100%",
		maxWidth: 640,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
	},

	surface: {
		alignSelf: "center",
		width: "100%",
		padding: 24,
	},

	illustrationContainer: {
		alignItems: "center",
		marginBottom: 16,
	},

	illustration: {
		width: "100%",
		height: 120,
		marginBottom: 50,
	},

	textContainer: {
		alignItems: "center",
		marginBottom: 100,
	},

	title: {
		textAlign: "center",
		marginBottom: 8,
	},

	subtitle: {
		textAlign: "center",
	},

	actions: {
		gap: 20,
	},

	primaryButton: {},

	primaryButtonContent: {
		height: 56,
	},

	secondaryButton: {},

	secondaryButtonContent: {
		height: 56,
	},
});
