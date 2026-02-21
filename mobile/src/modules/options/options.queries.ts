// BizAssist_mobile
// path: src/modules/options/options.queries.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { optionsApi } from "@/modules/options/options.api";
import { syncOptionSetCaches } from "@/modules/options/options.cache";
import type {
	CreateOptionSetPayload,
	ListOptionSetsParams,
	OptionSet,
	OptionSetListResponse,
	UpdateOptionSetPayload,
} from "@/modules/options/options.types";

export const optionsKeys = {
	root: ["options"] as const,
	list: (params: ListOptionSetsParams) => [...optionsKeys.root, "list", params] as const,
	detail: (id: string) => [...optionsKeys.root, "detail", id] as const,
};

export function useOptionSetsList(params: ListOptionSetsParams) {
	return useQuery<OptionSetListResponse>({
		queryKey: optionsKeys.list(params),
		queryFn: () => optionsApi.list(params),
		staleTime: 300_000,
	});
}

export function useOptionSetById(id: string) {
	return useQuery<OptionSet>({
		queryKey: optionsKeys.detail(id),
		queryFn: () => optionsApi.getById(id),
		enabled: !!id,
		staleTime: 300_000,
	});
}

export function useCreateOptionSet() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (payload: CreateOptionSetPayload) => optionsApi.create(payload),
		onSuccess: (created) => {
			syncOptionSetCaches(qc, created);
			void qc.invalidateQueries({ queryKey: optionsKeys.root });
		},
	});
}

export function useUpdateOptionSet(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (payload: UpdateOptionSetPayload) => optionsApi.update(id, payload),
		onSuccess: (updated) => {
			syncOptionSetCaches(qc, updated);
			void qc.invalidateQueries({ queryKey: optionsKeys.root });
			void qc.invalidateQueries({ queryKey: optionsKeys.detail(id) });
		},
	});
}

export function useArchiveOptionSet(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => optionsApi.archive(id),
		onSuccess: (archived) => {
			syncOptionSetCaches(qc, archived);
			void qc.invalidateQueries({ queryKey: optionsKeys.root });
			void qc.invalidateQueries({ queryKey: optionsKeys.detail(id) });
		},
	});
}

export function useRestoreOptionSet(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => optionsApi.restore(id),
		onSuccess: (restored) => {
			syncOptionSetCaches(qc, restored);
			void qc.invalidateQueries({ queryKey: optionsKeys.root });
			void qc.invalidateQueries({ queryKey: optionsKeys.detail(id) });
		},
	});
}
