import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "@/lib/prisma";
import { ModifiersService } from "./modifiers.service";
import {
	createModifierGroupSchema,
	createModifierOptionSchema,
	groupIdParamSchema,
	listModifierGroupsQuerySchema,
	optionIdParamSchema,
	productIdParamSchema,
	replaceProductModifierGroupsSchema,
	syncModifierGroupProductsSchema,
	updateModifierGroupSchema,
	updateModifierOptionSchema,
} from "./modifiers.validators";

const service = new ModifiersService(prisma);

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

export const getProductModifiers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = productIdParamSchema.parse(req.params);
	const groups = await service.getProductModifiers(businessId, id);
	res.status(StatusCodes.OK).json({ success: true, data: { items: groups } });
});

export const replaceProductModifiers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = productIdParamSchema.parse(req.params);
	const body = replaceProductModifierGroupsSchema.parse(req.body);
	const items = await service.replaceProductGroups(businessId, id, body);
	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const syncModifierGroupProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = syncModifierGroupProductsSchema.parse(req.body);
	const result = await service.syncModifierGroupProducts(businessId, body);
	res.status(StatusCodes.OK).json({ success: true, data: result });
});

export const listModifierGroups = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const query = listModifierGroupsQuerySchema.parse(req.query);
	const items = await service.listModifierGroups(businessId, query.includeArchived === true);
	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const getModifierGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = groupIdParamSchema.parse(req.params);
	const item = await service.getModifierGroupById(businessId, id);
	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const createModifierGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = createModifierGroupSchema.parse(req.body);
	const item = await service.createGroup(businessId, body);
	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const patchModifierGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = groupIdParamSchema.parse(req.params);
	const body = updateModifierGroupSchema.parse(req.body);
	const item = await service.updateGroup(businessId, id, body);
	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const createModifierOption = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = groupIdParamSchema.parse(req.params);
	const body = createModifierOptionSchema.parse(req.body);
	const item = await service.createOption(businessId, id, body);
	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const patchModifierOption = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = optionIdParamSchema.parse(req.params);
	const body = updateModifierOptionSchema.parse(req.body);
	const item = await service.updateOption(businessId, id, body);
	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const archiveModifierGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = groupIdParamSchema.parse(req.params);
	await service.archiveGroup(businessId, id, true);
	res.status(StatusCodes.OK).json({ success: true });
});

export const restoreModifierGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = groupIdParamSchema.parse(req.params);
	await service.archiveGroup(businessId, id, false);
	res.status(StatusCodes.OK).json({ success: true });
});

export const archiveModifierOption = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = optionIdParamSchema.parse(req.params);
	await service.archiveOption(businessId, id, true);
	res.status(StatusCodes.OK).json({ success: true });
});

export const restoreModifierOption = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = optionIdParamSchema.parse(req.params);
	await service.archiveOption(businessId, id, false);
	res.status(StatusCodes.OK).json({ success: true });
});
