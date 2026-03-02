-- DropIndex
DROP INDEX "InventoryMovement_businessId_productId_createdAt_idx";

-- DropIndex
DROP INDEX "ProductModifierGroup_businessId_productId_sortOrder_idx";

-- CreateIndex
CREATE INDEX "InventoryMovement_businessId_productId_createdAt_id_idx" ON "InventoryMovement"("businessId", "productId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Product_businessId_isActive_updatedAt_id_idx" ON "Product"("businessId", "isActive", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "ProductImage_businessId_productId_isPrimary_idx" ON "ProductImage"("businessId", "productId", "isPrimary");

-- CreateIndex
CREATE INDEX "ProductModifierGroup_businessId_productId_sortOrder_created_idx" ON "ProductModifierGroup"("businessId", "productId", "sortOrder", "createdAt");
