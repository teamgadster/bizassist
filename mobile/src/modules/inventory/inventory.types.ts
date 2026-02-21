// BizAssist_mobile
// path: src/modules/inventory/inventory.types.ts
//
// REFAC (enterprise-grade, non-breaking):
// - Introduce explicit domain naming to prevent “wrong source” bugs:
//   - *Scaled-int* fields: onHandScaledInt, reorderPointScaledInt, quantityDeltaScaledInt
//   - *UDQI decimal-string* fields: onHandDecimal, reorderPointDecimal, quantityDeltaDecimal
// - Keep existing legacy fields (onHandCached, reorderPoint, quantityDelta, *Raw) so current UI remains stable.
// - No runtime logic here—types only.

export type ProductType = "PHYSICAL" | "SERVICE";

/**
 * Quantity transport type used across Inventory surfaces.
 *
 * IMPORTANT (UDQI Phase-1 Compatibility Mode):
 * - Some endpoints may still be legacy "scaled-int" (integer minor-units) while UI wants decimal.
 * - When the API is fully migrated, Inventory/Catalog quantities should be decimal strings everywhere.
 */
export type QuantityValue = string | number;

/**
 * Tiny branded types to make it structurally harder to mix scaled-int vs decimal-string.
 * (Compile-time guardrails; zero runtime impact.)
 */
export type Brand<K, T> = K & { readonly __brand: T };
export type ScaledIntQuantity = Brand<number, "ScaledIntQuantity">;
export type DecimalQuantityString = Brand<string, "DecimalQuantityString">;

export type InventoryCategoryRef = {
	id: string;
	name: string;
	color?: string | null;
	isActive?: boolean | null;
};

export type InventoryUnitRef = {
	id?: string;
	name?: string;
	abbreviation?: string;
	category?: string;
	precisionScale?: number | null;
};

export type InventoryProduct = {
	id: string;
	type: ProductType;
	name: string;

	sku?: string | null;
	barcode?: string | null;
	price?: number | null;
	cost?: number | null;

	categoryId?: string | null;
	category?: InventoryCategoryRef | null;

	trackInventory: boolean;
	durationTotalMinutes?: number | null;
	processingEnabled?: boolean;
	durationInitialMinutes?: number | null;
	durationProcessingMinutes?: number | null;
	durationFinalMinutes?: number | null;

	// ---------------------------------------------------------
	// ✅ Explicit quantity fields (preferred, bug-class prevention)
	// ---------------------------------------------------------

	/**
	 * Legacy / compatibility representation:
	 * scaled-int (integer minor-units) when precisionScale > 0.
	 */
	onHandScaledInt?: ScaledIntQuantity;

	/**
	 * UDQI representation:
	 * exact decimal string from API (only when truly UDQI), e.g. "1.25", "10", "0.50".
	 */
	onHandDecimal?: DecimalQuantityString;

	/**
	 * Legacy / compatibility reorder point scaled-int.
	 */
	reorderPointScaledInt?: ScaledIntQuantity | null;

	/**
	 * UDQI reorder point decimal string.
	 */
	reorderPointDecimal?: DecimalQuantityString | null;

	// ---------------------------------------------------------
	// 🧱 Backward-compat fields (KEEP STABLE for existing UI)
	// ---------------------------------------------------------

	/**
	 * Legacy numeric values used by existing UI logic (scaled-int for precisionScale > 0).
	 * Keep stable for now (non-breaking).
	 */
	reorderPoint?: number | null;
	onHandCached: number;

	/**
	 * UDQI transport (preferred when present):
	 * exact decimal strings from API, e.g. "1.25", "10", "0.50".
	 *
	 * NOTE: These must only be set when the API is truly sending UDQI decimal strings.
	 * Do NOT overload these with legacy scaled-int integers.
	 */
	reorderPointRaw?: string;
	onHandCachedRaw?: string;

	/**
	 * Unit metadata (attached by API normalizer when available).
	 * Kept optional to avoid breaking older endpoints.
	 */
	unitId?: string;
	unitName?: string;
	unitAbbreviation?: string;
	unitCategory?: string;
	unitPrecisionScale?: number | null;

	/**
	 * Optional nested unit (some endpoints return relation-like shapes).
	 * Kept optional for compatibility.
	 */
	unit?: InventoryUnitRef | null;

	primaryImageUrl?: string | null;
	posTileMode?: "COLOR" | "IMAGE";
	posTileColor?: string | null;
	posTileLabel?: string | null;
	isActive: boolean;

	createdAt?: string;
	updatedAt?: string;
};

export type InventoryProductDetail = InventoryProduct & {
	description?: string | null;
	price?: number | null;
	cost?: number | null;
};

export type InventoryMovementReason = "SALE" | "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

export type InventoryMovement = {
	id: string;
	productId: string;
	storeId?: string | null;

	// ---------------------------------------------------------
	// ✅ Explicit movement delta fields (preferred)
	// ---------------------------------------------------------

	/**
	 * Legacy / compatibility: scaled-int numeric delta (minor-units).
	 */
	quantityDeltaScaledInt?: ScaledIntQuantity;

	/**
	 * UDQI: exact decimal string delta (only when truly UDQI).
	 */
	quantityDeltaDecimal?: DecimalQuantityString;

	// ---------------------------------------------------------
	// 🧱 Backward-compat fields (KEEP STABLE for existing UI)
	// ---------------------------------------------------------

	/**
	 * UI-facing numeric fallback.
	 * In legacy mode, this is typically scaled-int for precisionScale > 0.
	 * For exactness, prefer quantityDeltaRaw (UDQI) when present.
	 */
	quantityDelta: number;

	/**
	 * UDQI transport: exact decimal string from API (only when truly UDQI).
	 */
	quantityDeltaRaw?: string;

	reason: InventoryMovementReason;
	createdAt: string;

	relatedSaleId?: string | null;
};

export type ListProductsResponse = {
	items: InventoryProduct[];
	nextCursor?: string | null;
};

export type ListMovementsResponse = {
	items: InventoryMovement[];
};

export type CreateProductInput = {
	// Phase 1: Product type is explicit.
	type: "PHYSICAL" | "SERVICE";

	name: string;
	sku?: string;
	barcode?: string;

	categoryId?: string;
	description?: string;

	price?: number;
	cost?: number;

	trackInventory: boolean;
	unitId?: string;
	durationTotalMinutes?: number;
	processingEnabled?: boolean;
	durationInitialMinutes?: number | null;
	durationProcessingMinutes?: number | null;
	durationFinalMinutes?: number | null;

	// POS tile settings (Catalog-owned)
	posTileMode?: "COLOR" | "IMAGE";
	posTileColor?: string | null;
	posTileLabel?: string | null;

	optionSelections?: {
		optionSetId: string;
		selectedValueIds: string[];
		sortOrder?: number;
	}[];
	variations?: {
		label?: string;
		valueMap: Record<string, string>;
		sortOrder?: number;
	}[];

	/**
	 * UDQI Phase-1 (Compatibility Mode):
	 * - UI stores decimal strings (per Unit.precisionScale)
	 * - Backend may still expect legacy scaled-int integers via z.coerce.number().int()
	 *
	 * Therefore: these fields are stringified numbers.
	 * - In full UDQI mode: they will be decimal strings.
	 * - In compatibility mode: they are scaled-int strings (e.g. "125" for 1.25 @ scale=2).
	 */
	reorderPoint?: string;

	/**
	 * Phase 1: optional initial stock; backend should create STOCK_IN atomically.
	 * Same transport note as reorderPoint.
	 */
	initialOnHand?: string;
};

export type CreateProductResponse = {
	id: string;
};

export type UpdateProductInput = {
	name?: string;
	sku?: string | null;
	barcode?: string | null;
	description?: string | null;
	price?: number | null;
	cost?: number | null;
	trackInventory?: boolean;
	unitId?: string | null;
	reorderPoint?: string | null;
	durationTotalMinutes?: number | null;
	processingEnabled?: boolean;
	durationInitialMinutes?: number | null;
	durationProcessingMinutes?: number | null;
	durationFinalMinutes?: number | null;
	isActive?: boolean;
};

export type AdjustInventoryInput = {
	/**
	 * Canonical Phase 1 adjustment: ADJUSTMENT with signed delta.
	 * Positive = add stock, Negative = remove stock.
	 */
	/** UDQI Phase-1: decimal string quantity (validated against unit precision) */
	quantityDelta: string;

	idempotencyKey: string;
	reason?: InventoryMovementReason;
	note?: string;
	storeId?: string;
};
