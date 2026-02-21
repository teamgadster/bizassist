// BizAssist_mobile
// path: src/modules/categories/categories.queries.ts

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { categoriesApi } from "@/modules/categories/categories.api";
import { categoryKeys } from "@/modules/categories/categories.queryKeys";
import type { CategoryVisibilityAction, CategoryVisibilityState } from "@/modules/categories/categories.types";

export { categoryKeys } from "@/modules/categories/categories.queryKeys";

export function useCategoryVisibilityQuery() {
	const query = useQuery<CategoryVisibilityState>({
		queryKey: categoryKeys.visibility(),
		queryFn: () => categoriesApi.getVisibility(),
		staleTime: 120_000,
	});

	const hiddenCategoryIds = useMemo(
		() => new Set(query.data?.hiddenCategoryIds ?? []),
		[query.data?.hiddenCategoryIds],
	);

	return { ...query, hiddenCategoryIds };
}

export function useCategoryVisibilityMutation() {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (input: { action: CategoryVisibilityAction; categoryId: string }) =>
			categoriesApi.patchVisibility(input),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: categoryKeys.visibility() });
			qc.invalidateQueries({ queryKey: categoryKeys.list({ isActive: true, q: undefined, limit: undefined }) });
			qc.invalidateQueries({ queryKey: categoryKeys.list({ isActive: false, q: undefined, limit: undefined }) });
			qc.invalidateQueries({ queryKey: categoryKeys.picker({ q: undefined, includeSelectedCategoryId: undefined }) });
			qc.invalidateQueries({ queryKey: categoryKeys.root() });
		},
	});
}
