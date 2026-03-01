import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "@/lib/prisma";
import { AttributesService } from "./attributes.service";
import type { CreateAttributeInput, ReplaceProductAttributesInput, UpdateAttributeInput } from "./attributes.types";
import {
	attributeIdParamSchema,
	listAttributesQuerySchema,
	createAttributeSchema,
	updateAttributeSchema,
	productIdParamSchema,
	replaceProductAttributesSchema,
} from "./attributes.validators";

const service = new AttributesService(prisma);

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

export const listAttributes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const query = listAttributesQuerySchema.parse(req.query);
	const items = await service.listAttributes(businessId, query.includeArchived === true);
	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const getAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = attributeIdParamSchema.parse(req.params);
	const item = await service.getAttributeById(businessId, id);
	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const createAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = createAttributeSchema.parse(req.body) as CreateAttributeInput;
	const item = await service.createAttribute(businessId, body);
	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const patchAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = attributeIdParamSchema.parse(req.params);
	const body = updateAttributeSchema.parse(req.body) as UpdateAttributeInput;
	const item = await service.updateAttribute(businessId, id, body);
	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const archiveAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = attributeIdParamSchema.parse(req.params);
	await service.archiveAttribute(businessId, id, true);
	res.status(StatusCodes.OK).json({ success: true });
});

export const restoreAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = attributeIdParamSchema.parse(req.params);
	await service.archiveAttribute(businessId, id, false);
	res.status(StatusCodes.OK).json({ success: true });
});

export const getProductAttributes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = productIdParamSchema.parse(req.params);
	const items = await service.getProductAttributes(businessId, id);
	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const replaceProductAttributes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const { id } = productIdParamSchema.parse(req.params);
	const body = replaceProductAttributesSchema.parse(req.body) as ReplaceProductAttributesInput;
	const items = await service.replaceProductAttributes(businessId, id, body);
	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});
