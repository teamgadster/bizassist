// BizAssist_api
// path: src/modules/auth/emailOtp.mailer.ts

import { sendEmail } from "@/lib/email/mailer";
import { buildOtpEmailHtml } from "@/lib/email/templates/otpEmail";
import type { OtpPurposeInput } from "@/modules/auth/auth.types";

const subjectForPurpose = (purpose: OtpPurposeInput): string => {
	if (purpose === "REGISTER") return "Your BizAssist AI verification code";
	if (purpose === "PASSWORD_RESET") return "Your BizAssist AI password reset code";
	return "Your BizAssist AI email change code";
};

const brand = {
	productName: process.env.EMAIL_PRODUCT_NAME ?? "BizAssist AI",
	supportEmail: process.env.EMAIL_SUPPORT ?? "support@bizassist.app",
	brandColor: process.env.EMAIL_BRAND_COLOR ?? "#2563EB",
};

export const sendPurposeOtpEmail = async (args: {
	to: string;
	otp: string;
	minutesValid: number;
	purpose: OtpPurposeInput;
}): Promise<void> => {
	const subject = subjectForPurpose(args.purpose);

	const text = [
		`Your verification code is: ${args.otp}`,
		`This code expires in ${args.minutesValid} minutes.`,
		"If you did not request this, you can safely ignore this email.",
		"Never share this code with anyone.",
	].join("\n");

	const html = buildOtpEmailHtml({
		otp: args.otp,
		purpose: args.purpose,
		expiresInMinutes: args.minutesValid,
		productName: brand.productName,
		supportEmail: brand.supportEmail,
		brandColor: brand.brandColor,
	});

	await sendEmail({ to: args.to, subject, text, html });
};

/**
 * Backwards-compatible alias (REGISTER)
 * Keep this only to support legacy call sites; prefer sendPurposeOtpEmail().
 */
export const sendRegisterOtpEmail = async (args: { to: string; otp: string; minutesValid: number }): Promise<void> => {
	return sendPurposeOtpEmail({ ...args, purpose: "REGISTER" });
};
