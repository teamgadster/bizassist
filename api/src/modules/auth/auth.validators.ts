// path: src/modules/auth/auth.validators.ts

import { z } from "zod";
import { nameRegex, emailRegex } from "@/shared/validation/patterns";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { zSanitizedString } from "@/shared/validators/zod.shared";

const sanitizedSingleLine = <TSchema extends z.ZodTypeAny>(schema: TSchema) =>
	zSanitizedString(schema, {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	});

export const registerSchema = z.object({
	firstName: sanitizedSingleLine(
		z
			.string()
			.trim()
			.min(FIELD_LIMITS.firstNameMin, `First name must be at least ${FIELD_LIMITS.firstNameMin} characters`)
			.max(FIELD_LIMITS.firstName, `First name must be at most ${FIELD_LIMITS.firstName} characters`)
			.regex(nameRegex, "First name contains invalid characters")
	),
	lastName: sanitizedSingleLine(
		z
			.string()
			.trim()
			.min(FIELD_LIMITS.lastNameMin, `Last name must be at least ${FIELD_LIMITS.lastNameMin} characters`)
			.max(FIELD_LIMITS.lastName, `Last name must be at most ${FIELD_LIMITS.lastName} characters`)
			.regex(nameRegex, "Last name contains invalid characters")
	),
	email: sanitizedSingleLine(
		z
			.string()
			.trim()
			.max(FIELD_LIMITS.email, `Email must be ${FIELD_LIMITS.email} characters or less`)
			.regex(emailRegex, "Invalid email address")
	),
	password: z
		.string()
		.min(FIELD_LIMITS.passwordMin, `Password must be at least ${FIELD_LIMITS.passwordMin} characters`)
		.max(FIELD_LIMITS.password, `Password must be ${FIELD_LIMITS.password} characters or less`),
});

export const loginSchema = z.object({
	email: sanitizedSingleLine(
		z
			.string()
			.trim()
			.max(FIELD_LIMITS.email, `Email must be ${FIELD_LIMITS.email} characters or less`)
			.regex(emailRegex, "Invalid email address")
	),
	password: z
		.string()
		.min(FIELD_LIMITS.passwordMin, `Password must be at least ${FIELD_LIMITS.passwordMin} characters`)
		.max(FIELD_LIMITS.password, `Password must be ${FIELD_LIMITS.password} characters or less`),
});

/**
 * Refresh Tokens
 * Payload:
 * { "refreshToken": "<token>" }
 */
export const refreshSchema = z.object({
	refreshToken: sanitizedSingleLine(
		z
			.string()
			.trim()
			.min(
				FIELD_LIMITS.refreshTokenMin,
				`Refresh token must be at least ${FIELD_LIMITS.refreshTokenMin} characters`
			)
			.max(
				FIELD_LIMITS.refreshToken,
				`Refresh token must be ${FIELD_LIMITS.refreshToken} characters or less`
			)
	),
});

/**
 * Logout (single-session)
 * Payload:
 * { "refreshToken": "<token>" }
 *
 * Note: optional so clients can call logout even if they already lost the token.
 */
export const logoutSchema = z.object({
	refreshToken: sanitizedSingleLine(
		z
			.string()
			.trim()
			.min(
				FIELD_LIMITS.refreshTokenMin,
				`Refresh token must be at least ${FIELD_LIMITS.refreshTokenMin} characters`
			)
			.max(
				FIELD_LIMITS.refreshToken,
				`Refresh token must be ${FIELD_LIMITS.refreshToken} characters or less`
			)
	)
		.optional(),
});

/**
 * Logout All
 * Payload: {}
 */
export const logoutAllSchema = z.object({}).strict();

/**
 * Verify Email OTP
 * Payload:
 * { "email": "...", "purpose": "REGISTER", "code": "123456" }
 */
export const verifyEmailSchema = z.object({
	email: sanitizedSingleLine(
		z
			.string()
			.trim()
			.max(FIELD_LIMITS.email, `Email must be ${FIELD_LIMITS.email} characters or less`)
			.regex(emailRegex, "Invalid email address")
	),
	code: sanitizedSingleLine(
		z
			.string()
			.trim()
			.length(FIELD_LIMITS.otpCode, `Code must be ${FIELD_LIMITS.otpCode} characters`)
	),
	purpose: z.enum(["REGISTER", "PASSWORD_RESET", "CHANGE_EMAIL"]).optional(),
});

/**
 * Resend OTP
 * Payload:
 * { "email": "...", "purpose": "REGISTER" }
 */
export const resendOtpSchema = z.object({
	email: sanitizedSingleLine(
		z
			.string()
			.trim()
			.max(FIELD_LIMITS.email, `Email must be ${FIELD_LIMITS.email} characters or less`)
			.regex(emailRegex, "Invalid email address")
	),
	purpose: z.enum(["REGISTER", "PASSWORD_RESET", "CHANGE_EMAIL"]).optional(),
});

/**
 * Forgot Password (NEW)
 * Payload:
 * { "email": "user@example.com" }
 */
export const forgotPasswordSchema = z.object({
	email: sanitizedSingleLine(
		z
			.string()
			.trim()
			.max(FIELD_LIMITS.email, `Email must be ${FIELD_LIMITS.email} characters or less`)
			.regex(emailRegex, "Invalid email address")
	),
});

/**
 * Verify Password Reset OTP (NEW)
 * Payload:
 * { "email": "user@example.com", "code": "123456" }
 */
export const verifyPasswordResetOtpSchema = z.object({
	email: sanitizedSingleLine(
		z
			.string()
			.trim()
			.max(FIELD_LIMITS.email, `Email must be ${FIELD_LIMITS.email} characters or less`)
			.regex(emailRegex, "Invalid email address")
	),
	code: sanitizedSingleLine(
		z
			.string()
			.trim()
			.length(FIELD_LIMITS.otpCode, `Code must be ${FIELD_LIMITS.otpCode} characters`)
	),
});

/**
 * Reset Password (NEW)
 * Payload:
 * { "resetTicket": "<ticket>", "newPassword": "<newPassword>" }
 */
export const resetPasswordSchema = z.object({
	resetTicket: sanitizedSingleLine(
		z
			.string()
			.trim()
			.min(FIELD_LIMITS.resetTicketMin, `Reset ticket must be at least ${FIELD_LIMITS.resetTicketMin} characters`)
			.max(FIELD_LIMITS.resetTicket, `Reset ticket must be ${FIELD_LIMITS.resetTicket} characters or less`)
	),
	newPassword: z
		.string()
		.min(FIELD_LIMITS.passwordMin, `Password must be at least ${FIELD_LIMITS.passwordMin} characters`)
		.max(FIELD_LIMITS.password, `Password must be ${FIELD_LIMITS.password} characters or less`),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type ResendOtpBody = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type VerifyPasswordResetOtpBody = z.infer<typeof verifyPasswordResetOtpSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type LogoutBody = z.infer<typeof logoutSchema>;
export type LogoutAllBody = z.infer<typeof logoutAllSchema>;
