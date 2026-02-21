import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ListOptionSetsParams, OptionSet, OptionSetListResponse } from "@/modules/options/options.types";

const OPTIONS_ROOT_KEY = "options";
const optionsListKey = (params: ListOptionSetsParams) => [OPTIONS_ROOT_KEY, "list", params] as const;
const optionsDetailKey = (id: string) => [OPTIONS_ROOT_KEY, "detail", id] as const;

function hasItemsPayload(value: unknown): value is OptionSetListResponse {
	return !!value && typeof value === "object" && Array.isArray((value as any).items);
}

function parseListParams(queryKey: QueryKey): ListOptionSetsParams | null {
	if (!Array.isArray(queryKey) || queryKey[0] !== OPTIONS_ROOT_KEY || queryKey[1] !== "list") return null;
	const params = (queryKey[2] ?? {}) as Record<string, unknown>;
	return {
		q: typeof params.q === "string" ? params.q : undefined,
		isActive: typeof params.isActive === "boolean" ? params.isActive : undefined,
		includeArchived: typeof params.includeArchived === "boolean" ? params.includeArchived : undefined,
		limit: typeof params.limit === "number" ? params.limit : undefined,
	};
}

function optionMatchesSearch(optionSet: OptionSet, q?: string): boolean {
	const needle = String(q ?? "").trim().toLowerCase();
	if (!needle) return true;
	if (optionSet.name.toLowerCase().includes(needle)) return true;
	if (optionSet.displayName.toLowerCase().includes(needle)) return true;
	return optionSet.values.some((value) => value.name.toLowerCase().includes(needle));
}

function sortOptionSets(items: OptionSet[]): OptionSet[] {
	return [...items].sort((a, b) => {
		const activeDelta = Number(b.isActive) - Number(a.isActive);
		if (activeDelta !== 0) return activeDelta;
		return a.name.localeCompare(b.name);
	});
}

function upsertOptionSet(items: OptionSet[], optionSet: OptionSet): OptionSet[] {
	const next = items.filter((item) => item.id !== optionSet.id);
	next.push(optionSet);
	return next;
}

function applyListFilters(items: OptionSet[], params: ListOptionSetsParams): OptionSet[] {
	let next = [...items];

	if (params.includeArchived !== true) {
		next = next.filter((item) => item.isActive);
	}
	if (typeof params.isActive === "boolean") {
		next = next.filter((item) => item.isActive === params.isActive);
	}
	if (params.q) {
		next = next.filter((item) => optionMatchesSearch(item, params.q));
	}

	next = sortOptionSets(next);

	if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
		const limit = Math.max(1, Math.trunc(params.limit));
		next = next.slice(0, limit);
	}

	return next;
}

export function syncOptionSetCaches(queryClient: QueryClient, optionSet: OptionSet): void {
	queryClient.setQueryData<OptionSet>(optionsDetailKey(optionSet.id), optionSet);

	const queries = queryClient.getQueryCache().findAll({ queryKey: [OPTIONS_ROOT_KEY] });
	for (const query of queries) {
		const listParams = parseListParams(query.queryKey);
		if (!listParams) continue;

		queryClient.setQueryData<OptionSetListResponse>(query.queryKey, (prev) => {
			if (!hasItemsPayload(prev)) return prev;
			const nextItems = applyListFilters(upsertOptionSet(prev.items, optionSet), listParams);
			return { ...prev, items: nextItems };
		});
	}

	// Ensure canonical active/inactive list keys also stay in sync when present.
	queryClient.setQueryData<OptionSetListResponse>(optionsListKey({ includeArchived: true, limit: 250 }), (prev) => {
		if (!hasItemsPayload(prev)) return prev;
		return { ...prev, items: applyListFilters(upsertOptionSet(prev.items, optionSet), { includeArchived: true, limit: 250 }) };
	});
	queryClient.setQueryData<OptionSetListResponse>(optionsListKey({ includeArchived: false, limit: 250 }), (prev) => {
		if (!hasItemsPayload(prev)) return prev;
		return {
			...prev,
			items: applyListFilters(upsertOptionSet(prev.items, optionSet), { includeArchived: false, limit: 250 }),
		};
	});
}
