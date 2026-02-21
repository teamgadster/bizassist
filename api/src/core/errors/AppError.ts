// BizAssist_api
// path: src/core/errors/AppError.ts

const ERROR_CODE_PATTERN = /^[A-Z0-9_]+$/;

function looksLikeErrorCode(value: string): boolean {
	return ERROR_CODE_PATTERN.test(value);
}

function safeString(value: unknown): string {
	if (typeof value === "string") return value;
	try {
		return String(value);
	} catch {
		return "Unknown error";
	}
}

export type AppErrorOptions = {
	code?: string;
	data?: unknown;
	cause?: unknown;
};

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code?: string;
	public readonly data?: unknown;

	/**
	 * Kept as readonly field for diagnostics, even if runtime Error.cause is not supported.
	 * Do NOT rely on built-in ErrorOptions typing across TS configs.
	 */
	public readonly cause?: unknown;

	constructor(statusCode: number, message: string, options?: AppErrorOptions);
	constructor(statusCode: number, message: string, code?: string, data?: unknown);
	constructor(statusCode: number, message: string, codeOrOptions?: string | AppErrorOptions, data?: unknown) {
		const rawMessage = safeString(message);

		let finalMessage = rawMessage;
		let finalCode: string | undefined;
		let finalData: unknown = undefined;
		let finalCause: unknown = undefined;

		if (typeof codeOrOptions === "string") {
			let code = codeOrOptions;

			// Backward-compatible normalization: tolerate swapped (code, message) order.
			if (looksLikeErrorCode(rawMessage) && !looksLikeErrorCode(code)) {
				finalMessage = code;
				code = rawMessage;
			}

			finalCode = code;
			finalData = data;
		} else if (codeOrOptions && typeof codeOrOptions === "object") {
			finalCode = codeOrOptions.code;
			finalData = codeOrOptions.data;
			finalCause = codeOrOptions.cause;
		}

		// Normalize code: drop invalid patterns to keep codes stable
		if (finalCode && !looksLikeErrorCode(finalCode)) {
			finalCode = undefined;
		}

		// IMPORTANT:
		// Avoid passing ErrorOptions to super() to prevent TS/lib mismatch:
		// "Expected 0-1 arguments, but got 2."
		super(finalMessage);

		this.name = "AppError";
		this.statusCode = statusCode;
		this.message = finalMessage;
		this.code = finalCode;
		this.data = finalData;
		this.cause = finalCause;

		// Populate runtime Error.cause when supported (best-effort)
		if (finalCause !== undefined) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(this as any).cause = finalCause;
			} catch {
				// ignore
			}
		}

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}

	toJSON() {
		return {
			name: this.name,
			statusCode: this.statusCode,
			code: this.code,
			message: this.message,
			data: this.data,
		};
	}

	static badRequest(message: string, code?: string, data?: unknown) {
		return new AppError(400, message, code, data);
	}
	static unauthorized(message: string, code?: string, data?: unknown) {
		return new AppError(401, message, code, data);
	}
	static forbidden(message: string, code?: string, data?: unknown) {
		return new AppError(403, message, code, data);
	}
	static notFound(message: string, code?: string, data?: unknown) {
		return new AppError(404, message, code, data);
	}
	static conflict(message: string, code?: string, data?: unknown) {
		return new AppError(409, message, code, data);
	}
	static tooManyRequests(message: string, code?: string, data?: unknown) {
		return new AppError(429, message, code, data);
	}
	static internal(message: string, code?: string, data?: unknown) {
		return new AppError(500, message, code, data);
	}
}
