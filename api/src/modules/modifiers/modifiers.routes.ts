import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import {
	applySharedModifierAvailability,
	archiveModifierGroup,
	archiveModifierOption,
	createModifierGroup,
	createModifierOption,
	getSharedModifierAvailabilityPreview,
	getModifierGroup,
	listModifierGroups,
	getProductModifiers,
	patchModifierGroup,
	patchModifierOption,
	replaceProductModifiers,
	syncModifierGroupProducts,
	restoreModifierGroup,
	restoreModifierOption,
} from "./modifiers.controller";

export const modifiersRoutes = Router();

modifiersRoutes.use(authMiddleware);
modifiersRoutes.use(requireActiveBusiness);

modifiersRoutes.get("/products/:id/modifiers", getProductModifiers);
modifiersRoutes.put("/products/:id/modifiers", replaceProductModifiers);
modifiersRoutes.post("/products/modifiers/sync", syncModifierGroupProducts);
modifiersRoutes.get("/groups", listModifierGroups);
modifiersRoutes.get("/groups/:id", getModifierGroup);
modifiersRoutes.post("/groups", createModifierGroup);
modifiersRoutes.patch("/modifier-groups/:id", patchModifierGroup);
modifiersRoutes.post("/modifier-groups/:id/options", createModifierOption);
modifiersRoutes.patch("/modifier-options/:id", patchModifierOption);
modifiersRoutes.post("/modifier-groups/:id/archive", archiveModifierGroup);
modifiersRoutes.post("/modifier-groups/:id/restore", restoreModifierGroup);
modifiersRoutes.post("/modifier-options/:id/archive", archiveModifierOption);
modifiersRoutes.post("/modifier-options/:id/restore", restoreModifierOption);
modifiersRoutes.get("/modifier-options/:id/shared-availability", getSharedModifierAvailabilityPreview);
modifiersRoutes.post("/modifier-options/:id/shared-availability", applySharedModifierAvailability);
