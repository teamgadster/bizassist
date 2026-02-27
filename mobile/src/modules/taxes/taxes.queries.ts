import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { salesTaxesApi } from "./taxes.api";
import { DEFAULT_SALES_TAX_DRAFT, type SalesTaxDraft } from "./taxes.types";

export const salesTaxKeys = {
	root: ["sales-taxes"] as const,
	list: (params?: { includeArchived?: boolean }) =>
		[...salesTaxKeys.root, "list", params?.includeArchived ? "with-archived" : "active-only"] as const,
	detail: (id: string) => [...salesTaxKeys.root, "detail", id] as const,
	draft: () => [...salesTaxKeys.root, "create-draft"] as const,
};

function cloneDraft(input?: SalesTaxDraft): SalesTaxDraft {
	const source = input ?? DEFAULT_SALES_TAX_DRAFT;
	return {
		name: source.name,
		percentageText: source.percentageText,
		enabled: source.enabled,
		applicationMode: source.applicationMode,
		customAmounts: source.customAmounts,
		itemPricingMode: source.itemPricingMode,
		itemIds: [...source.itemIds],
		serviceIds: [...source.serviceIds],
	};
}

export function useSalesTaxesList(params?: { includeArchived?: boolean }) {
	return useQuery({
		queryKey: salesTaxKeys.list(params),
		queryFn: () => salesTaxesApi.list(params),
		staleTime: 60_000,
	});
}

export function useSalesTaxById(id: string | null) {
	return useQuery({
		queryKey: salesTaxKeys.detail(id ?? ""),
		queryFn: () => salesTaxesApi.getById(id as string),
		enabled: !!id,
	});
}

export function useCreateSalesTax() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (draft: SalesTaxDraft) => salesTaxesApi.create(draft),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: salesTaxKeys.root });
		},
	});
}

export function useUpdateSalesTax() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, draft }: { id: string; draft: SalesTaxDraft }) => salesTaxesApi.update(id, draft),
		onSuccess: (item) => {
			queryClient.setQueryData(salesTaxKeys.detail(item.id), item);
			queryClient.invalidateQueries({ queryKey: salesTaxKeys.root });
		},
	});
}

export function useArchiveSalesTax() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => salesTaxesApi.archive(id),
		onSuccess: (item) => {
			queryClient.setQueryData(salesTaxKeys.detail(item.id), item);
			queryClient.invalidateQueries({ queryKey: salesTaxKeys.root });
		},
	});
}

export function useRestoreSalesTax() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => salesTaxesApi.restore(id),
		onSuccess: (item) => {
			queryClient.setQueryData(salesTaxKeys.detail(item.id), item);
			queryClient.invalidateQueries({ queryKey: salesTaxKeys.root });
		},
	});
}

export function useSalesTaxDraft() {
	const queryClient = useQueryClient();
	const query = useQuery<SalesTaxDraft>({
		queryKey: salesTaxKeys.draft(),
		queryFn: async () => cloneDraft(DEFAULT_SALES_TAX_DRAFT),
		initialData: cloneDraft(DEFAULT_SALES_TAX_DRAFT),
		staleTime: Infinity,
	});

	const setDraft = useCallback(
		(updater: SalesTaxDraft | ((current: SalesTaxDraft) => SalesTaxDraft)) => {
			queryClient.setQueryData<SalesTaxDraft>(salesTaxKeys.draft(), (current) => {
				const base = cloneDraft(current ?? DEFAULT_SALES_TAX_DRAFT);
				const next = typeof updater === "function" ? updater(base) : updater;
				return cloneDraft(next);
			});
		},
		[queryClient],
	);

	const resetDraft = useCallback(() => {
		queryClient.setQueryData<SalesTaxDraft>(salesTaxKeys.draft(), cloneDraft(DEFAULT_SALES_TAX_DRAFT));
	}, [queryClient]);

	const draft = useMemo(() => cloneDraft(query.data ?? DEFAULT_SALES_TAX_DRAFT), [query.data]);

	return { ...query, draft, setDraft, resetDraft };
}
