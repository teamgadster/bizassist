// BizAssist_api path: src/modules/categories/categories.controller.ts

import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { prisma } from "@/lib/prisma";
import { CategoriesService } from "@/modules/categories/categories.service";
import { CategoriesVisibilityService } from "@/modules/categories/categories.visibility.service";
import {
	categoryVisibilityPatchSchema,
	createCategoryBodySchema,
	listCategoriesQuerySchema,
	updateCategoryBodySchema,
} from "@/modules/categories/categories.validators";

const service = new CategoriesService(prisma);
const visibilityService = new CategoriesVisibilityService(prisma);

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

function getUserId(req: Request): string {
	return req.user!.id;
}

export const listCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const query = listCategoriesQuerySchema.parse(req.query);

	const items = await service.list(businessId, {
		q: query.q,
		isActive: query.isActive,
		limit: query.limit,
	});

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const listCategoriesForPicker = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);

	// keep query surface minimal & forward-compatible
	const q = typeof req.query.q === "string" ? req.query.q : undefined;
	const includeSelectedCategoryId =
		typeof req.query.includeSelectedCategoryId === "string" ? req.query.includeSelectedCategoryId : undefined;

	const items = await visibilityService.listPickerCategories(userId, businessId, {
		q,
		includeHiddenSelectedCategoryId: includeSelectedCategoryId,
	});

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = createCategoryBodySchema.parse(req.body);

	const item = await service.create(businessId, body);

	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");
	const body = updateCategoryBodySchema.parse(req.body);

	const item = await service.update(businessId, id, body);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const archiveCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	await service.archive(businessId, id);

	res.status(StatusCodes.OK).json({ success: true });
});

export const restoreCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	await service.restore(businessId, id);

	res.status(StatusCodes.OK).json({ success: true });
});

export const listHiddenCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);

	const ids = await visibilityService.listHiddenCategoryIds(userId, businessId);

	res.status(StatusCodes.OK).json({ success: true, data: { ids } });
});

export const patchCategoryVisibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);
	const body = categoryVisibilityPatchSchema.parse(req.body);

	if (body.action === "HIDE") {
		await visibilityService.hideCategory(userId, businessId, body.categoryId);
	} else {
		await visibilityService.restoreCategory(userId, businessId, body.categoryId);
	}

	res.status(StatusCodes.OK).json({ success: true });
});
