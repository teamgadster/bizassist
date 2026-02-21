// path: src/modules/inventory/inventory.routes.ts
import { Router } from "express";

import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import { validateBody } from "@/shared/middleware/validateBody";

import {
	adjustStock,
	getInventoryProductDetail,
	getInventoryWatermark,
	listInventoryMovements,
	listLowStock,
	listReorderSuggestions,
	removeInventoryProductImage,
} from "./inventory.controller";

import { inventoryAdjustmentSchema } from "./inventory.validators";

const router = Router();

router.use(authMiddleware);
router.use(requireActiveBusiness);

// Inventory adjustments (idempotency required via body or Idempotency-Key header)
router.post("/adjustments", validateBody(inventoryAdjustmentSchema), adjustStock);
// Backward-compatible alias
router.post("/adjust", validateBody(inventoryAdjustmentSchema), adjustStock);

// Inventory views
router.get("/products/:id", getInventoryProductDetail);
router.get("/products/:id/movements", listInventoryMovements);
router.post("/products/:id/image/remove", removeInventoryProductImage);

// Offline-first change signal
router.get("/watermark", getInventoryWatermark);

// Dashboard / alerts (offline-first ETag in controllers)
router.get("/low-stock", listLowStock);
router.get("/reorder-suggestions", listReorderSuggestions);

export const inventoryRoutes = router;
