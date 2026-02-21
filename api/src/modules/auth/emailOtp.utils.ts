// path: src/modules/auth/emailOtp.utils.ts

import crypto from "crypto";
import { env } from "@/core/config/env";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

/**
 * Generates a numeric OTP with a fixed length (e.g., 6 digits).
 * Guardrails: min 4, max 10 digits.
 */
export const generateNumericOtp = (_length: number): string => {
	const safeLen = FIELD_LIMITS.otpCode;

	const min = 10 ** (safeLen - 1);
	const max = 10 ** safeLen - 1;

	// crypto.randomInt: inclusive min, exclusive max -> use (max + 1)
	const n = crypto.randomInt(min, max + 1);
	return String(n);
};

/**
 * HMAC-SHA256(otp) using server secret.
 * Never store OTP in plaintext.
 */
export const hashOtp = (otp: string): string => {
	if (!env.otpHashSecret || env.otpHashSecret === "disabled") {
		// env.ts should prevent this when OTP is enabled, but keep a hard guard
		throw new Error("[OTP] Missing otpHashSecret while OTP is enabled.");
	}

	const normalized = String(otp).trim();

	// Defense-in-depth: OTPs are numeric in this system; reject unexpected formats
	const otpRegex = new RegExp(`^\\d{${FIELD_LIMITS.otpCode}}$`);
	if (!otpRegex.test(normalized)) {
		// Do not leak the OTP back out
		throw new Error("[OTP] Invalid OTP format.");
	}

	return crypto.createHmac("sha256", env.otpHashSecret).update(normalized).digest("hex"); // 64 hex chars
};
