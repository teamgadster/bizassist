// BizAssist_api
// path: src/modules/catalog/catalog.types.ts

export type CatalogListProductsQuery = {
	q?: string;
	type?: "PHYSICAL" | "SERVICE";
	limit?: number;
	cursor?: string;
	isActive?: boolean;
	includeArchived?: boolean;
};

export type CatalogListProductsResult = {
	items: CatalogProduct[];
	nextCursor: string | null;
};

// UDQI (Inventory/Catalog): quantities are decimal strings.
export type CatalogProduct = {
	id: string;
	businessId: string;
	storeId: string | null;

	type: string;

	name: string;
	sku: string | null;
	barcode: string | null;

	unitId: string | null;

	categoryId: string | null;
	categoryName: string | null;
	categoryColor: string | null;
	categoryLegacy: string | null;

	description: string | null;

	// Canonical money transport: minor-unit digit strings.
	priceMinor: string | null;
	costMinor: string | null;

	// Compatibility payload: decimal major-unit strings.
	price: string | null;
	cost: string | null;

	trackInventory: boolean;
	durationTotalMinutes: number | null;
	processingEnabled: boolean;
	durationInitialMinutes: number | null;
	durationProcessingMinutes: number | null;
	durationFinalMinutes: number | null;

	// UDQI quantities
	reorderPoint: string | null;
	onHandCached: string; // never null in DTO

	primaryImageUrl: string | null;

	// ✅ POS Tile contract (used by POS renderer + tile editor)
	// Governance: exactly two modes.
	posTileMode: "COLOR" | "IMAGE";
	posTileColor: string | null;
	posTileLabel: string | null;

	isActive: boolean;

	createdAt: string;
	updatedAt: string;
};

// Inputs: accept decimal strings for UDQI Inventory/Catalog boundary.
export type CreateProductInput = {
	type?: string;

	name: string;

	sku?: string | null;
	barcode?: string | null;

	unitId?: string | null;

	categoryId?: string | null;
	categoryLegacy?: string | null;

	description?: string | null;

	// Canonical money input.
	priceMinor?: string | null;
	costMinor?: string | null;

	// Compatibility money input.
	price?: string | number | null;
	cost?: string | number | null;

	optionSelections?: ProductOptionSelectionInput[];
	variations?: ProductVariationCreateInput[];

	trackInventory?: boolean;
	processingEnabled?: boolean;
	durationInitialMinutes?: number | null;
	durationProcessingMinutes?: number | null;
	durationFinalMinutes?: number | null;

	reorderPoint?: string | null;

	storeId?: string | null;

	initialOnHand?: string | null;

	// POS tile settings (Catalog-owned)
	posTileMode?: "COLOR" | "IMAGE";
	posTileColor?: string | null;
	posTileLabel?: string | null;
};

export type ProductOptionSelectionInput = {
	optionSetId: string;
	selectedValueIds: string[];
	sortOrder?: number;
};

export type ProductVariationCreateInput = {
	label?: string;
	valueMap: Record<string, string>;
	sortOrder?: number;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, "initialOnHand" | "optionSelections" | "variations">> & {
	isActive?: boolean;
	primaryImageUrl?: string | null;

	// Optional: allow PATCHing tile settings once the POS Tile screen ships.
	// Safe: does not change behavior unless controller/service wires it.
	posTileMode?: "COLOR" | "IMAGE";
	posTileColor?: string | null;
	posTileLabel?: string | null;
};
