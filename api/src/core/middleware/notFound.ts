// path: src/core/middleware/notFound.ts
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

export const notFound = (req: Request, res: Response, _next: NextFunction): void => {
	res.status(StatusCodes.NOT_FOUND).json({
		success: false,
		message: `Route not found: ${req.method} ${req.originalUrl}`,
	});
};
