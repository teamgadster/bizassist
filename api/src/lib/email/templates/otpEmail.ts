// path: src/lib/email/templates/otpEmail.ts

export type OtpEmailTemplateInput = {
	otp: string;
	purpose: "REGISTER" | "PASSWORD_RESET" | "CHANGE_EMAIL";
	expiresInMinutes: number;
	productName?: string;
	supportEmail?: string;
	brandColor?: string;
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Email HTML rules (non-negotiable for stability):
 * - Use tables for layout (Outlook compatibility).
 * - Avoid relying on flex/grid.
 * - Inline styles only.
 * - Keep widths conservative (560–620).
 * - Use safe fonts.
 */
export function buildOtpEmailHtml(input: OtpEmailTemplateInput): string {
	const {
		otp,
		purpose,
		expiresInMinutes,
		productName = "BizAssist AI",
		supportEmail = "support@bizassist.app",
		brandColor = "#2563EB",
	} = input;

	const safeOtp = escapeHtml(String(otp).trim());
	const safeProductName = escapeHtml(productName);
	const safeSupportEmail = escapeHtml(supportEmail);

	const title =
		purpose === "REGISTER"
			? "Verify your email"
			: purpose === "PASSWORD_RESET"
				? "Reset your password"
				: "Confirm your email change";

	const intro =
		purpose === "REGISTER"
			? "Use the verification code below to finish setting up your account."
			: purpose === "PASSWORD_RESET"
				? "Use the verification code below to reset your password."
				: "Use the verification code below to confirm your email change.";

	// Improves screen reader output
	const otpA11y = safeOtp.split("").join(" ");

	// Hidden preheader (shows in inbox preview)
	const preheader =
		purpose === "REGISTER"
			? "Your BizAssist AI verification code"
			: purpose === "PASSWORD_RESET"
				? "Your BizAssist AI password reset code"
				: "Your BizAssist AI email change code";

	const year = new Date().getFullYear();

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(title)}</title>
</head>

<body style="margin:0; padding:0; background-color:#F1F5F9;">
  <!-- Preheader (hidden) -->
  <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9; margin:0; padding:0; width:100%;">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <!-- Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:620px; max-width:620px;">
          <tr>
            <td align="center" style="padding:0 0 12px 0;">
              <div style="font-family:Arial, sans-serif; font-size:14px; font-weight:700; color:#0F172A;">
                ${safeProductName}
              </div>
            </td>
          </tr>

          <tr>
            <td align="center">
              <!-- Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:620px; max-width:620px; background-color:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; overflow:hidden;">

                <tr>
                  <td style="padding:28px 24px;">
                    <div style="font-family:Arial, sans-serif; color:#0F172A;">
                      <div style="font-size:20px; line-height:28px; font-weight:800; margin:0 0 8px 0;">
                        ${escapeHtml(title)}
                      </div>

                      <div style="font-size:14px; line-height:22px; color:#334155; margin:0 0 20px 0;">
                        ${escapeHtml(intro)}
                      </div>

                      <!-- Pill label -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 10px 0;">
                        <tr>
                          <td align="center">
                            <span style="display:inline-block; padding:6px 12px; border-radius:999px; background-color:#EEF2FF; border:1px solid #E2E8F0; font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#475569; font-family:Arial, sans-serif;">
                              Verification Code
                            </span>
                          </td>
                        </tr>
                      </table>

                      <!-- OTP box -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;">
                        <tr>
                          <td align="center" style="background-color:#D8E1EE; border:1px solid #E2E8F0; border-radius:12px; padding:12px 16px;">
                            <div aria-label="Your verification code is ${otpA11y}"
                              style="font-family:SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size:36px; font-weight:900; letter-spacing:8px; color:#0F172A; margin:0;">
                              ${safeOtp}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Expiry -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px 0;">
                        <tr>
                          <td align="center" style="font-family:Arial, sans-serif; font-size:13px; color:#475569;">
                            Expires in <strong style="color:#0F172A;">${expiresInMinutes} minutes</strong>
                          </td>
                        </tr>
                      </table>

                      <!-- Safety text -->
                      <div style="font-family:Arial, sans-serif; font-size:13px; line-height:20px; color:#475569; margin:0;">
                        If you didn’t request this, you can safely ignore this email. Never share this code with anyone.
                      </div>

                      <!-- Support -->
                      <div style="font-family:Arial, sans-serif; font-size:13px; line-height:20px; color:#475569; margin:14px 0 0 0;">
                        Need help?
                        <a href="mailto:${safeSupportEmail}" style="color:${brandColor}; font-weight:800; text-decoration:none;">
                          ${safeSupportEmail}
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#F8FAFC; border-top:1px solid #E2E8F0; padding:14px 24px;">
                    <div style="font-family:Arial, sans-serif; font-size:12px; color:#64748B; text-align:center;">
                      © ${year} ${safeProductName}. All rights reserved.
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
