// BizAssist_api
// path: src/app.ts

import express from "express";
import { json, urlencoded } from "express";
import { apiRouter } from "@/modules";
import { env } from "@/core/config/env";
import { requestLogger } from "@/core/middleware/requestLogger";
import { errorHandler } from "@/core/middleware/errorHandler";
import { notFound } from "@/core/middleware/notFound";
import { registerSecurityMiddleware } from "@/core/middleware/security";

export const app = express();

// Reverse proxy correctness (Render/Heroku style):
// - makes req.ip work for rate-limit
// - makes req.protocol reflect x-forwarded-proto
app.set("trust proxy", 1);

registerSecurityMiddleware(app);
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(requestLogger);

// Root landing MUST be before notFound/errorHandler
app.get("/", (req, res) => {
	const basePath = "/api/v1";

	// In production behind a proxy, Render supplies x-forwarded-proto.
	const proto = req.header("x-forwarded-proto") ?? req.protocol;
	const host = req.get("host") ?? `localhost:${env.port}`;

	const baseUrl =
		env.nodeEnv === "development" ? `http://localhost:${env.port}${basePath}` : `${proto}://${host}${basePath}`;

	res.status(200).send(`BizAssist API online. Base URL: ${baseUrl}\n`);
});

// Browser tab requests for API host often ask for /favicon.ico; return no-content to avoid noisy 404 logs.
app.get("/favicon.ico", (_req, res) => {
	res.status(204).end();
});

// API routes (single source of truth)
app.use("/api/v1", apiRouter);

// 404 + error handling last
app.use(notFound);
app.use(errorHandler);
