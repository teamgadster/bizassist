import { useQuery } from "@tanstack/react-query";
import { attributesApi } from "./attributes.api";
import { attributesKeys } from "./attributes.queryKeys";

export function useAttributesList(includeArchived = false) {
	return useQuery({
		queryKey: attributesKeys.list(includeArchived),
		queryFn: () => attributesApi.list(includeArchived),
		staleTime: 30_000,
	});
}
