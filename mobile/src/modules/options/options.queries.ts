import { useQuery } from "@tanstack/react-query";
import { optionsApi } from "./options.api";
import { optionKeys } from "./options.queryKeys";

export { optionKeys };

export function useOptionSetsList(includeArchived = false) {
return useQuery({
queryKey: optionKeys.list(includeArchived),
queryFn: () => optionsApi.list(includeArchived),
staleTime: 300_000,
});
}
