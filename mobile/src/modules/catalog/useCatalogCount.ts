// BizAssist_mobile
// path: src/modules/catalog/useCatalogCount.ts

import { useQuery } from "@tanstack/react-query";
import { catalogKeys, fetchCatalogCount } from "./catalog.queries";

export function useCatalogCount() {
	return useQuery({
		queryKey: catalogKeys.count(),
		queryFn: fetchCatalogCount,
		staleTime: 120_000,
	});
}
