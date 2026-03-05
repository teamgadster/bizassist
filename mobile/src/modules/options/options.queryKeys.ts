export const optionKeys = {
	root: () => ["options"] as const,
	list: (includeArchived = false) => [...optionKeys.root(), "list", includeArchived ? "archived" : "active"] as const,
	detail: (id: string) => [...optionKeys.root(), "detail", id] as const,
};
