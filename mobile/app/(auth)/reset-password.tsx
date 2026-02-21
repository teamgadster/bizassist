// path: app/(auth)/reset-password.tsx
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { TextInput, useTheme } from "react-native-paper";

import { useAppBusy } from "@/hooks/useAppBusy";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton } from "@/components/ui/BAICTAButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";

import { authApi } from "@/modules/auth/auth.api";
import { AuthDomainError, mapAuthErrorToMessage } from "@/modules/auth/auth.errors";
import { clearPasswordResetTicket, getPasswordResetTicket } from "@/modules/auth/auth.storage";
import { validatePasswordForRegister } from "@/modules/auth/auth.validation";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

const CONTENT_MAX_WIDTH = 640;

export default function ResetPasswordScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { withBusy } = useAppBusy();

	const session = useMemo(() => getPasswordResetTicket(), []);
	const email = session?.email ?? "";
	const resetTicket = session?.resetTicket ?? "";

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	// ✅ Navigation tap-guard for routing buttons (Back to Sign In, etc.)
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

		const pwError = validatePasswordForRegister(newPassword);
		if (pwError) errors.newPassword = pwError;

		if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
		if (confirmPassword && confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match.";

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;

		setError(null);
		setFieldErrors({});

		if (!email || !resetTicket) {
			setError("Your reset session has expired. Please request a new code.");
			router.replace("/(auth)/forgot-password");
			return;
		}

		if (!validate()) return;

		try {
			setIsSubmitting(true);

			await withBusy("Updating password…", async () => {
				await authApi.resetPassword({
					email,
					resetTicket,
					newPassword,
				});
			});

			clearPasswordResetTicket();
			router.replace("/(auth)/login");
		} catch (err) {
			const e = err as AuthDomainError;
			const msg = mapAuthErrorToMessage(e);

			if (e.code === "RESET_TICKET_INVALID_OR_EXPIRED") {
				clearPasswordResetTicket();
				setError("Reset session expired. Please request a new code.");
				router.replace("/(auth)/forgot-password");
				return;
			}

			setError(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBackToSignIn = () => {
		if (isRouteLocked) return;
		if (!lockNav(700)) return;

		clearPasswordResetTicket();
		router.replace("/(auth)/login");
	};

	return (
		<BAIScreen padded={false} scroll contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
			<KeyboardAvoidingView style={styles.flexGrow} behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<View style={styles.outer}>
					<View style={styles.container}>
						<BAISurface style={styles.surface}>
							<View style={styles.header}>
								<BAIText variant='title'>Reset password</BAIText>
								<BAIText variant='body' muted>
									{email ? `Set a new password for ${email}.` : "Set your new password."}
								</BAIText>
							</View>

							<View style={styles.form}>
								<View style={styles.errorContainer}>
									{error ? (
										<BAIText variant='caption' style={styles.errorText}>
											{error}
										</BAIText>
									) : null}
								</View>

								<View style={styles.inputGroup}>
									<BAITextInput
										value={newPassword}
										onChangeText={setNewPassword}
										secureTextEntry={!isPasswordVisible}
										placeholder='New password'
										maxLength={FIELD_LIMITS.password}
										autoCapitalize='none'
										returnKeyType='next'
										error={!!fieldErrors.newPassword}
										right={
											<TextInput.Icon
												icon={isPasswordVisible ? "eye-off" : "eye"}
												onPress={() => setIsPasswordVisible((v) => !v)}
												forceTextInputFocus={false}
											/>
										}
									/>
									<View style={styles.fieldErrorContainer}>
										{fieldErrors.newPassword ? (
											<BAIText variant='caption' style={styles.errorText}>
												{fieldErrors.newPassword}
											</BAIText>
										) : null}
									</View>
								</View>

								<View style={styles.inputGroupNoBottom}>
									<BAITextInput
										value={confirmPassword}
										onChangeText={setConfirmPassword}
										secureTextEntry={!isPasswordVisible}
										placeholder='Confirm password'
										maxLength={FIELD_LIMITS.password}
										autoCapitalize='none'
										returnKeyType='done'
										onSubmitEditing={handleSubmit}
										error={!!fieldErrors.confirmPassword}
									/>
									<View style={styles.fieldErrorContainer}>
										{fieldErrors.confirmPassword ? (
											<BAIText variant='caption' style={styles.errorText}>
												{fieldErrors.confirmPassword}
											</BAIText>
										) : null}
									</View>
								</View>

								<View style={styles.buttonBlock}>
									<BAICTAButton
										onPress={handleSubmit}
										disabled={isSubmitting}
										variant='solid'
										intent='primary'
										size='lg'
									>
										Update Password
									</BAICTAButton>
								</View>

								<View style={{ height: 8 }} />

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

	surface: { padding: 16 },

	header: { gap: 6, marginBottom: 12 },
	form: { gap: 4 },
	inputGroup: { marginBottom: 2 },
	inputGroupNoBottom: { marginBottom: 0 },
	fieldErrorContainer: {
		minHeight: 14,
		justifyContent: "flex-start",
		marginTop: 2,
	},
	buttonBlock: { marginTop: 14 },
	errorContainer: {
		minHeight: 14,
		marginBottom: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	errorText: { color: "#DC2626" },
});
