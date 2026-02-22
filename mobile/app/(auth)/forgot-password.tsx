// path: app/(auth)/forgot-password.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { useAppBusy } from "@/hooks/useAppBusy";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";

import { authApi } from "@/modules/auth/auth.api";
import { AuthDomainError, mapAuthErrorToMessage } from "@/modules/auth/auth.errors";
import { validateEmail } from "@/modules/auth/auth.validation";

import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeEmailInput } from "@/shared/validation/sanitize";
import Logo from "../../assets/images/BizAssist-logo.png";

type Params = { email?: string };

const CONTENT_MAX_WIDTH = 640;

export default function ForgotPasswordScreen() {
	const router = useRouter();
	const { withBusy } = useAppBusy();
	const params = useLocalSearchParams<Params>();

	const prefillEmail = useMemo(() => sanitizeEmailInput((params.email ?? "").toString()), [params.email]);

	const [email, setEmail] = useState(prefillEmail);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	// Guardrail: prevents rapid double-tap before state flips
	const submitLockRef = useRef(false);

	// ✅ Navigation tap-guard for routing buttons (Back to Sign In)
	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);
	const isRouteLocked = isSubmitting || isNavLocked;

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

	const validate = () => {
		const errors: Record<string, string> = {};
		const emailError = validateEmail(email);
		if (emailError) errors.email = emailError;

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSend = async () => {
		if (isSubmitting) return;

		if (submitLockRef.current) return;
		submitLockRef.current = true;
		setTimeout(() => {
			submitLockRef.current = false;
		}, 700);

		setError(null);
		setFieldErrors({});

		if (!validate()) return;

		const safeEmail = sanitizeEmailInput(email);

		try {
			setIsSubmitting(true);

			const res = await withBusy("Sending reset code…", async () => {
				return await authApi.forgotPassword({ email: safeEmail });
			});

			// Anti-enumeration: always proceed to OTP verify screen
			router.replace({
				pathname: "/(auth)/verify-email",
				params: {
					email: safeEmail,
					purpose: "PASSWORD_RESET",
					cooldownSeconds: String(res?.verification?.cooldownSeconds ?? 60),
					expiresInSeconds: String(res?.verification?.expiresInSeconds ?? 0),
				},
			});
		} catch (err) {
			const e = err as AuthDomainError;
			setError(mapAuthErrorToMessage(e));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBackToSignIn = () => {
		if (isRouteLocked) return;
		if (!lockNav(700)) return;

		router.push("/(auth)/login");
	};

	return (
		<BAIScreen padded={false} scroll contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
			<KeyboardAvoidingView style={styles.flexGrow} behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<View style={styles.outer}>
					<View style={styles.container}>
						<View style={styles.logoContainer}>
							<Image source={Logo} style={styles.logo} resizeMode='contain' />
						</View>
						<View style={styles.header}>
							<BAIText variant='title'>Forgot password</BAIText>
							<BAIText variant='subtitle' muted>
								Enter your email and we’ll send a verification code.
							</BAIText>
						</View>

						<BAISurface style={styles.surface}>
							<View style={styles.form}>
								<View style={styles.errorContainer}>
									{error ? (
										<BAIText variant='caption' style={styles.errorText}>
											{error}
										</BAIText>
									) : (
										<BAIText variant='caption' muted style={styles.helperText}>
											If an account exists for this email, we’ll send a code.
										</BAIText>
									)}
								</View>

								<View style={styles.inputGroup}>
									<BAITextInput
										value={email}
										onChangeText={(value) => setEmail(sanitizeEmailInput(value))}
										autoCapitalize='none'
										keyboardType='email-address'
										placeholder='Email'
										maxLength={FIELD_LIMITS.email}
										returnKeyType='done'
										onSubmitEditing={handleSend}
										error={!!fieldErrors.email}
									/>
									<View style={styles.fieldErrorContainer}>
										{fieldErrors.email ? (
											<BAIText variant='caption' style={styles.errorText}>
												{fieldErrors.email}
											</BAIText>
										) : null}
									</View>
								</View>

								<View style={styles.buttonBlock}>
									<BAICTAButton
										onPress={handleSend}
										disabled={isSubmitting}
										variant='solid'
										intent='primary'
										size='lg'
									>
										Send Code
									</BAICTAButton>
								</View>

								<View style={{ height: 10 }} />

								<BAIButton
									onPress={handleBackToSignIn}
									disabled={isRouteLocked}
									variant='outline'
									intent='primary'
									size='lg'
								>
									Back to Sign In
								</BAIButton>
							</View>
						</BAISurface>
					</View>
				</View>
			</KeyboardAvoidingView>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	flexGrow: { flexGrow: 1 },

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

	logoContainer: {
		width: "100%",
		alignItems: "center",
		marginBottom: 30,
	},
	logo: {
		width: 100,
		height: 100,
		borderRadius: 18,
	},
	header: { marginBottom: 16 },

	surface: {
		width: "100%",
		alignSelf: "center",
		padding: 16,
		paddingBottom: 10,
	},

	form: { gap: 4 },
	inputGroup: { marginBottom: 2 },
	fieldErrorContainer: {
		minHeight: 14,
		justifyContent: "flex-start",
		marginTop: 2,
	},
	buttonBlock: { marginTop: 12 },
	errorContainer: {
		minHeight: 18,
		marginBottom: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	errorText: { color: "#DC2626" },
	helperText: { textAlign: "center" },
});
