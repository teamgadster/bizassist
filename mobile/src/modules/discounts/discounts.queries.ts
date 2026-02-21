// BizAssist_mobile path: src/modules/discounts/discounts.queries.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discountsApi } from "./discounts.api";
import type {
	CreateDiscountPayload,
	Discount,
	DiscountListResponse,
	DiscountVisibilityAction,
	DiscountVisibilityState,
	UpdateDiscountPayload,
} from "./discounts.types";

export const discountsKeys = {
	root: ["discounts"] as const,
	list: (params: { q?: string; isActive?: boolean; includeArchived?: boolean; limit?: number }) =>
		[...discountsKeys.root, "list", params] as const,
	detail: (id: string) => [...discountsKeys.root, "detail", id] as const,
	picker: (params: { q?: string }) => [...discountsKeys.root, "picker", params] as const,
	visibility: () => [...discountsKeys.root, "visibility"] as const,
};

export function useDiscountsList(params: { q?: string; isActive?: boolean; includeArchived?: boolean; limit?: number }) {
	return useQuery<DiscountListResponse>({
		queryKey: discountsKeys.list(params),
		queryFn: () =>
			discountsApi.list({
				q: params.q || undefined,
				isActive: params.isActive,
				includeArchived: params.includeArchived,
				limit: params.limit,
			}),
		staleTime: 120_000,
	});
}

export function useDiscountsPicker(params: { q?: string }) {
	return useQuery<DiscountListResponse>({
		queryKey: discountsKeys.picker(params),
		queryFn: () => discountsApi.listForPicker({ q: params.q || undefined }),
		staleTime: 120_000,
	});
}

export function useDiscountById(id: string) {
	return useQuery<Discount>({
		queryKey: discountsKeys.detail(id),
		queryFn: () => discountsApi.getById(id),
		enabled: !!id,
		staleTime: 120_000,
	});
}

export function useCreateDiscount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (payload: CreateDiscountPayload) => discountsApi.create(payload),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: discountsKeys.root });
		},
	});
}

export function useUpdateDiscount(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (payload: UpdateDiscountPayload) => discountsApi.update(id, payload),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: discountsKeys.root });
		},
	});
}

export function useArchiveDiscount(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => discountsApi.archive(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: discountsKeys.root });
			qc.invalidateQueries({ queryKey: discountsKeys.detail(id) });
		},
	});
}

export function useRestoreDiscount(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => discountsApi.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: discountsKeys.root });
			qc.invalidateQueries({ queryKey: discountsKeys.detail(id) });
		},
	});
}

export function useDiscountVisibilityQuery() {
	const query = useQuery<DiscountVisibilityState>({
		queryKey: discountsKeys.visibility(),
		queryFn: () => discountsApi.getVisibility(),
		staleTime: 120_000,
	});

	const hiddenDiscountIds = useMemo(
		() => new Set(query.data?.hiddenDiscountIds ?? []),
		[query.data?.hiddenDiscountIds],
	);

	return { ...query, hiddenDiscountIds };
}

export function useDiscountVisibilityMutation() {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (input: { action: DiscountVisibilityAction; discountId: string }) =>
			discountsApi.patchVisibility(input.action, input.discountId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: discountsKeys.visibility() });
			qc.invalidateQueries({ queryKey: discountsKeys.list({ q: undefined, isActive: true, includeArchived: false }) });
			qc.invalidateQueries({ queryKey: discountsKeys.list({ q: undefined, includeArchived: true }) });
			qc.invalidateQueries({ queryKey: discountsKeys.picker({ q: undefined }) });
			qc.invalidateQueries({ queryKey: discountsKeys.root });
		},
	});
}
