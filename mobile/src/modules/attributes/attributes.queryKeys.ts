export const attributesKeys = {
	all: ["attributes"] as const,
	list: (includeArchived: boolean) => [...attributesKeys.all, "list", { includeArchived }] as const,
	detail: (id: string) => [...attributesKeys.all, "detail", id] as const,
	product: (productId: string) => [...attributesKeys.all, "product", productId] as const,
};
