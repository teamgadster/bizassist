// path: src/core/middleware/rateLimiter.ts

import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "@/core/config/env";

function getClientIp(req: Request): string | null {
	return (req.ip ?? null) as string | null;
}

export const buildLimiter = (opts: {
	contextKey: string;
	windowMs: number;
	max: number;
	message: string;
	keyGenerator?: (req: Request) => string;
}) => {
	return rateLimit({
		windowMs: opts.windowMs,
		limit: opts.max,
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: opts.keyGenerator,
		handler: async (_req: Request, res: Response) => {
			// No DB audit logging here by design (prevents high-volume writes).
			return res.status(429).json({
				success: false,
				message: opts.message,
				code: "RATE_LIMITED",
				error: { code: "RATE_LIMITED", contextKey: opts.contextKey, message: opts.message },
			});
		},
	});
};

// ----------------------------
// Key generators (opinionated)
// ----------------------------
const ipOnly = (req: Request) => getClientIp(req) ?? "noip";

const ipPlusEmail = (req: Request) => {
	const ip = getClientIp(req) ?? "noip";
	const email = typeof req.body?.email === "string" ? String(req.body.email).toLowerCase() : "noemail";
	return `${ip}:${email}`;
};

// ----------------------------
// Exported limiters (used by routes)
// ----------------------------
export const registerRateLimiter = buildLimiter({
	contextKey: "AUTH_REGISTER",
	windowMs: env.authRegisterWindowMs,
	max: env.authRegisterAttemptsPerWindow,
	message: "Too many registration attempts. Please try again later.",
	keyGenerator: ipPlusEmail,
});

export const loginRateLimiter = buildLimiter({
	contextKey: "AUTH_LOGIN",
	windowMs: env.authLoginWindowMs,
	max: env.authLoginAttemptsPerWindow,
	message: "Too many sign-in attempts. Please try again later.",
	keyGenerator: ipPlusEmail,
});

export const refreshRateLimiter = buildLimiter({
	contextKey: "AUTH_REFRESH",
	windowMs: env.authRefreshWindowMs,
	max: env.authRefreshAttemptsPerWindow,
	message: "Too many refresh attempts. Please try again later.",
	keyGenerator: ipOnly,
});

export const verifyEmailRateLimiter = buildLimiter({
	contextKey: "AUTH_VERIFY_EMAIL",
	windowMs: env.authVerifyEmailWindowMs,
	max: env.authVerifyEmailAttemptsPerWindow,
	message: "Too many verification attempts. Please try again later.",
	keyGenerator: ipPlusEmail,
});

export const resendOtpRateLimiter = buildLimiter({
	contextKey: "AUTH_RESEND_OTP",
	windowMs: env.authResendOtpWindowMs,
	max: env.authResendOtpAttemptsPerWindow,
	message: "Too many resend attempts. Please try again later.",
	keyGenerator: ipPlusEmail,
});

export const forgotPasswordRateLimiter = buildLimiter({
	contextKey: "AUTH_FORGOT_PASSWORD",
	windowMs: env.authForgotPasswordWindowMs,
	max: env.authForgotPasswordAttemptsPerWindow,
	message: "Too many requests. Please try again later.",
	keyGenerator: ipPlusEmail,
});

export const verifyPasswordResetRateLimiter = buildLimiter({
	contextKey: "AUTH_VERIFY_PASSWORD_RESET",
	windowMs: env.authVerifyPasswordResetWindowMs,
	max: env.authVerifyPasswordResetAttemptsPerWindow,
	message: "Too many attempts. Please try again later.",
	keyGenerator: ipPlusEmail,
});

export const resetPasswordRateLimiter = buildLimiter({
	contextKey: "AUTH_RESET_PASSWORD",
	windowMs: env.authResetPasswordWindowMs,
	max: env.authResetPasswordAttemptsPerWindow,
	message: "Too many requests. Please try again later.",
	keyGenerator: ipPlusEmail,
});
