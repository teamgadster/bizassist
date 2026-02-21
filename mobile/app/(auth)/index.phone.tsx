// BizAssist_mobile
// path: app/(auth)/index.phone.tsx
//
// Auth cover (Phone)
// Refactor goals:
// - Remove safe-area double padding (BAIScreen + manual paddings).
// - Align headline + left rule with tablet variant.
// - Use fontSize-derived lineHeight to prevent clipping/misalignment.
// - Normalize vertical rhythm and bottom actions spacing.
// - Keep brand-dark hero consistent across themes.

import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAIText } from "@/components/ui/BAIText";

import { useAppBusy } from "@/hooks/useAppBusy";

import LogoIcon from "../../assets/images/logo-icon.png";

const BRAND_BG = "#0B1220";
const MAX_CONTENT_WIDTH = 560;

export default function AuthCoverPhone() {
	const router = useRouter();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const { busy, withBusy } = useAppBusy();

	// Governance: prevents rapid double-tap navigation while router transitions mount
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
		// Conservative scaling to avoid clipping on smaller phones.
		if (height < 700) return 46;
		if (height < 780) return 52;
		return 56;
	}, [height]);

	const headlineLineHeight = useMemo(() => Math.round(headlineSize * 1.06), [headlineSize]);
	const subSize = 16;

	const isDark = theme.dark;
	const palette = useMemo(() => {
		return {
			bg: BRAND_BG,
			text: "#FFFFFF",
			muted: "rgba(255,255,255,0.78)",
			caption: "rgba(255,255,255,0.70)",
			title: "rgba(255,255,255,0.86)",
			rule: "rgba(255,255,255,0.92)",
			overlay: isDark ? "rgba(0,0,0,0.34)" : "rgba(0,0,0,0.28)",
			badgeBg: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.08)",
			badgeBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.16)",
			glowAOpacity: isDark ? 0.18 : 0.14,
			glowBOpacity: isDark ? 0.12 : 0.1,
		};
	}, [isDark]);

	const contentWidthStyle = useMemo(
		() => ({ width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" }) as const,
		[],
	);

	// Rhythm governance
	const shellTop = useMemo(() => insets.top + 14, [insets.top]);
	const shellBottom = useMemo(() => insets.bottom + 24, [insets.bottom]);
	const sidePad = 18;
	const heroPadY = 18;

	return (
		<BAIScreen
			padded={false}
			scroll={false}
			safeTop={false}
			safeBottom={false}
			style={{ backgroundColor: palette.bg } as any}
		>
			<View style={[styles.root, { backgroundColor: palette.bg }]}>
				{/* Hard background fill (prevents any safe-area/host canvas gaps) */}
				<View pointerEvents='none' style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.bg }]} />

				{/* Background */}
				<View pointerEvents='none' style={styles.bgLayer}>
					<View style={[styles.glowA, { backgroundColor: theme.colors.primary, opacity: palette.glowAOpacity }]} />
					<View style={[styles.glowB, { backgroundColor: theme.colors.primary, opacity: palette.glowBOpacity }]} />
					<View style={[styles.dimOverlay, { backgroundColor: palette.overlay }]} />
				</View>

				<View style={[styles.shell, { paddingTop: shellTop, paddingBottom: shellBottom }]}>
					{/* Top brand */}
					<View style={[styles.topBar, { paddingHorizontal: sidePad }]}>
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

						{/* Spacer to preserve top bar height/alignment symmetry */}
						<View style={{ width: 44, height: 44 }} />
					</View>

					{/* Hero */}
					<View style={[styles.heroCopy, contentWidthStyle, { paddingHorizontal: sidePad, paddingVertical: heroPadY }]}>
						<BAIText
							variant='title'
							style={[
								styles.headline,
								{
									fontSize: headlineSize,
									lineHeight: headlineLineHeight,
									color: palette.text,
									borderLeftColor: palette.rule,
									paddingLeft: 16,
								},
							]}
						>
							One{"\n"}workspace{"\n"}for{"\n"}inventory{"\n"}and sales
						</BAIText>

						<BAIText variant='body' muted style={[styles.subhead, { fontSize: subSize, color: palette.muted }]}>
							Built for businesses that value speed, accuracy, and clean workflows—phone and tablet.
						</BAIText>
					</View>

					{/* Bottom actions */}
					<View style={[styles.bottomDock, contentWidthStyle, { paddingHorizontal: sidePad }]}>
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

						<View style={{ height: 16 }} />

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

						<BAIText variant='caption' style={[styles.footerNote, { color: palette.caption }]}>
							Secure session controls are enforced automatically.
						</BAIText>
					</View>
				</View>
			</View>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	bgLayer: { ...StyleSheet.absoluteFillObject },

	shell: {
		flex: 1,
	},

	glowA: {
		position: "absolute",
		top: -130,
		left: -110,
		width: 320,
		height: 320,
		borderRadius: 320,
	},
	glowB: {
		position: "absolute",
		bottom: -170,
		right: -150,
		width: 420,
		height: 420,
		borderRadius: 420,
	},
	dimOverlay: { ...StyleSheet.absoluteFillObject },

	topBar: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
	},

	logoStack: {
		alignItems: "center",
	},

	logoBadge: {
		width: 78,
		height: 78,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	logoIcon: {
		width: 58,
		height: 58,
	},
	logoTitle: {
		marginTop: 10,
		letterSpacing: 0.3,
		fontWeight: "600",
	},

	heroCopy: {
		flex: 1,
		justifyContent: "center",
	},

	headline: {
		fontWeight: "800",
		letterSpacing: 0.2,
		borderLeftWidth: 2,
		marginBottom: 12,
	},

	subhead: {
		maxWidth: MAX_CONTENT_WIDTH,
		lineHeight: 22,
	},

	bottomDock: {
		justifyContent: "flex-end",
	},

	btnContent: {
		height: 56,
	},

	footerNote: {
		marginTop: 12,
		textAlign: "center",
	},
});
