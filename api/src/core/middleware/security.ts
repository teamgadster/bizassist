// path: src/core/middleware/security.ts
import type { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOptions } from "@/core/config/http";

export const registerSecurityMiddleware = (app: Application): void => {
	app.use(helmet());
	app.use(cors(corsOptions));
};
