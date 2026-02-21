-- CreateEnum
CREATE TYPE "UnitCategory" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'AREA', 'TIME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UnitSource" AS ENUM ('CATALOG', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'EWALLET', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('SALE', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('SALE', 'LINE_ITEM');

-- CreateEnum
CREATE TYPE "PosTileMode" AS ENUM ('IMAGE', 'COLOR');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('SUPABASE');

-- CreateEnum
CREATE TYPE "ProductImageStatus" AS ENUM ('ORIGINAL', 'BACKGROUND_REMOVED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductImageKind" AS ENUM ('PRIMARY_POS_TILE', 'SECONDARY_GALLERY', 'VARIANT_SWATCH', 'LIFESTYLE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'STAFF');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'PASSWORD_RESET', 'CHANGE_EMAIL');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('BUSINESS_PRIMARY', 'BUSINESS_BRANCH', 'OWNER_HOME', 'OWNER_BILLING', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('AUTH_REGISTER', 'AUTH_LOGIN', 'AUTH_LOGOUT', 'PASSWORD_RESET', 'USER_EMAIL_CHANGE', 'BUSINESS_CREATE', 'RATE_LIMIT');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAIL', 'DENIED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('GENERAL_RETAIL', 'CLINIC', 'VET', 'GROOMING', 'RESTAURANT', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHERS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "rawEmail" VARCHAR(120),
    "passwordHash" VARCHAR(72) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "firstName" VARCHAR(50) NOT NULL,
    "middleName" VARCHAR(50),
    "lastName" VARCHAR(50) NOT NULL,
    "gender" "Gender",
    "phone" VARCHAR(40),
    "birthDate" TIMESTAMP(3),
    "avatarUrl" VARCHAR(500),
    "avatarPublicId" VARCHAR(120),
    "coverUrl" VARCHAR(500),
    "coverPublicId" VARCHAR(120),
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLogoutAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "activeBusinessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "line1" VARCHAR(120) NOT NULL,
    "line2" VARCHAR(120),
    "city" VARCHAR(80) NOT NULL,
    "state" VARCHAR(80),
    "postal" VARCHAR(20),
    "country" VARCHAR(2) NOT NULL,
    "phone" VARCHAR(40),
    "label" VARCHAR(60),
    "userId" TEXT,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "contextKey" VARCHAR(64),
    "emailMasked" VARCHAR(120),
    "reason" VARCHAR(255),
    "ip" VARCHAR(45),
    "userAgent" TEXT,
    "correlationId" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "logoUrl" VARCHAR(500),
    "logoPublicId" VARCHAR(120),
    "coverUrl" VARCHAR(500),
    "coverPublicId" VARCHAR(120),
    "description" VARCHAR(500),
    "foundedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(32),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "address" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "storeId" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'PHYSICAL',
    "name" VARCHAR(120) NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "barcode" VARCHAR(64),
    "description" VARCHAR(500),
    "price" DECIMAL(12,2),
    "priceMinor" BIGINT,
    "cost" DECIMAL(12,2),
    "costMinor" BIGINT,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "reorderPoint" DECIMAL(18,5),
    "onHandCached" DECIMAL(18,5) NOT NULL DEFAULT 0,
    "primaryImageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,
    "categoryLegacy" VARCHAR(80),
    "unitId" TEXT,
    "posTileColor" VARCHAR(16),
    "posTileLabel" VARCHAR(5),
    "posTileMode" "PosTileMode" NOT NULL DEFAULT 'COLOR',
    "serviceDurationMins" INTEGER,
    "serviceUnitLabel" VARCHAR(40),
    "serviceUnitPrecision" INTEGER,
    "durationTotalMinutes" INTEGER,
    "processingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "durationInitialMinutes" INTEGER,
    "durationProcessingMinutes" INTEGER,
    "durationFinalMinutes" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCounter" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "nextProductSkuNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitCatalog" (
    "id" TEXT NOT NULL,
    "category" "UnitCategory" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "abbreviation" VARCHAR(16) NOT NULL,
    "precisionScale" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "source" "UnitSource" NOT NULL DEFAULT 'CUSTOM',
    "catalogId" TEXT,
    "name" VARCHAR(80) NOT NULL,
    "abbreviation" VARCHAR(16) NOT NULL,
    "category" "UnitCategory" NOT NULL,
    "precisionScale" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nameNormalized" VARCHAR(80) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitVisibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryVisibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountVisibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "color" VARCHAR(16),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nameNormalized" VARCHAR(80) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "ProductImageKind" NOT NULL DEFAULT 'PRIMARY_POS_TILE',
    "provider" "StorageProvider" NOT NULL DEFAULT 'SUPABASE',
    "bucket" VARCHAR(80) NOT NULL,
    "path" VARCHAR(300) NOT NULL,
    "publicUrl" VARCHAR(500) NOT NULL,
    "processedUrl" VARCHAR(500),
    "status" "ProductImageStatus" NOT NULL DEFAULT 'ORIGINAL',
    "mimeType" VARCHAR(80),
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "valueMinor" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "description" VARCHAR(250),
    "nameNormalized" VARCHAR(120) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionSet" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "nameNormalized" VARCHAR(120) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
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
    "name" VARCHAR(120) NOT NULL,
    "nameNormalized" VARCHAR(120) NOT NULL,
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
CREATE TABLE "ProductOptionSetValue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productOptionSetId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionSetValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "variationKey" VARCHAR(255) NOT NULL,
    "price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "reorderPoint" DECIMAL(18,5),
    "onHandCached" DECIMAL(18,5) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariationValue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productVariationId" TEXT NOT NULL,
    "optionSetId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariationValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "subtotalMinor" BIGINT,
    "total" DECIMAL(12,2) NOT NULL,
    "totalMinor" BIGINT,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotalMinor" BIGINT,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotalMinor" BIGINT,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLineItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityV2" DECIMAL(18,5),
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SaleLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleDiscount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "discountId" TEXT,
    "scope" "DiscountScope" NOT NULL,
    "saleLineItemId" TEXT,
    "nameSnapshot" VARCHAR(120) NOT NULL,
    "typeSnapshot" "DiscountType" NOT NULL,
    "valueSnapshot" DECIMAL(12,2) NOT NULL,
    "valueSnapshotMinor" BIGINT,
    "amountApplied" DECIMAL(12,2) NOT NULL,
    "amountAppliedMinor" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountMinor" BIGINT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT,
    "quantityDelta" DECIMAL(18,5) NOT NULL,
    "reason" "InventoryMovementReason" NOT NULL,
    "idempotencyKey" VARCHAR(80),
    "relatedSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productVariationId" TEXT,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "codeHash" VARCHAR(128) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffRole" "StaffRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_emailVerified_createdAt_idx" ON "User"("emailVerified", "createdAt");

-- CreateIndex
CREATE INDEX "User_activeBusinessId_idx" ON "User"("activeBusinessId");

-- CreateIndex
CREATE INDEX "Address_businessId_type_idx" ON "Address"("businessId", "type");

-- CreateIndex
CREATE INDEX "Address_userId_type_idx" ON "Address"("userId", "type");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_status_createdAt_idx" ON "AuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_contextKey_createdAt_idx" ON "AuditLog"("contextKey", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Business_businessType_countryCode_idx" ON "Business"("businessType", "countryCode");

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "Business_createdAt_idx" ON "Business"("createdAt");

-- CreateIndex
CREATE INDEX "Business_countryCode_idx" ON "Business"("countryCode");

-- CreateIndex
CREATE INDEX "Business_currencyCode_idx" ON "Business"("currencyCode");

-- CreateIndex
CREATE INDEX "Store_businessId_isDefault_idx" ON "Store"("businessId", "isDefault");

-- CreateIndex
CREATE INDEX "Store_businessId_createdAt_idx" ON "Store"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_businessId_createdAt_idx" ON "Product"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_businessId_name_idx" ON "Product"("businessId", "name");

-- CreateIndex
CREATE INDEX "Product_businessId_type_idx" ON "Product"("businessId", "type");

-- CreateIndex
CREATE INDEX "Product_businessId_type_isActive_idx" ON "Product"("businessId", "type", "isActive");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_businessId_categoryId_idx" ON "Product"("businessId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_businessId_unitId_idx" ON "Product"("businessId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_barcode_key" ON "Product"("businessId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCounter_businessId_key" ON "BusinessCounter"("businessId");

-- CreateIndex
CREATE INDEX "BusinessCounter_businessId_idx" ON "BusinessCounter"("businessId");

-- CreateIndex
CREATE INDEX "UnitCatalog_isActive_category_name_idx" ON "UnitCatalog"("isActive", "category", "name");

-- CreateIndex
CREATE INDEX "UnitCatalog_createdAt_idx" ON "UnitCatalog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UnitCatalog_category_name_key" ON "UnitCatalog"("category", "name");

-- CreateIndex
CREATE INDEX "Unit_businessId_isActive_idx" ON "Unit"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "Unit_businessId_category_name_idx" ON "Unit"("businessId", "category", "name");

-- CreateIndex
CREATE INDEX "Unit_catalogId_idx" ON "Unit"("catalogId");

-- CreateIndex
CREATE INDEX "Unit_createdAt_idx" ON "Unit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_businessId_name_key" ON "Unit"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_businessId_nameNormalized_key" ON "Unit"("businessId", "nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_businessId_catalogId_key" ON "Unit"("businessId", "catalogId");

-- CreateIndex
CREATE INDEX "UnitVisibility_businessId_userId_idx" ON "UnitVisibility"("businessId", "userId");

-- CreateIndex
CREATE INDEX "UnitVisibility_unitId_idx" ON "UnitVisibility"("unitId");

-- CreateIndex
CREATE INDEX "UnitVisibility_createdAt_idx" ON "UnitVisibility"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UnitVisibility_userId_businessId_unitId_key" ON "UnitVisibility"("userId", "businessId", "unitId");

-- CreateIndex
CREATE INDEX "CategoryVisibility_businessId_userId_idx" ON "CategoryVisibility"("businessId", "userId");

-- CreateIndex
CREATE INDEX "CategoryVisibility_categoryId_idx" ON "CategoryVisibility"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryVisibility_createdAt_idx" ON "CategoryVisibility"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryVisibility_userId_businessId_categoryId_key" ON "CategoryVisibility"("userId", "businessId", "categoryId");

-- CreateIndex
CREATE INDEX "DiscountVisibility_businessId_userId_idx" ON "DiscountVisibility"("businessId", "userId");

-- CreateIndex
CREATE INDEX "DiscountVisibility_discountId_idx" ON "DiscountVisibility"("discountId");

-- CreateIndex
CREATE INDEX "DiscountVisibility_createdAt_idx" ON "DiscountVisibility"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountVisibility_userId_businessId_discountId_key" ON "DiscountVisibility"("userId", "businessId", "discountId");

-- CreateIndex
CREATE INDEX "Category_businessId_archivedAt_sortOrder_idx" ON "Category"("businessId", "archivedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "Category_businessId_isActive_sortOrder_idx" ON "Category"("businessId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Category_businessId_createdAt_idx" ON "Category"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_businessId_name_key" ON "Category"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_businessId_nameNormalized_key" ON "Category"("businessId", "nameNormalized");

-- CreateIndex
CREATE INDEX "ProductImage_businessId_productId_kind_sortOrder_idx" ON "ProductImage"("businessId", "productId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "Discount_businessId_archivedAt_idx" ON "Discount"("businessId", "archivedAt");

-- CreateIndex
CREATE INDEX "Discount_businessId_createdAt_idx" ON "Discount"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Discount_businessId_isActive_idx" ON "Discount"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "Discount_businessId_name_idx" ON "Discount"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_businessId_nameNormalized_key" ON "Discount"("businessId", "nameNormalized");

-- CreateIndex
CREATE INDEX "OptionSet_businessId_archivedAt_sortOrder_idx" ON "OptionSet"("businessId", "archivedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "OptionSet_businessId_isActive_sortOrder_idx" ON "OptionSet"("businessId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OptionSet_businessId_createdAt_idx" ON "OptionSet"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OptionSet_businessId_nameNormalized_key" ON "OptionSet"("businessId", "nameNormalized");

-- CreateIndex
CREATE INDEX "OptionValue_businessId_optionSetId_archivedAt_sortOrder_idx" ON "OptionValue"("businessId", "optionSetId", "archivedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "OptionValue_businessId_optionSetId_isActive_sortOrder_idx" ON "OptionValue"("businessId", "optionSetId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OptionValue_businessId_createdAt_idx" ON "OptionValue"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OptionValue_optionSetId_nameNormalized_key" ON "OptionValue"("optionSetId", "nameNormalized");

-- CreateIndex
CREATE INDEX "ProductOptionSet_businessId_productId_sortOrder_idx" ON "ProductOptionSet"("businessId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductOptionSet_businessId_optionSetId_idx" ON "ProductOptionSet"("businessId", "optionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionSet_productId_optionSetId_key" ON "ProductOptionSet"("productId", "optionSetId");

-- CreateIndex
CREATE INDEX "ProductOptionSetValue_businessId_productOptionSetId_sortOrd_idx" ON "ProductOptionSetValue"("businessId", "productOptionSetId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductOptionSetValue_businessId_optionValueId_idx" ON "ProductOptionSetValue"("businessId", "optionValueId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionSetValue_productOptionSetId_optionValueId_key" ON "ProductOptionSetValue"("productOptionSetId", "optionValueId");

-- CreateIndex
CREATE INDEX "ProductVariation_businessId_productId_isActive_sortOrder_idx" ON "ProductVariation"("businessId", "productId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductVariation_businessId_createdAt_idx" ON "ProductVariation"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariation_productId_variationKey_key" ON "ProductVariation"("productId", "variationKey");

-- CreateIndex
CREATE INDEX "ProductVariationValue_businessId_productVariationId_sortOrd_idx" ON "ProductVariationValue"("businessId", "productVariationId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductVariationValue_businessId_optionSetId_idx" ON "ProductVariationValue"("businessId", "optionSetId");

-- CreateIndex
CREATE INDEX "ProductVariationValue_businessId_optionValueId_idx" ON "ProductVariationValue"("businessId", "optionValueId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariationValue_productVariationId_optionSetId_key" ON "ProductVariationValue"("productVariationId", "optionSetId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariationValue_productVariationId_optionValueId_key" ON "ProductVariationValue"("productVariationId", "optionValueId");

-- CreateIndex
CREATE INDEX "Sale_businessId_createdAt_idx" ON "Sale"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_deviceId_idx" ON "Sale"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_idempotencyKey_key" ON "Sale"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SaleLineItem_saleId_idx" ON "SaleLineItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleLineItem_productId_idx" ON "SaleLineItem"("productId");

-- CreateIndex
CREATE INDEX "SaleDiscount_businessId_saleId_idx" ON "SaleDiscount"("businessId", "saleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_saleId_idx" ON "SaleDiscount"("saleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_saleLineItemId_idx" ON "SaleDiscount"("saleLineItemId");

-- CreateIndex
CREATE INDEX "SaleDiscount_discountId_idx" ON "SaleDiscount"("discountId");

-- CreateIndex
CREATE INDEX "Payment_saleId_idx" ON "Payment"("saleId");

-- CreateIndex
CREATE INDEX "InventoryMovement_businessId_productId_createdAt_idx" ON "InventoryMovement"("businessId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_businessId_productVariationId_createdAt_idx" ON "InventoryMovement"("businessId", "productVariationId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_storeId_idx" ON "InventoryMovement"("storeId");

-- CreateIndex
CREATE INDEX "InventoryMovement_relatedSaleId_idx" ON "InventoryMovement"("relatedSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_businessId_idempotencyKey_key" ON "InventoryMovement"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Device_businessId_idx" ON "Device"("businessId");

-- CreateIndex
CREATE INDEX "EmailOtp_createdAt_idx" ON "EmailOtp"("createdAt");

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_expiresAt_idx" ON "EmailOtp"("email", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_lastSentAt_idx" ON "EmailOtp"("email", "purpose", "lastSentAt");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOtp_userId_purpose_key" ON "EmailOtp"("userId", "purpose");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_userId_tokenHash_key" ON "RefreshToken"("userId", "tokenHash");

-- CreateIndex
CREATE INDEX "StaffMembership_businessId_staffRole_idx" ON "StaffMembership"("businessId", "staffRole");

-- CreateIndex
CREATE INDEX "StaffMembership_userId_staffRole_idx" ON "StaffMembership"("userId", "staffRole");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMembership_userId_businessId_key" ON "StaffMembership"("userId", "businessId");

-- CreateIndex
CREATE INDEX "PasswordResetTicket_tokenHash_idx" ON "PasswordResetTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetTicket_expiresAt_idx" ON "PasswordResetTicket"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetTicket_userId_createdAt_idx" ON "PasswordResetTicket"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetTicket_userId_tokenHash_key" ON "PasswordResetTicket"("userId", "tokenHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeBusinessId_fkey" FOREIGN KEY ("activeBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCounter" ADD CONSTRAINT "BusinessCounter_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "UnitCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitVisibility" ADD CONSTRAINT "UnitVisibility_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitVisibility" ADD CONSTRAINT "UnitVisibility_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitVisibility" ADD CONSTRAINT "UnitVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryVisibility" ADD CONSTRAINT "CategoryVisibility_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryVisibility" ADD CONSTRAINT "CategoryVisibility_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryVisibility" ADD CONSTRAINT "CategoryVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountVisibility" ADD CONSTRAINT "DiscountVisibility_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountVisibility" ADD CONSTRAINT "DiscountVisibility_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountVisibility" ADD CONSTRAINT "DiscountVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionSet" ADD CONSTRAINT "OptionSet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionValue" ADD CONSTRAINT "OptionValue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionValue" ADD CONSTRAINT "OptionValue_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSet" ADD CONSTRAINT "ProductOptionSet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSet" ADD CONSTRAINT "ProductOptionSet_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSet" ADD CONSTRAINT "ProductOptionSet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSetValue" ADD CONSTRAINT "ProductOptionSetValue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSetValue" ADD CONSTRAINT "ProductOptionSetValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "OptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionSetValue" ADD CONSTRAINT "ProductOptionSetValue_productOptionSetId_fkey" FOREIGN KEY ("productOptionSetId") REFERENCES "ProductOptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariationValue" ADD CONSTRAINT "ProductVariationValue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariationValue" ADD CONSTRAINT "ProductVariationValue_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariationValue" ADD CONSTRAINT "ProductVariationValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "OptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariationValue" ADD CONSTRAINT "ProductVariationValue_productVariationId_fkey" FOREIGN KEY ("productVariationId") REFERENCES "ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItem" ADD CONSTRAINT "SaleLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItem" ADD CONSTRAINT "SaleLineItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_saleLineItemId_fkey" FOREIGN KEY ("saleLineItemId") REFERENCES "SaleLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productVariationId_fkey" FOREIGN KEY ("productVariationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_relatedSaleId_fkey" FOREIGN KEY ("relatedSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOtp" ADD CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembership" ADD CONSTRAINT "StaffMembership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembership" ADD CONSTRAINT "StaffMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetTicket" ADD CONSTRAINT "PasswordResetTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
