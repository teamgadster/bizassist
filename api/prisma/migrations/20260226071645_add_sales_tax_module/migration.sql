-- CreateEnum
CREATE TYPE "TaxApplicationMode" AS ENUM ('ALL_TAXABLE', 'SELECT_ITEMS');

-- CreateEnum
CREATE TYPE "TaxItemPricingMode" AS ENUM ('ADD_TO_ITEM_PRICE', 'INCLUDE_IN_ITEM_PRICE');

-- CreateTable
CREATE TABLE "SalesTax" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "nameNormalized" VARCHAR(120) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "applicationMode" "TaxApplicationMode" NOT NULL DEFAULT 'ALL_TAXABLE',
    "customAmounts" BOOLEAN NOT NULL DEFAULT true,
    "itemPricingMode" "TaxItemPricingMode" NOT NULL DEFAULT 'INCLUDE_IN_ITEM_PRICE',
    "itemIds" JSONB,
    "serviceIds" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesTax_businessId_isEnabled_idx" ON "SalesTax"("businessId", "isEnabled");

-- CreateIndex
CREATE INDEX "SalesTax_businessId_archivedAt_idx" ON "SalesTax"("businessId", "archivedAt");

-- CreateIndex
CREATE INDEX "SalesTax_businessId_createdAt_idx" ON "SalesTax"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesTax_businessId_nameNormalized_key" ON "SalesTax"("businessId", "nameNormalized");

-- AddForeignKey
ALTER TABLE "SalesTax" ADD CONSTRAINT "SalesTax_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
