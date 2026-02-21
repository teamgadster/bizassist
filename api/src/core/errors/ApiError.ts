// BizAssist_api
// path: src/core/errors/ApiError.ts

import { AppError, type AppErrorOptions } from "@/core/errors/AppError";

/**
 * Backward-compatible alias used across modules.
 * Keep this file to satisfy imports like "@/core/errors/ApiError".
 */
export class ApiError extends AppError {
	constructor(statusCode: number, message: string, options?: AppErrorOptions);
	constructor(statusCode: number, message: string, code?: string, data?: unknown);
	constructor(statusCode: number, message: string, codeOrOptions?: string | AppErrorOptions, data?: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		super(statusCode, message, codeOrOptions as any, data);
		this.name = "ApiError";
	}
}
