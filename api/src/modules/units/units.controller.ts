// BizAssist_api path: src/modules/units/units.controller.ts

import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { prisma } from "@/lib/prisma";
import { UnitsService } from "@/modules/units/units.service";
import { UnitsVisibilityService } from "@/modules/units/units.visibility.service";
import {
	createUnitBodySchema,
	listUnitsPickerQuerySchema,
	listUnitsQuerySchema,
	updateUnitBodySchema,
	visibilityPatchSchema,
} from "@/modules/units/units.validators";

const service = new UnitsService(prisma);
const visibilityService = new UnitsVisibilityService(prisma);

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

function getUserId(req: Request): string {
	return req.user!.id;
}

function parseIncludeArchived(value?: "1" | "true" | "0" | "false"): boolean {
	if (!value) {
		return false;
	}

	return value === "1" || value === "true";
}

export const listCatalog = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
	const items = await service.listCatalog();
	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const listUnits = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const query = listUnitsQuerySchema.parse(req.query);

	const items = await service.listBusinessUnits(businessId, {
		includeArchived: parseIncludeArchived(query.includeArchived),
		category: query.category,
	});

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const listUnitsForPicker = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);
	const query = listUnitsPickerQuerySchema.parse(req.query);

	const items = await visibilityService.listPickerUnits(userId, businessId, {
		category: query.category,
		includeHiddenSelectedUnitId: query.includeHiddenSelectedUnitId,
	});

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const createUnit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = createUnitBodySchema.parse(req.body);

	const item = await service.create(businessId, body);

	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const updateUnit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");
	const body = updateUnitBodySchema.parse(req.body);

	const item = await service.update(businessId, id, body);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const archiveUnit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	const item = await service.archive(businessId, id);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const restoreUnit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	const item = await service.restore(businessId, id);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const listHiddenUnits = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);

	const hiddenUnitIds = await visibilityService.listHiddenUnitIds(userId, businessId);

	res.status(StatusCodes.OK).json({ success: true, data: { hiddenUnitIds } });
});

export const patchUnitVisibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const userId = getUserId(req);
	const body = visibilityPatchSchema.parse(req.body);

	if (body.action === "HIDE") {
		await visibilityService.hideUnit(userId, businessId, body.unitId);
	} else {
		await visibilityService.restoreUnit(userId, businessId, body.unitId);
	}

	res.status(StatusCodes.OK).json({
		success: true,
		data: { ok: true, unitId: body.unitId, action: body.action },
	});
});
