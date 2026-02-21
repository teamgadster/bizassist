// path: src/core/middleware/requestLogger.ts
import morgan from "morgan";
import type { Request } from "express";

// ANSI color codes
const color = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
};

// Custom token to colorize the status code
morgan.token("statusColor", (_, res) => {
	const status = res.statusCode;

	if (status >= 500) return `${color.red}${status}${color.reset}`;
	if (status >= 400) return `${color.yellow}${status}${color.reset}`;
	return `${color.green}${status}${color.reset}`;
});

// Log format with colored status codes
const SKIPPED_LOG_PATHS = new Set(["/api/v1/health", "/api/v1/health/live", "/favicon.ico"]);

const formatter: morgan.FormatFn = (tokens, req, res) => {
	const method = tokens.method(req, res);
	const url = tokens.url(req, res);
	const status = tokens.statusColor(req, res);
	const time = tokens["response-time"](req, res);

	return `${method} ${url} ${status} ${time} ms`;
};

const shouldSkipLog = (req: Request): boolean => {
	const rawPath = typeof req.path === "string" ? req.path : String(req.url ?? "");
	const path = rawPath.split("?")[0];
	return SKIPPED_LOG_PATHS.has(path);
};

export const requestLogger = morgan(formatter, {
	skip: (req) => shouldSkipLog(req as Request),
});
