// path: src/shared/middleware/validateBody.ts

import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError, type ZodSchema } from "zod";

import { AppError } from "@/core/errors/AppError";

type FieldErrors = Record<string, string[]>;

const toFieldErrors = (err: ZodError): FieldErrors => {
	const flattened = err.flatten();
	// Zod gives string[] per field
	return flattened.fieldErrors as FieldErrors;
};

/**
 * validateBody
 * - Parses req.body using Zod schema
 * - On validation failure, forwards a standardized AppError so the global errorHandler
 *   returns the canonical envelope: { success:false, message, code, data? }
 */
export const validateBody =
	<T>(schema: ZodSchema<T>) =>
	(req: Request, _res: Response, next: NextFunction): void => {
		try {
			const parsed = schema.parse(req.body);
			req.body = parsed as any;
			next();
		} catch (err) {
			if (err instanceof ZodError) {
				return next(
					new AppError(StatusCodes.BAD_REQUEST, "Validation error", "VALIDATION_ERROR", {
						fields: toFieldErrors(err),
					})
				);
			}
			next(err as any);
		}
	};
