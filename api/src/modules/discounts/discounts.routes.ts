// BizAssist_api path: src/modules/discounts/discounts.routes.ts

import { Router } from "express";

import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import {
	createDiscount,
	getDiscount,
	listDiscounts,
	listDiscountsForPicker,
	listHiddenDiscounts,
	patchDiscountVisibility,
	archiveDiscount,
	restoreDiscount,
	updateDiscount,
} from "@/modules/discounts/discounts.controller";

export const discountsRoutes = Router();

discountsRoutes.use(authMiddleware);
discountsRoutes.use(requireActiveBusiness);

discountsRoutes.get("/visibility", listHiddenDiscounts);
discountsRoutes.patch("/visibility", patchDiscountVisibility);

discountsRoutes.get("/picker", listDiscountsForPicker);

discountsRoutes.get("/", listDiscounts);
discountsRoutes.get("/:id", getDiscount);
discountsRoutes.post("/", createDiscount);
// IMPORTANT: keep this BEFORE "/:id" to avoid route capture.
discountsRoutes.patch("/:id/restore", restoreDiscount);
discountsRoutes.patch("/:id/archive", archiveDiscount);
discountsRoutes.patch("/:id", updateDiscount);
