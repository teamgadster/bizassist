// BizAssist_mobile
// path: app/(auth)/index.tablet.tsx
//
// Auth cover (Tablet)
// Refactor goals:
// - Remove safe-area double padding (BAIScreen + manual paddings).
// - Align headline + left rule with phone variant.
// - Normalize hero alignment (left-aligned headline + copy) to match screenshot.
// - Standardize panel sizing + button height.
// - Keep brand-dark hero consistent across themes.

import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useAppBusy } from "@/hooks/useAppBusy";

import LogoIcon from "../../assets/images/logo-icon.png";

const BRAND_BG = "#0B1220";
const MAX_CONTENT_WIDTH = 1040;
const PANEL_MAX_WIDTH = 560;

export default function AuthCoverTablet() {
	const router = useRouter();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const { busy, withBusy } = useAppBusy();

	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);

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

	const isDisabled = busy.isBusy || isNavLocked;

	const onPressCreateAccount = useCallback(
		() =>
			withBusy("Opening sign up…", async () => {
				if (isDisabled) return;
				if (!lockNav()) return;
				router.push("/(auth)/register");
			}),
		[isDisabled, router, withBusy],
	);

	const onPressSignIn = useCallback(
		() =>
			withBusy("Opening sign in…", async () => {
				if (isDisabled) return;
				if (!lockNav()) return;
				router.push("/(auth)/login");
			}),
		[isDisabled, router, withBusy],
	);

	const headlineSize = useMemo(() => {
		// Stable scaling across iPad sizes; avoid overshooting lineHeight.
		if (height < 820) return 66;
		if (width >= 1180) return 80;
		return 72;
	}, [height, width]);

	const headlineLineHeight = useMemo(() => Math.round(headlineSize * 1.06), [headlineSize]);

	const isDark = theme.dark;

	const palette = useMemo(() => {
		return {
			bg: BRAND_BG,
			text: "#FFFFFF",
			muted: "rgba(255,255,255,0.78)",
			caption: "rgba(255,255,255,0.70)",
			title: "rgba(255,255,255,0.90)",
			rule: "rgba(255,255,255,0.92)",
			overlay: isDark ? "rgba(0,0,0,0.34)" : "rgba(0,0,0,0.28)",
			panelBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.05)",
			panelBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)",
			badgeBg: "rgba(255,255,255,0.10)",
			badgeBorder: "rgba(255,255,255,0.18)",
			primaryGlow: 0.16,
			secondaryGlow: 0.11,
		};
	}, [isDark]);

	// Shell padding governed by safe area
	const shellTop = useMemo(() => insets.top + 18, [insets.top]);
	const shellBottom = useMemo(() => insets.bottom + 18, [insets.bottom]);

	return (
		<BAIScreen
			padded={false}
			scroll={false}
			safeTop={false}
			safeBottom={false}
			style={{ backgroundColor: palette.bg } as any}
		>
			<View style={[styles.root, { backgroundColor: palette.bg }]}>
				<View pointerEvents='none' style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.bg }]} />

				{/* Background */}
				<View pointerEvents='none' style={styles.bgLayer}>
					<View style={[styles.glowA, { backgroundColor: theme.colors.primary, opacity: palette.primaryGlow }]} />
					<View style={[styles.glowB, { backgroundColor: theme.colors.primary, opacity: palette.secondaryGlow }]} />
					<View style={[styles.dimOverlay, { backgroundColor: palette.overlay }]} />
				</View>

				<View style={[styles.shell, { paddingTop: shellTop, paddingBottom: shellBottom }]}>
					{/* Logo (top-left) */}
					<View style={styles.topBar}>
						<View style={styles.logoStack}>
							<View
								style={[
									styles.logoBadge,
									{
										backgroundColor: palette.badgeBg,
										borderColor: palette.badgeBorder,
									},
								]}
							>
								<Image source={LogoIcon} style={styles.logoIcon} resizeMode='contain' />
							</View>

							<BAIText variant='caption' style={[styles.logoTitle, { color: palette.title }]}>
								Biz Assist AI
							</BAIText>
						</View>
					</View>

					{/* Center content */}
					<View style={styles.centerStage}>
						<View style={styles.centerGroup}>
							{/* Hero */}
							<View style={styles.heroBlock}>
								<BAIText
									variant='title'
									style={[
										styles.headline,
										{
											fontSize: headlineSize,
											lineHeight: headlineLineHeight,
											color: palette.text,
											borderLeftColor: palette.rule,
											paddingLeft: 20,
										},
									]}
								>
									One{"\n"}workspace{"\n"}for{"\n"}inventory{"\n"}and sales
								</BAIText>

								<BAIText variant='body' muted style={[styles.subhead, { color: palette.muted }]}>
									Tablets are first-class in Biz Assist AI. Clean workflows, fast checkout, and inventory accuracy—built
									for real operations.
								</BAIText>
							</View>

							{/* Actions panel */}
							<BAISurface
								padded={false}
								bordered
								style={[
									styles.panel,
									{
										backgroundColor: palette.panelBg,
										borderColor: palette.panelBorder,
									},
								]}
							>
								<View style={styles.panelInner}>
									<BAIText variant='title' style={{ color: palette.text }}>
										Get started
									</BAIText>

									<BAIText variant='body' muted style={[styles.panelSub, { color: palette.muted }]}>
										Sign in to continue, or create a new account for your business.
									</BAIText>

									<View style={{ height: 18 }} />

									<BAICTAButton
										intent='primary'
										variant='solid'
										onPress={onPressSignIn}
										disabled={isDisabled}
										contentStyle={styles.btnContent}
										size='lg'
									>
										Sign In
									</BAICTAButton>

									<View style={{ height: 14 }} />

									<BAICTAButton
										intent='success'
										variant='outline'
										onPress={onPressCreateAccount}
										disabled={isDisabled}
										contentStyle={styles.btnContent}
										size='lg'
									>
										Create Account
									</BAICTAButton>

									<BAIText variant='caption' style={[styles.caption, { color: palette.caption }]}>
										Secure session controls are enforced automatically.
									</BAIText>
								</View>
							</BAISurface>
						</View>
					</View>
				</View>
			</View>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	bgLayer: { ...StyleSheet.absoluteFillObject },

	glowA: {
		position: "absolute",
		top: -160,
		left: -160,
		width: 460,
		height: 460,
		borderRadius: 460,
	},
	glowB: {
		position: "absolute",
		bottom: -260,
		right: -220,
		width: 900,
		height: 900,
		borderRadius: 620,
	},
	dimOverlay: { ...StyleSheet.absoluteFillObject },

	shell: {
		flex: 1,
		paddingHorizontal: 32,
	},

	topBar: {
		alignItems: "flex-start",
		marginTop: 20,
		marginLeft: 20,
	},

	logoStack: {
		alignItems: "center",
	},

	logoBadge: {
		width: 96,
		height: 96,
		borderRadius: 18,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	logoIcon: {
		width: 72,
		height: 72,
	},
	logoTitle: {
		marginTop: 12,
		fontWeight: "600",
		letterSpacing: 0.4,
	},

	centerStage: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	centerGroup: {
		width: "100%",
		maxWidth: MAX_CONTENT_WIDTH,
		alignItems: "center",
		gap: 24,
	},

	heroBlock: {
		width: "100%",
		maxWidth: 550,
		alignItems: "flex-start",
		marginBottom: 20,
	},

	headline: {
		fontWeight: "800",
		letterSpacing: 0.2,
		borderLeftWidth: 2,
		marginBottom: 18,
	},

	subhead: {
		marginTop: 6,
		maxWidth: 640,
		lineHeight: 24,
		textAlign: "left",
	},

	panel: {
		width: "100%",
		maxWidth: PANEL_MAX_WIDTH,
		borderWidth: 1,
		borderRadius: 18,
	},

	panelInner: {
		padding: 20,
	},

	panelSub: {
		marginTop: 8,
	},

	btnContent: {
		height: 56,
	},

	caption: {
		marginTop: 16,
		textAlign: "center",
	},
});
