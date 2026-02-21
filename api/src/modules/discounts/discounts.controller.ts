// BizAssist_api path: src/modules/discounts/discounts.controller.ts

import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { prisma } from "@/lib/prisma";
import { DiscountsService } from "@/modules/discounts/discounts.service";
import { DiscountsVisibilityService } from "@/modules/discounts/discounts.visibility.service";
import {
	createDiscountBodySchema,
	discountVisibilityPatchSchema,
	listDiscountsQuerySchema,
	listDiscountsPickerQuerySchema,
	updateDiscountBodySchema,
} from "@/modules/discounts/discounts.validators";

const service = new DiscountsService(prisma);
const visibilityService = new DiscountsVisibilityService(prisma);

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

function getUserId(req: Request): string {
	return req.user!.id;
}

function parseIncludeArchived(value?: "1" | "true" | "0" | "false"): boolean {
	if (!value) return false;
	return value === "1" || value === "true";
}

export const listDiscounts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const query = listDiscountsQuerySchema.parse(req.query);

	const items = await service.list(businessId, {
		q: query.q,
		type: query.type,
		isActive: query.isActive,
		includeArchived: parseIncludeArchived(query.includeArchived),
		limit: query.limit,
	});

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const listDiscountsForPicker = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);
	const query = listDiscountsPickerQuerySchema.parse(req.query);

	const items = await visibilityService.listPickerDiscounts(userId, businessId, {
		q: query.q,
	});

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const getDiscount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	const item = await service.getById(businessId, id);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const createDiscount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = createDiscountBodySchema.parse(req.body);

	const item = await service.create(businessId, body);

	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const updateDiscount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");
	const body = updateDiscountBodySchema.parse(req.body);

	const item = await service.update(businessId, id, body);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const archiveDiscount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	await service.archive(businessId, id);

	res.status(StatusCodes.OK).json({ success: true });
});

export const restoreDiscount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	await service.restore(businessId, id);

	res.status(StatusCodes.OK).json({ success: true });
});

export const listHiddenDiscounts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);

	const hiddenDiscountIds = await visibilityService.listHiddenDiscountIds(userId, businessId);

	res.status(StatusCodes.OK).json({ success: true, data: { hiddenDiscountIds } });
});

export const patchDiscountVisibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);
	const body = discountVisibilityPatchSchema.parse(req.body);

	if (body.action === "HIDE") {
		await visibilityService.hideDiscount(userId, businessId, body.discountId);
	} else {
		await visibilityService.restoreDiscount(userId, businessId, body.discountId);
	}

	res.status(StatusCodes.OK).json({
		success: true,
		data: { ok: true, discountId: body.discountId, action: body.action },
	});
});
