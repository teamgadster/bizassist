// BizAssist_api path: src/modules/units/units.routes.ts

import { Router } from "express";

import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import { authMiddleware } from "@/core/middleware/auth";
import {
	archiveUnit,
	createUnit,
	listCatalog,
	listHiddenUnits,
	listUnitsForPicker,
	listUnits,
	patchUnitVisibility,
	restoreUnit,
	updateUnit,
} from "@/modules/units/units.controller";

const unitsRoutes = Router();

unitsRoutes.use(authMiddleware);
unitsRoutes.use(requireActiveBusiness);

unitsRoutes.get("/catalog", listCatalog);
unitsRoutes.get("/visibility", listHiddenUnits);
unitsRoutes.patch("/visibility", patchUnitVisibility);
unitsRoutes.get("/picker", listUnitsForPicker);
unitsRoutes.get("/", listUnits);
unitsRoutes.post("/", createUnit);

// IMPORTANT: keep this BEFORE "/:id" to avoid route capture.
unitsRoutes.patch("/:id/restore", restoreUnit);

unitsRoutes.patch("/:id", updateUnit);
unitsRoutes.delete("/:id", archiveUnit);

export default unitsRoutes;
