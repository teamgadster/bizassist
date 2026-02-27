import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { prisma } from "@/lib/prisma";
import { SalesTaxesService } from "@/modules/taxes/taxes.service";
import {
	createSalesTaxBodySchema,
	listSalesTaxesQuerySchema,
	updateSalesTaxBodySchema,
} from "@/modules/taxes/taxes.validators";

const service = new SalesTaxesService(prisma);

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

function parseIncludeArchived(value?: "1" | "true" | "0" | "false"): boolean {
	if (!value) return false;
	return value === "1" || value === "true";
}

export const listSalesTaxes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const query = listSalesTaxesQuerySchema.parse(req.query);
	const includeArchived = parseIncludeArchived(query.includeArchived);

	const items = await service.list(businessId, { ...query, includeArchived });

	res.status(StatusCodes.OK).json({ success: true, data: { items } });
});

export const getSalesTax = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	const item = await service.getById(businessId, id);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const createSalesTax = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const body = createSalesTaxBodySchema.parse(req.body);

	const item = await service.create(businessId, body);

	res.status(StatusCodes.CREATED).json({ success: true, data: { item } });
});

export const updateSalesTax = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");
	const body = updateSalesTaxBodySchema.parse(req.body);

	const item = await service.update(businessId, id, body);

	res.status(StatusCodes.OK).json({ success: true, data: { item } });
});

export const archiveSalesTax = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	await service.archive(businessId, id);

	res.status(StatusCodes.OK).json({ success: true });
});

export const restoreSalesTax = asyncHandler(async (req: Request, res: Response): Promise<void> => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id || "");

	await service.restore(businessId, id);

	res.status(StatusCodes.OK).json({ success: true });
});
