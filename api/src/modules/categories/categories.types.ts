// BizAssist_api
// path: src/modules/categories/categories.types.ts

export type CategoryDTO = {
	id: string;
	businessId: string;
	name: string;
	color: string | null;
	sortOrder: number;
	isActive: boolean;
	archivedAt: string | null;
	productCount: number;
	createdAt: string;
	updatedAt: string;
};

export type ListCategoriesQuery = {
	q?: string;
	isActive?: boolean;
	limit?: number;
	cursor?: string; // reserved for future paging
};

export type CreateCategoryInput = {
	name: string;
	color?: string | null; // "#RRGGBB"
	sortOrder?: number;
	isActive?: boolean;
};

export type UpdateCategoryInput = {
	name?: string;
	color?: string | null;
	sortOrder?: number;
	isActive?: boolean;
};
