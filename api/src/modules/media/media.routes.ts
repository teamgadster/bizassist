// path: src/modules/media/media.routes.ts
import { Router } from "express";

import {
	postCreateSignedUpload,
	postCommitUploadedObject,
	postRemoveProductPrimaryImage,
} from "@/modules/media/media.controller";
import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";

const router = Router();

/**
 * POST /api/v1/media/signed-upload
 * - Auth required.
 * - DO NOT requireActiveBusiness here because user-avatar/user-cover do not require a business.
 * - Service layer enforces active business only for business-scoped kinds (product-image, business-logo, business-cover).
 */
router.post("/signed-upload", authMiddleware, postCreateSignedUpload);

/**
 * POST /api/v1/media/commit
 * - Currently product-image only, therefore requires active business.
 */
router.post("/commit", authMiddleware, requireActiveBusiness, postCommitUploadedObject);

/**
 * POST /api/v1/media/product-image/remove
 * - Auth + Active business required.
 * - Clears Product.primaryImageUrl and de-primary existing ProductImage rows.
 */
router.post("/product-image/remove", authMiddleware, requireActiveBusiness, postRemoveProductPrimaryImage);

export const mediaRoutes = router;
export default mediaRoutes;
