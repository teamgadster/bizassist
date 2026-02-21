// path: app/(auth)/verify-success.tsx
// NOTE: Dashboard artifacts removed. Continue routes to bootstrap.
// Bootstrap decides: tabs/home vs onboarding vs auth.

import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useAppBackground } from "@/lib/theme/appBackground";
import { useAuth } from "@/modules/auth/AuthContext";
import { clearPostVerifyEmail, getAuthTokens, getPostVerifyEmail } from "@/modules/auth/auth.storage";

const CONTENT_MAX_WIDTH = 640;

export default function VerifySuccessScreen() {
	const router = useRouter();
	const bg = useAppBackground();
	const { isAuthenticated, isBootstrapping } = useAuth();

	/**
	 * ✅ Governance:
	 * - Do NOT pass email via query params.
	 * - Read the one-shot stored value once, then clear it on mount.
	 * - If missing (edge-case), still show a generic success message.
	 */
	const email = useMemo(() => {
		return (getPostVerifyEmail() ?? "").toString().trim();
	}, []);

	// Defensive: in some flows token may already be present even if auth context is still settling
	const { accessToken } = getAuthTokens();
	const hasToken = typeof accessToken === "string" && accessToken.trim().length > 0;

	// ✅ Tap guard for routing (Continue)
	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);
	const isRouteLocked = isBootstrapping || isNavLocked;

	const lockNav = (ms = 700) => {
		if (navLockRef.current) return false;
		navLockRef.current = true;
		setIsNavLocked(true);

		setTimeout(() => {
			navLockRef.current = false;
			setIsNavLocked(false);
		}, ms);

		return true;
	};

	useEffect(() => {
		// One-shot: ensure no looping back here
		clearPostVerifyEmail();
	}, []);

	const handleContinue = useCallback(() => {
		if (isRouteLocked) return;
		if (!lockNav(700)) return;

		// ✅ Canonical: bootstrap is the single routing decision gate.
		router.replace("/(system)/bootstrap");
	}, [router, isRouteLocked]);

	// Never return null from a screen; render a stable themed surface
	if (isBootstrapping) return <View style={{ flex: 1, backgroundColor: bg }} />;

	/**
	 * ✅ Defensive:
	 * If auth truly not established, route to cover (intent gate) rather than login directly.
	 * (Bootstrap would do the same, but this avoids rendering a misleading success screen.)
	 */
	if (!isAuthenticated && !hasToken) {
		return <Redirect href='/(auth)' />;
	}

	return (
		<BAIScreen padded={false} scroll contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
			<View style={styles.outer}>
				<View style={styles.container}>
					<BAISurface style={styles.card} bordered elevation={1}>
						<View style={styles.header}>
							<BAIText variant='title'>Email Verified</BAIText>
							<BAIText variant='body' muted style={styles.subtitle}>
								{email ? `You're all set for ${email}.` : "You're all set."}
							</BAIText>
						</View>

						<BAICTAButton
							onPress={handleContinue}
							disabled={isRouteLocked}
							intent='primary'
							variant='solid'
							size='lg'
						>
							Continue
						</BAICTAButton>

						<BAIText variant='caption' muted style={styles.footerNote}>
							Next, we’ll route you to onboarding or your workspace automatically.
						</BAIText>
					</BAISurface>
				</View>
			</View>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	outer: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingVertical: 24,
		justifyContent: "center",
	},
	container: {
		width: "100%",
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: "center",
	},
	card: { padding: 16 },
	header: { gap: 6, marginBottom: 12, alignItems: "center" },
	subtitle: { textAlign: "center", lineHeight: 20 },
	footerNote: { marginTop: 10, textAlign: "center" },
});
