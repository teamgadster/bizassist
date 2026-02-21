// BizAssist_api
// path: src/modules/catalog/catalog.types.ts

export type CatalogListProductsQuery = {
	q?: string;
	limit?: number;
	cursor?: string;
};

export type CatalogListProductsResult = {
	items: CatalogProduct[];
	nextCursor: string | null;
};

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

	price: string | null;
	cost: string | null;

	trackInventory: boolean;

	// UDQI: quantities are decimal strings
	reorderPoint: string | null;
	onHandCached: string;

	primaryImageUrl: string | null;

	// ✅ POS Tile contract
	posTileMode: "COLOR" | "IMAGE";
	posTileColor: string | null;

	isActive: boolean;

	createdAt: string;
	updatedAt: string;
};

export type CreateProductInput = {
	type?: string;

	name: string;
	sku?: string | null;
	barcode?: string | null;

	description?: string | null;

	price?: string | null;
	cost?: string | null;

	trackInventory?: boolean;

	// UDQI decimal strings
	reorderPoint?: string | null;
	initialOnHand?: string | null;

	categoryId?: string | null;
	categoryLegacy?: string | null;

	unitId?: string | null;

	primaryImageUrl?: string | null;

	// Optional future: store scoping
	storeId?: string | null;
};

export type UpdateProductInput = Partial<CreateProductInput> & {
	isActive?: boolean;
};
