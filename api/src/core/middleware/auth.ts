// BizAssist_api
// path: src/core/middleware/auth.ts

import type { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { verifyAccessToken, type VerifiedJwtPayload } from "@/core/security/jwt";
import { AppError } from "@/core/errors/AppError";
import { prisma } from "@/lib/prisma";

type AuthedRequest = Request & {
	user?: {
		id: string;
		email: string;
		activeBusinessId?: string | null;
		role?: string;
	};
};

function extractBearerToken(req: Request): string {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "MISSING_AUTH_HEADER", "Missing or invalid Authorization header.");
	}

	const token = authHeader.substring("Bearer ".length).trim();

	if (!token) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "MISSING_BEARER_TOKEN", "Missing bearer token.");
	}

	return token;
}

function readActiveBusinessId(req: Request): string | null {
	const id = (req.get("x-active-business-id") ?? "").trim();
	return id ? id : null;
}

export const authMiddleware = asyncHandler(async (req: AuthedRequest, _res: Response, next: NextFunction) => {
	const token = extractBearerToken(req);

	const payload: VerifiedJwtPayload = verifyAccessToken(token);

	const userId = payload.sub?.trim();
	if (!userId) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "INVALID_TOKEN_PAYLOAD", "Invalid token payload.");
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			tokenVersion: true,
			isActive: true,
		},
	});

	if (!user || !user.isActive) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "USER_INACTIVE_OR_MISSING", "User not found or inactive.");
	}

	if (!user.email) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "USER_EMAIL_MISSING", "User email is missing.");
	}

	if (typeof payload.tokenVersion === "number" && payload.tokenVersion !== user.tokenVersion) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "ACCESS_TOKEN_REVOKED", "Access token is no longer valid.");
	}

	const activeBusinessId = readActiveBusinessId(req);

	req.user = { id: user.id, email: user.email, activeBusinessId };

	next();
});
