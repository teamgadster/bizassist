// path: src/modules/categories/categories.types.ts

export type Category = {
	id: string;
	name: string;
	isActive: boolean;
	sortOrder: number;
	color?: string | null;
	productCount?: number;
	createdAt?: string;
	updatedAt?: string;
};

export type ListCategoriesResponse = {
	items: Category[];
};

export type CreateCategoryInput = {
	name: string;
	color?: string | null;
	sortOrder?: number;
};

export type UpdateCategoryInput = {
	name?: string;
	color?: string | null;
	sortOrder?: number;
	isActive?: boolean;
};

export type CategoryVisibilityState = {
	hiddenCategoryIds: string[];
};

export type CategoryVisibilityAction = "HIDE" | "RESTORE";

export type PatchCategoryVisibilityInput = {
	action: CategoryVisibilityAction;
	categoryId: string;
};
