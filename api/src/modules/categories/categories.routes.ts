// BizAssist_api path: src/modules/categories/categories.routes.ts

import { Router } from "express";

import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import { authMiddleware } from "@/core/middleware/auth";

import {
	archiveCategory,
	createCategory,
	listCategories,
	listCategoriesForPicker,
	listHiddenCategories,
	patchCategoryVisibility,
	restoreCategory,
	updateCategory,
} from "@/modules/categories/categories.controller";

export const categoriesRoutes = Router();

categoriesRoutes.use(authMiddleware);
categoriesRoutes.use(requireActiveBusiness);

categoriesRoutes.get("/visibility", listHiddenCategories);
categoriesRoutes.patch("/visibility", patchCategoryVisibility);

categoriesRoutes.get("/picker", listCategoriesForPicker);

categoriesRoutes.get("/", listCategories);
categoriesRoutes.post("/", createCategory);

// IMPORTANT: keep this BEFORE "/:id" to avoid route capture.
categoriesRoutes.patch("/:id/restore", restoreCategory);

categoriesRoutes.patch("/:id", updateCategory);
categoriesRoutes.delete("/:id", archiveCategory);

export default categoriesRoutes;
