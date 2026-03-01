import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import {
	archiveAttribute,
	createAttribute,
	getAttribute,
	listAttributes,
	patchAttribute,
	restoreAttribute,
} from "./attributes.controller";

export const attributesRoutes = Router();

attributesRoutes.use(authMiddleware);
attributesRoutes.use(requireActiveBusiness);

attributesRoutes.get("/", listAttributes);
attributesRoutes.get("/:id", getAttribute);
attributesRoutes.post("/", createAttribute);
attributesRoutes.patch("/:id", patchAttribute);
attributesRoutes.post("/:id/archive", archiveAttribute);
attributesRoutes.post("/:id/restore", restoreAttribute);
