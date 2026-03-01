-- CreateEnum
CREATE TYPE "AttributeSelectionType" AS ENUM ('SINGLE', 'MULTI');

-- AlterTable
ALTER TABLE "SaleLineItem" ADD COLUMN     "selectedAttributes" JSONB;

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "nameNormalized" VARCHAR(120) NOT NULL,
    "selectionType" "AttributeSelectionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "nameNormalized" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "isRequired" BOOLEAN,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attribute_businessId_isArchived_sortOrder_idx" ON "Attribute"("businessId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "Attribute_businessId_createdAt_idx" ON "Attribute"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_businessId_nameNormalized_key" ON "Attribute"("businessId", "nameNormalized");

-- CreateIndex
CREATE INDEX "AttributeOption_businessId_attributeId_isArchived_sortOrder_idx" ON "AttributeOption"("businessId", "attributeId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "AttributeOption_businessId_createdAt_idx" ON "AttributeOption"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeId_nameNormalized_key" ON "AttributeOption"("attributeId", "nameNormalized");

-- CreateIndex
CREATE INDEX "ProductAttribute_businessId_productId_sortOrder_idx" ON "ProductAttribute"("businessId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductAttribute_businessId_attributeId_idx" ON "ProductAttribute"("businessId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_attributeId_key" ON "ProductAttribute"("productId", "attributeId");

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
