// path: src/modules/index.ts
import { Router } from "express";

// Core / system modules
import { healthRoutes } from "@/modules/health/health.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { businessRoutes } from "@/modules/business/business.routes";
import { metaRoutes } from "@/modules/meta/meta.routes";

// Product workflows
import { catalogRoutes } from "@/modules/catalog/catalog.routes";
import { inventoryRoutes } from "@/modules/inventory/inventory.routes";
import { posRoutes } from "@/modules/pos/pos.routes";
import { categoriesRoutes } from "@/modules/categories/categories.routes";
import { discountsRoutes } from "@/modules/discounts/discounts.routes";

// Media (Supabase Storage)
import { mediaRoutes } from "@/modules/media/media.routes";
import unitsRoutes from "@/modules/units/units.routes";
import { modifiersRoutes } from "@/modules/modifiers/modifiers.routes";

export const apiRouter = Router();

// ─────────────────────────────────────────────────────────────
// Core / system
// ─────────────────────────────────────────────────────────────
apiRouter.use("/health", healthRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/business", businessRoutes);
apiRouter.use("/meta", metaRoutes);

// ─────────────────────────────────────────────────────────────
// Product workflows (Inventory & POS masterplan)
// ─────────────────────────────────────────────────────────────
apiRouter.use("/catalog", catalogRoutes);
apiRouter.use("/inventory", inventoryRoutes);
apiRouter.use("/pos", posRoutes);

// ─────────────────────────────────────────────────────────────
// Media (Supabase signed upload + commit)
// ─────────────────────────────────────────────────────────────
apiRouter.use("/media", mediaRoutes);

// ─────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────
apiRouter.use("/categories", categoriesRoutes);

// ─────────────────────────────────────────────────────────────
// Discounts
// ─────────────────────────────────────────────────────────────
apiRouter.use("/discounts", discountsRoutes);

// ─────────────────────────────────────────────────────────────
// Unit of measures
// ─────────────────────────────────────────────────────────────
apiRouter.use("/units", unitsRoutes);
apiRouter.use("/modifiers", modifiersRoutes);
