import { Router } from "express";

import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import {
	archiveSalesTax,
	createSalesTax,
	getSalesTax,
	listSalesTaxes,
	restoreSalesTax,
	updateSalesTax,
} from "@/modules/taxes/taxes.controller";

export const taxesRoutes = Router();

taxesRoutes.use(authMiddleware);
taxesRoutes.use(requireActiveBusiness);

taxesRoutes.get("/", listSalesTaxes);
taxesRoutes.get("/:id", getSalesTax);
taxesRoutes.post("/", createSalesTax);
taxesRoutes.patch("/:id/restore", restoreSalesTax);
taxesRoutes.patch("/:id/archive", archiveSalesTax);
taxesRoutes.patch("/:id", updateSalesTax);
