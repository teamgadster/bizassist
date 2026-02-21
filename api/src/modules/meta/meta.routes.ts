// path: src/modules/meta/meta.routes.ts

import { Router } from "express";
import { handleListCountries } from "@/modules/meta/meta.controller";

const router = Router();

// GET /api/v1/meta/countries?q=phil
router.get("/countries", handleListCountries);

export { router as metaRoutes };
