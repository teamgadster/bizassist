// path: src/modules/catalog/catalog.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import catalogService from "./catalog.service";
import type { CreateProductInput, UpdateProductInput } from "./catalog.types";
import { listProductsQuerySchema } from "./catalog.validators";

import { respondWithEtagJson } from "@/shared/http/etagResponse";

function getBusinessId(req: Request): string {
	return req.user!.activeBusinessId!;
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
	const businessId = getBusinessId(req);
	const query = listProductsQuerySchema.parse(req.query);

	const result = await catalogService.listProducts(businessId, query);

	const payload = { success: true, data: result };
	respondWithEtagJson(req, res, payload, StatusCodes.OK);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id);

	const product = await catalogService.getProduct(businessId, id);
	res.status(StatusCodes.OK).json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
	const businessId = getBusinessId(req);

	// validateBody(createProductSchema) guarantees shape.
	const input = req.body as CreateProductInput;

	const product = await catalogService.createProduct(businessId, input);
	res.status(StatusCodes.CREATED).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
	const businessId = getBusinessId(req);
	const id = String(req.params.id);

	// validateBody(updateProductSchema) guarantees shape.
	const input = req.body as UpdateProductInput;

	const product = await catalogService.updateProduct(businessId, id, input);
	res.status(StatusCodes.OK).json({ success: true, data: product });
});

export const getCatalogWatermark = asyncHandler(async (req: Request, res: Response) => {
	const businessId = getBusinessId(req);

	const data = await catalogService.getWatermark(businessId);
	res.status(StatusCodes.OK).json({ success: true, data });
});
