// BizAssist_api
// path: src/core/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
import { StatusCodes, getReasonPhrase } from "http-status-codes";

interface ApiError extends Error {
	statusCode?: number;
	status?: number;
	code?: string | number;
	data?: unknown;

	// common for third-party SDK errors (e.g., SES)
	response?: {
		statusCode?: number;
		body?: unknown;
	};

	// common for validation libs (e.g., Zod) without importing the lib here
	issues?: unknown;
}

const coerceStatusCode = (err: ApiError): number => {
	if (typeof err.statusCode === "number") return err.statusCode;
	if (typeof err.status === "number") return err.status;
	if (typeof err.response?.statusCode === "number") return err.response.statusCode;
	if (typeof err.code === "number") return err.code;
	return StatusCodes.INTERNAL_SERVER_ERROR;
};

const statusToDefaultCode = (status: number): string => {
	if (status === StatusCodes.UNAUTHORIZED) return "UNAUTHORIZED";
	if (status === StatusCodes.FORBIDDEN) return "FORBIDDEN";
	if (status === StatusCodes.NOT_FOUND) return "NOT_FOUND";
	if (status === StatusCodes.TOO_MANY_REQUESTS) return "RATE_LIMITED";
	if (status === 413) return "PAYLOAD_TOO_LARGE";
	if (status === StatusCodes.UNSUPPORTED_MEDIA_TYPE) return "UNSUPPORTED_MEDIA_TYPE";
	if (status >= 500) return "INTERNAL_SERVER_ERROR";
	return "BAD_REQUEST";
};

const isValidationError = (err: ApiError): boolean => {
	// Zod: err.name === "ZodError" and err.issues is an array
	if (err?.name === "ZodError") return true;
	// fallback: many validators use `issues`
	if (typeof (err as any)?.issues !== "undefined") return true;
	return false;
};

type ErrorEnvelope = {
	success: false;
	error: {
		code: string;
		message: string;
	};
	data?: unknown;
	stack?: string;
};

export const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
	const statusCode = coerceStatusCode(err);

	// Validation normalization
	if (isValidationError(err)) {
		const message = "Validation failed.";
		const payload: ErrorEnvelope = {
			success: false,
			error: { code: "VALIDATION_ERROR", message },
			data: { issues: (err as any)?.issues },
			...(process.env.NODE_ENV === "development" && process.env.SHOW_STACK === "true" ? { stack: err.stack } : {}),
		};

		if (process.env.NODE_ENV === "development") {
			console.error(`[Error] ${StatusCodes.BAD_REQUEST} ${message}`);
			if ((err as any)?.issues)
				console.error(`[Error][ValidationIssues]`, JSON.stringify((err as any).issues, null, 2));
		}

		res.status(StatusCodes.BAD_REQUEST).json(payload);
		return;
	}

	const message = err.message || getReasonPhrase(statusCode);

	// IMPORTANT: mobile expects err.response.data.error.code
	const code = err.code ? String(err.code) : statusToDefaultCode(statusCode);

	if (process.env.NODE_ENV === "development") {
		console.error(`[Error] ${statusCode} ${message}`);
		if (err.code) console.error(`[ErrorCode]`, err.code);

		// Provider diagnostics (safe for dev logs; do NOT echo to client)
		if (err.response?.statusCode) console.error(`[Error][ProviderStatus]`, err.response.statusCode);
		if (err.response?.body) console.error(`[Error][ProviderBody]`, JSON.stringify(err.response.body, null, 2));
	}

	const payload: ErrorEnvelope = {
		success: false,
		error: { code, message },
		...(typeof err.data !== "undefined" ? { data: err.data } : {}),
		...(process.env.NODE_ENV === "development" && process.env.SHOW_STACK === "true" ? { stack: err.stack } : {}),
	};

	res.status(statusCode).json(payload);
};
