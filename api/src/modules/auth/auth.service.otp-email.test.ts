// BizAssist_api
// path: src/modules/auth/auth.service.otp-email.test.ts

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/core/errors/AppError";
import * as authRepository from "@/modules/auth/auth.repository";
import * as emailOtpMailer from "@/modules/auth/emailOtp.mailer";
import { loginUser, registerUser, resendEmailOtp } from "@/modules/auth/auth.service";

jest.mock("@/core/config/env", () => ({
	env: {
		nodeEnv: "test",
		otpEnabled: true,
		otpLength: 6,
		otpTtlMinutes: 10,
		otpMaxAttempts: 5,
		otpResendCooldownSeconds: 60,
		otpResendHourlyCap: 3,
		otpHashSecret: "test-otp-secret",
		bcryptRounds: 10,
		jwtRefreshTokenExpiresInDays: 7,
		passwordResetTicketTtlMinutes: 15,
	},
}));

jest.mock("@/lib/prisma", () => ({
	prisma: { $transaction: jest.fn() },
}));

jest.mock("@/core/security/jwt", () => ({
	signAccessToken: jest.fn(() => "access-token"),
	signRefreshToken: jest.fn(() => "refresh-token"),
	verifyRefreshToken: jest.fn(),
}));

jest.mock("bcrypt", () => {
	const hash = jest.fn();
	const compare = jest.fn();
	return {
		__esModule: true,
		default: { hash, compare },
		hash,
		compare,
	};
});

jest.mock("@/modules/auth/auth.repository", () => ({
	findUserByEmail: jest.fn(),
	findUserById: jest.fn(),
	createUser: jest.fn(),
	updateUnverifiedUserForRegisterResume: jest.fn(),
	upsertEmailOtp: jest.fn(),
	findEmailOtpByUserPurpose: jest.fn(),
	incrementEmailOtpAttempts: jest.fn(),
	deleteEmailOtp: jest.fn(),
	markUserEmailVerified: jest.fn(),
	createRefreshToken: jest.fn(),
	findRefreshToken: jest.fn(),
	revokeRefreshToken: jest.fn(),
	revokeAllRefreshTokensForUser: jest.fn(),
	bumpUserTokenVersion: jest.fn(),
	createPasswordResetTicket: jest.fn(),
	findPasswordResetTicketByToken: jest.fn(),
	markPasswordResetTicketUsed: jest.fn(),
	deletePasswordResetTicketsForUser: jest.fn(),
}));

jest.mock("@/modules/auth/emailOtp.mailer", () => ({
	sendPurposeOtpEmail: jest.fn(),
	sendRegisterOtpEmail: jest.fn(),
}));

const findUserByEmailMock = authRepository.findUserByEmail as jest.MockedFunction<typeof authRepository.findUserByEmail>;
const createUserMock = authRepository.createUser as jest.MockedFunction<typeof authRepository.createUser>;
const upsertEmailOtpMock = authRepository.upsertEmailOtp as jest.MockedFunction<typeof authRepository.upsertEmailOtp>;
const findEmailOtpByUserPurposeMock = authRepository.findEmailOtpByUserPurpose as jest.MockedFunction<
	typeof authRepository.findEmailOtpByUserPurpose
>;

const sendPurposeOtpEmailMock = emailOtpMailer.sendPurposeOtpEmail as jest.MockedFunction<
	typeof emailOtpMailer.sendPurposeOtpEmail
>;
const sendRegisterOtpEmailMock = emailOtpMailer.sendRegisterOtpEmail as jest.MockedFunction<
	typeof emailOtpMailer.sendRegisterOtpEmail
>;

const bcryptHashMock = bcrypt.hash as unknown as jest.Mock;
const bcryptCompareMock = bcrypt.compare as unknown as jest.Mock;

const makeUnverifiedUser = (overrides: Record<string, unknown> = {}) =>
	({
		id: "user-test-id",
		email: "owner@bizassist.app",
		rawEmail: "owner@bizassist.app",
		passwordHash: "hashed-password",
		firstName: "Biz",
		lastName: "Owner",
		tokenVersion: 0,
		emailVerified: false,
		emailVerifiedAt: null,
		isActive: true,
		...overrides,
	}) as any;

describe("auth.service OTP email flows", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		bcryptHashMock.mockImplementation(async () => "hashed-password");
		bcryptCompareMock.mockImplementation(async () => true);
		upsertEmailOtpMock.mockResolvedValue({} as any);
		sendRegisterOtpEmailMock.mockResolvedValue(undefined);
		sendPurposeOtpEmailMock.mockResolvedValue(undefined);
		findEmailOtpByUserPurposeMock.mockResolvedValue(null);
	});

	test("registerUser stores OTP and sends registration email", async () => {
		findUserByEmailMock.mockResolvedValue(null);
		createUserMock.mockResolvedValue(makeUnverifiedUser());

		const result = await registerUser({
			firstName: "Biz",
			lastName: "Owner",
			email: "owner@bizassist.app",
			password: "StrongPass123!",
		});

		expect(result.requiresEmailVerification).toBe(true);
		expect(upsertEmailOtpMock).toHaveBeenCalledTimes(1);
		expect(sendRegisterOtpEmailMock).toHaveBeenCalledTimes(1);
		expect(sendRegisterOtpEmailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "owner@bizassist.app",
				minutesValid: 10,
			})
		);
	});

	test("resendEmailOtp sends REGISTER OTP for unverified users", async () => {
		findUserByEmailMock.mockResolvedValue(makeUnverifiedUser({ id: "user-resend-id" }));

		const result = await resendEmailOtp({
			email: "owner@bizassist.app",
			purpose: "REGISTER",
		});

		expect(result.sent).toBe(true);
		expect(upsertEmailOtpMock).toHaveBeenCalledTimes(1);
		expect(sendPurposeOtpEmailMock).toHaveBeenCalledTimes(1);
		expect(sendPurposeOtpEmailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "owner@bizassist.app",
				purpose: "REGISTER",
				minutesValid: 10,
			})
		);
	});

	test("loginUser blocks unverified accounts and triggers OTP resend flow", async () => {
		findUserByEmailMock.mockResolvedValue(makeUnverifiedUser({ id: "user-login-id" }));

		const promise = loginUser({
			email: "owner@bizassist.app",
			password: "StrongPass123!",
		});

		await expect(promise).rejects.toBeInstanceOf(AppError);
		await expect(promise).rejects.toMatchObject({
			statusCode: StatusCodes.FORBIDDEN,
			code: "EMAIL_VERIFICATION_REQUIRED",
		});

		expect(sendPurposeOtpEmailMock).toHaveBeenCalledTimes(1);
	});

	test("registerUser returns EMAIL_PROVIDER_ERROR when email provider fails", async () => {
		findUserByEmailMock.mockResolvedValue(null);
		createUserMock.mockResolvedValue(makeUnverifiedUser({ id: "user-provider-error-id" }));
		sendRegisterOtpEmailMock.mockRejectedValue(
			new AppError(StatusCodes.SERVICE_UNAVAILABLE, "Email delivery is temporarily unavailable.", {
				code: "EMAIL_PROVIDER_ERROR",
			})
		);

		const promise = registerUser({
			firstName: "Biz",
			lastName: "Owner",
			email: "owner@bizassist.app",
			password: "StrongPass123!",
		});

		await expect(promise).rejects.toBeInstanceOf(AppError);
		await expect(promise).rejects.toMatchObject({
			statusCode: StatusCodes.SERVICE_UNAVAILABLE,
			code: "EMAIL_PROVIDER_ERROR",
		});
	});
});
