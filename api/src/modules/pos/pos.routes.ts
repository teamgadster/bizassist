// path: src/modules/pos/pos.routes.ts
import { Router } from "express";

import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import { validateBody } from "@/shared/middleware/validateBody";

import { checkoutSchema } from "./pos.validators";
import { handleCheckout } from "./pos.controller";

export const posRoutes = Router();

posRoutes.post("/checkout", authMiddleware, requireActiveBusiness, validateBody(checkoutSchema), handleCheckout);
