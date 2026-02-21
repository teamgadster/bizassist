// path: src/modules/business/business.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { AuditStatus } from "@prisma/client";

import { activateBusiness, fetchActiveBusiness } from "@/modules/business/business.service";
import { auditBusinessCreate } from "@/modules/audit/audit.service";
import type { CreateBusinessDto } from "@/modules/business/business.validators";

type RequestContext = {
	ip: string | null;
	userAgent: string | null;
	correlationId: string | null;
};

const getRequestContext = (req: Request): RequestContext => ({
	ip: req.ip ?? null,
	userAgent: req.get("user-agent") ?? null,
	correlationId: (req as any).correlationId ?? null,
});

export const handleCreateBusiness = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const user = req.user;

	if (!user) {
		res.status(StatusCodes.UNAUTHORIZED).json({
			success: false,
			message: "You must be logged in to continue.",
			code: "UNAUTHORIZED",
		});
		return;
	}

	const payload = req.body as CreateBusinessDto;
	const ctx = getRequestContext(req);

	try {
		const result = await activateBusiness(user.id, payload);

		if (result.alreadyExists) {
			await auditBusinessCreate({
				status: AuditStatus.SUCCESS,
				userId: user.id,
				email: user.email,
				ip: ctx.ip,
				userAgent: ctx.userAgent,
				correlationId: ctx.correlationId,
				reason: "BUSINESS_ALREADY_ACTIVE",
			});

			res.status(StatusCodes.OK).json({
				success: true,
				message: "Business already set up.",
				data: result.context,
			});
			return;
		}

		await auditBusinessCreate({
			status: AuditStatus.SUCCESS,
			userId: user.id,
			email: user.email,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
			correlationId: ctx.correlationId,
			reason: "BUSINESS_CREATED_AND_ACTIVATED",
		});

		res.status(StatusCodes.CREATED).json({
			success: true,
			message: "Your business is ready.",
			data: {
				business: result.business,
				defaultStore: result.store,
				staffMembership: result.membership,
			},
		});
	} catch (err) {
		await auditBusinessCreate({
			status: AuditStatus.FAIL,
			userId: user.id,
			email: user.email,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
			correlationId: ctx.correlationId,
			reason: "BUSINESS_CREATE_FAILED",
		});
		throw err;
	}
});

export const handleGetActiveBusiness = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const user = req.user;

	if (!user) {
		res.status(StatusCodes.UNAUTHORIZED).json({
			success: false,
			message: "You must be logged in to continue.",
			code: "UNAUTHORIZED",
		});
		return;
	}

	const active = await fetchActiveBusiness(user.id);

	res.status(StatusCodes.OK).json({
		success: true,
		data: active,
	});
});
