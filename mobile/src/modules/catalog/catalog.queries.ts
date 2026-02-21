// BizAssist_mobile
// path: src/modules/catalog/catalog.queries.ts

import { catalogApi } from "./catalog.api";


export const catalogKeys = {
	all: ["catalog"] as const,
	count: () => [...catalogKeys.all, "count"] as const,
};

// v1 NOTE:
// This is NOT a true count. It is a cheap presence check used by lightweight surfaces.
// Returns 0 if empty, 1 if at least one item exists.
export async function fetchCatalogCount(): Promise<number> {
	const res = await catalogApi.listProducts({ limit: 1 });
	return (res.items?.length ?? 0) > 0 ? 1 : 0;
}
