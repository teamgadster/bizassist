// path: src/modules/meta/meta.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { listCountries } from "@/modules/meta/meta.service";

/**
 * GET /api/v1/meta/countries
 * Optional query: ?q=<search>
 */
export const handleListCountries = asyncHandler(async (req: Request, res: Response) => {
	const q = typeof req.query.q === "string" ? req.query.q : undefined;

	const data = listCountries(q);

	res.status(StatusCodes.OK).json({
		success: true,
		data,
	});
});
