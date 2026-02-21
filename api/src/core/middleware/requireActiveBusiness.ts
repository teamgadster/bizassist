// BizAssist_api path: src/core/middleware/requireActiveBusiness.ts
import type { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { prisma } from "@/lib/prisma";

export const requireActiveBusiness = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
	if (!req.user?.id) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized.");
	}

	// Fast-path: already attached by auth bootstrap or prior middleware
	if (req.user.activeBusinessId) {
		return next();
	}

	const user = await prisma.user.findUnique({
		where: { id: req.user.id },
		select: { activeBusinessId: true },
	});

	if (!user?.activeBusinessId) {
		throw new AppError(StatusCodes.FORBIDDEN, "BUSINESS_ACTIVATION_REQUIRED", "Business activation required.");
	}

	// ✅ Canonical: attach to req.user
	req.user.activeBusinessId = user.activeBusinessId;

	return next();
});
