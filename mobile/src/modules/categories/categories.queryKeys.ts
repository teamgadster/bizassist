// BizAssist_mobile
// path: src/modules/categories/categories.queryKeys.ts

export const categoryKeys = {
	root: () => ["categories"] as const,

	list: (params: { q?: string; isActive?: boolean; limit?: number }) =>
		[...categoryKeys.root(), "list", params] as const,

	picker: (params: { q?: string; includeSelectedCategoryId?: string }) =>
		[...categoryKeys.root(), "picker", params] as const,

	visibility: () => [...categoryKeys.root(), "visibility"] as const,
};
