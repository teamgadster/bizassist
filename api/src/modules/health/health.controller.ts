// path: src/modules/health/health.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "@/lib/prisma";

function buildBaseHealthPayload() {
	return {
		api: "BizAssist API",
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	};
}

// Liveness: lightweight endpoint for platform probes.
export const handleHealthCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
	res.status(StatusCodes.OK).json({
		status: "ok",
		check: "live",
		db: "skipped",
		...buildBaseHealthPayload(),
	});
});

// Readiness: includes a DB probe for deeper diagnostics.
export const handleReadinessCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		res.status(StatusCodes.OK).json({
			status: "ok",
			check: "ready",
			db: "ok",
			...buildBaseHealthPayload(),
		});
	} catch {
		res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
			status: "error",
			check: "ready",
			db: "error",
			...buildBaseHealthPayload(),
		});
	}
});
