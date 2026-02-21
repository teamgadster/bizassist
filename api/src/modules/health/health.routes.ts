// path: src/modules/health/health.routes.ts
import { Router } from "express";
import { handleHealthCheck, handleReadinessCheck } from "@/modules/health/health.controller";

const router = Router();

router.get("/", handleHealthCheck);
router.get("/live", handleHealthCheck);
router.get("/ready", handleReadinessCheck);

export { router as healthRoutes };
