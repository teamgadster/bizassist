/*
  Warnings:

  - The values [VARIANT_SWATCH] on the enum `ProductImageKind` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `productVariationId` on the `InventoryMovement` table. All the data in the column will be lost.
  - You are about to drop the `OptionSet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OptionValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductOptionSet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductOptionSetValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariationValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ModifierSelectionType" AS ENUM ('SINGLE', 'MULTI');

-- AlterEnum
BEGIN;
CREATE TYPE "ProductImageKind_new" AS ENUM ('PRIMARY_POS_TILE', 'SECONDARY_GALLERY', 'LIFESTYLE');
ALTER TABLE "public"."ProductImage" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "ProductImage" ALTER COLUMN "kind" TYPE "ProductImageKind_new" USING ("kind"::text::"ProductImageKind_new");
ALTER TYPE "ProductImageKind" RENAME TO "ProductImageKind_old";
ALTER TYPE "ProductImageKind_new" RENAME TO "ProductImageKind";
DROP TYPE "public"."ProductImageKind_old";
ALTER TABLE "ProductImage" ALTER COLUMN "kind" SET DEFAULT 'PRIMARY_POS_TILE';
COMMIT;

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_productVariationId_fkey";

-- DropForeignKey
ALTER TABLE "OptionSet" DROP CONSTRAINT "OptionSet_businessId_fkey";

-- DropForeignKey
ALTER TABLE "OptionValue" DROP CONSTRAINT "OptionValue_businessId_fkey";

-- DropForeignKey
ALTER TABLE "OptionValue" DROP CONSTRAINT "OptionValue_optionSetId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionSet" DROP CONSTRAINT "ProductOptionSet_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionSet" DROP CONSTRAINT "ProductOptionSet_optionSetId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionSet" DROP CONSTRAINT "ProductOptionSet_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionSetValue" DROP CONSTRAINT "ProductOptionSetValue_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionSetValue" DROP CONSTRAINT "ProductOptionSetValue_optionValueId_fkey";

-- DropForeignKey
ALTER TABLE "ProductOptionSetValue" DROP CONSTRAINT "ProductOptionSetValue_productOptionSetId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariation" DROP CONSTRAINT "ProductVariation_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariation" DROP CONSTRAINT "ProductVariation_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariationValue" DROP CONSTRAINT "ProductVariationValue_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariationValue" DROP CONSTRAINT "ProductVariationValue_optionSetId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariationValue" DROP CONSTRAINT "ProductVariationValue_optionValueId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariationValue" DROP CONSTRAINT "ProductVariationValue_productVariationId_fkey";

-- DropIndex
DROP INDEX "InventoryMovement_businessId_productVariationId_createdAt_idx";

-- AlterTable
ALTER TABLE "InventoryMovement" DROP COLUMN "productVariationId";

-- AlterTable
ALTER TABLE "SaleLineItem" ADD COLUMN     "selectedModifierOptionIds" JSONB,
ADD COLUMN     "totalModifiersDeltaMinor" BIGINT;

-- DropTable
DROP TABLE "OptionSet";

-- DropTable
DROP TABLE "OptionValue";

-- DropTable
DROP TABLE "ProductOptionSet";

-- DropTable
DROP TABLE "ProductOptionSetValue";

-- DropTable
DROP TABLE "ProductVariation";

-- DropTable
DROP TABLE "ProductVariationValue";

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "selectionType" "ModifierSelectionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelected" INTEGER NOT NULL DEFAULT 0,
    "maxSelected" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModifierGroup" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "priceDeltaMinor" BIGINT NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLineItemModifier" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleLineItemId" TEXT NOT NULL,
    "modifierOptionId" TEXT NOT NULL,
    "optionName" VARCHAR(120) NOT NULL,
    "priceDeltaMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleLineItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModifierGroup_businessId_isArchived_sortOrder_idx" ON "ModifierGroup"("businessId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "ModifierGroup_businessId_createdAt_idx" ON "ModifierGroup"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductModifierGroup_businessId_productId_sortOrder_idx" ON "ProductModifierGroup"("businessId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductModifierGroup_businessId_modifierGroupId_idx" ON "ProductModifierGroup"("businessId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModifierGroup_productId_modifierGroupId_key" ON "ProductModifierGroup"("productId", "modifierGroupId");

-- CreateIndex
CREATE INDEX "ModifierOption_businessId_modifierGroupId_isArchived_sortOr_idx" ON "ModifierOption"("businessId", "modifierGroupId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "ModifierOption_businessId_createdAt_idx" ON "ModifierOption"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "SaleLineItemModifier_businessId_saleLineItemId_idx" ON "SaleLineItemModifier"("businessId", "saleLineItemId");

-- CreateIndex
CREATE INDEX "SaleLineItemModifier_businessId_modifierOptionId_idx" ON "SaleLineItemModifier"("businessId", "modifierOptionId");

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItemModifier" ADD CONSTRAINT "SaleLineItemModifier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItemModifier" ADD CONSTRAINT "SaleLineItemModifier_saleLineItemId_fkey" FOREIGN KEY ("saleLineItemId") REFERENCES "SaleLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItemModifier" ADD CONSTRAINT "SaleLineItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
