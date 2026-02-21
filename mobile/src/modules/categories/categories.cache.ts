import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { categoryKeys } from "@/modules/categories/categories.queryKeys";
import type { Category } from "@/modules/categories/categories.types";

type CategoryListResponse = { items: Category[] };
type CategoryListParams = { q?: string; isActive?: boolean; limit?: number };
type CategoryPickerParams = { q?: string; includeSelectedCategoryId?: string };

function hasItemsPayload(value: unknown): value is CategoryListResponse {
	return !!value && typeof value === "object" && Array.isArray((value as any).items);
}

function parseListParams(queryKey: QueryKey): CategoryListParams | null {
	if (!Array.isArray(queryKey) || queryKey[0] !== categoryKeys.root()[0] || queryKey[1] !== "list") return null;
	const params = (queryKey[2] ?? {}) as Record<string, unknown>;
	return {
		q: typeof params.q === "string" ? params.q : undefined,
		isActive: typeof params.isActive === "boolean" ? params.isActive : undefined,
		limit: typeof params.limit === "number" ? params.limit : undefined,
	};
}

function parsePickerParams(queryKey: QueryKey): CategoryPickerParams | null {
	if (!Array.isArray(queryKey) || queryKey[0] !== categoryKeys.root()[0] || queryKey[1] !== "picker") return null;
	const params = (queryKey[2] ?? {}) as Record<string, unknown>;
	return {
		q: typeof params.q === "string" ? params.q : undefined,
		includeSelectedCategoryId:
			typeof params.includeSelectedCategoryId === "string" ? params.includeSelectedCategoryId : undefined,
	};
}

function categoryMatchesSearch(category: Category, q?: string): boolean {
	const needle = String(q ?? "").trim().toLowerCase();
	if (!needle) return true;
	return String(category.name ?? "").toLowerCase().includes(needle);
}

function sortCategoriesByName(items: Category[]): Category[] {
	return [...items].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}

function upsertCategory(items: Category[], category: Category): Category[] {
	const next = items.filter((item) => item.id !== category.id);
	next.push(category);
	return next;
}

function applyListFilters(items: Category[], params: CategoryListParams): Category[] {
	let next = [...items];

	if (typeof params.isActive === "boolean") {
		next = next.filter((item) => item.isActive === params.isActive);
	}
	if (params.q) {
		next = next.filter((item) => categoryMatchesSearch(item, params.q));
	}

	next = sortCategoriesByName(next);

	if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
		const limit = Math.max(1, Math.trunc(params.limit));
		next = next.slice(0, limit);
	}

	return next;
}

function applyPickerFilters(items: Category[], params: CategoryPickerParams): Category[] {
	const selectedId = String(params.includeSelectedCategoryId ?? "").trim();
	let next = items.filter((item) => item.isActive !== false || (!!selectedId && item.id === selectedId));

	if (params.q) {
		next = next.filter((item) => categoryMatchesSearch(item, params.q) || (!!selectedId && item.id === selectedId));
	}

	return sortCategoriesByName(next);
}

export function syncCategoryCaches(queryClient: QueryClient, category: Category): void {
	const queries = queryClient.getQueryCache().findAll({ queryKey: categoryKeys.root() });

	for (const query of queries) {
		const listParams = parseListParams(query.queryKey);
		if (listParams) {
			queryClient.setQueryData<CategoryListResponse>(query.queryKey, (prev) => {
				if (!hasItemsPayload(prev)) return prev;
				const nextItems = applyListFilters(upsertCategory(prev.items, category), listParams);
				return { ...prev, items: nextItems };
			});
			continue;
		}

		const pickerParams = parsePickerParams(query.queryKey);
		if (pickerParams) {
			queryClient.setQueryData<CategoryListResponse>(query.queryKey, (prev) => {
				if (!hasItemsPayload(prev)) return prev;
				const nextItems = applyPickerFilters(upsertCategory(prev.items, category), pickerParams);
				return { ...prev, items: nextItems };
			});
		}
	}
}
