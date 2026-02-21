// BizAssist_api
// path: src/lib/email/mailer.ts

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { StatusCodes } from "http-status-codes";
import { env } from "@/core/config/env";
import { AppError } from "@/core/errors/AppError";

type SendEmailParams = {
	to: string;
	subject: string;
	html: string;
	text?: string;
};

let client: SESv2Client | null = null;

const getClient = (): SESv2Client => {
	if (client) return client;

	const credentials =
		env.awsAccessKeyId && env.awsSecretAccessKey
			? {
					accessKeyId: env.awsAccessKeyId,
					secretAccessKey: env.awsSecretAccessKey,
			  }
			: undefined;

	client = new SESv2Client({
		region: env.awsRegion,
		credentials,
	});

	return client;
};

const emailProviderFailure = (cause?: unknown): AppError =>
	new AppError(StatusCodes.SERVICE_UNAVAILABLE, "Email delivery is temporarily unavailable.", {
		code: "EMAIL_PROVIDER_ERROR",
		cause,
	});

const ensureConfigured = (): void => {
	if (!env.sesFromEmail) throw emailProviderFailure();
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
	ensureConfigured();

	try {
		await getClient().send(
			new SendEmailCommand({
				FromEmailAddress: env.sesFromEmail!,
				Destination: { ToAddresses: [params.to] },
				ReplyToAddresses: env.emailReplyTo ? [env.emailReplyTo] : undefined,
				ConfigurationSetName: env.sesConfigurationSet,
				Content: {
					Simple: {
						Subject: { Data: params.subject },
						Body: {
							Html: { Data: params.html },
							Text: params.text ? { Data: params.text } : undefined,
						},
					},
				},
			})
		);
	} catch (error) {
		if (env.nodeEnv === "development") {
			console.error("[SES][SEND_FAILED]", {
				name: (error as { name?: string })?.name,
				message: (error as { message?: string })?.message,
			});
		}

		throw emailProviderFailure(error);
	}
}
