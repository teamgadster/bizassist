-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "variationId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hasVariations" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SaleLineItem" ADD COLUMN     "variationId" TEXT;

-- CreateTable
CREATE TABLE "OptionSet" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "nameNormalized" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionValue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "optionSetId" TEXT NOT NULL,
    "value" VARCHAR(120) NOT NULL,
    "valueNormalized" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionSet" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "optionSetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayName" VARCHAR(180) NOT NULL,
    "variationKey" VARCHAR(400) NOT NULL,
    "sku" VARCHAR(64),
    "barcode" VARCHAR(64),
    "price" DECIMAL(12,2),
    "priceMinor" BIGINT,
    "cost" DECIMAL(12,2),
    "costMinor" BIGINT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "reorderPoint" DECIMAL(18,5),
    "onHandCached" DECIMAL(18,5) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariationOptionValue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "optionSetId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariationOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptionSet_businessId_isActive_sortOrder_idx" ON "OptionSet"("businessId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OptionSet_businessId_archivedAt_sortOrder_idx" ON "OptionSet"("businessId", "archivedAt", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "OptionSet_businessId_nameNormalized_key" ON "OptionSet"("businessId", "nameNormalized");

-- CreateIndex
CREATE INDEX "OptionValue_businessId_optionSetId_isActive_sortOrder_idx" ON "OptionValue"("businessId", "optionSetId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "OptionValue_optionSetId_valueNormalized_key" ON "OptionValue"("optionSetId", "valueNormalized");

-- CreateIndex
CREATE INDEX "ProductOptionSet_businessId_productId_sortOrder_idx" ON "ProductOptionSet"("businessId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductOptionSet_businessId_optionSetId_idx" ON "ProductOptionSet"("businessId", "optionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionSet_productId_optionSetId_key" ON "ProductOptionSet"("productId", "optionSetId");

-- CreateIndex
CREATE INDEX "ProductVariation_businessId_productId_isActive_sortOrder_idx" ON "ProductVariation"("businessId", "productId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductVariation_businessId_isActive_updatedAt_idx" ON "ProductVariation"("businessId", "isActive", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariation_productId_variationKey_key" ON "ProductVariation"("productId", "variationKey");

-- CreateIndex
CREATE INDEX "VariationOptionValue_businessId_variationId_sortOrder_idx" ON "VariationOptionValue"("businessId", "variationId", "sortOrder");

-- CreateIndex
CREATE INDEX "VariationOptionValue_businessId_optionSetId_optionValueId_idx" ON "VariationOptionValue"("businessId", "optionSetId", "optionValueId");

-- CreateIndex
CREATE UNIQUE INDEX "VariationOptionValue_variationId_optionSetId_key" ON "VariationOptionValue"("variationId", "optionSetId");

-- CreateIndex
CREATE INDEX "InventoryMovement_variationId_idx" ON "InventoryMovement"("variationId");

-- CreateIndex
CREATE INDEX "SaleLineItem_variationId_idx" ON "SaleLineItem"("variationId");

-- AddForeignKey
ALTER TABLE "OptionSet" ADD CONSTRAINT "OptionSet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionValue" ADD CONSTRAINT "OptionValue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionValue" ADD CONSTRAINT "OptionValue_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSet" ADD CONSTRAINT "ProductOptionSet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSet" ADD CONSTRAINT "ProductOptionSet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSet" ADD CONSTRAINT "ProductOptionSet_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationOptionValue" ADD CONSTRAINT "VariationOptionValue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationOptionValue" ADD CONSTRAINT "VariationOptionValue_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationOptionValue" ADD CONSTRAINT "VariationOptionValue_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationOptionValue" ADD CONSTRAINT "VariationOptionValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "OptionValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItem" ADD CONSTRAINT "SaleLineItem_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
