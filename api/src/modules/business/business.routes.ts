// path: src/modules/business/business.routes.ts

import { Router } from "express";

import { authMiddleware } from "@/core/middleware/auth";
import { validateBody } from "@/shared/middleware/validateBody";
import { handleCreateBusiness, handleGetActiveBusiness } from "@/modules/business/business.controller";
import { createBusinessSchema } from "@/modules/business/business.validators";

const router = Router();

// POST /api/v1/business/create
router.post("/create", authMiddleware, validateBody(createBusinessSchema), handleCreateBusiness);

// GET /api/v1/business/active
router.get("/active", authMiddleware, handleGetActiveBusiness);

export { router as businessRoutes };
