// BizAssist_mobile
// path: src/modules/options/options.api.ts

import apiClient from "@/lib/api/httpClient";
import type {
	CreateOptionSetPayload,
	ListOptionSetsParams,
	OptionSet,
	OptionSetListResponse,
	UpdateOptionSetPayload,
} from "@/modules/options/options.types";

type ApiEnvelope<T> = {
	success: boolean;
	data: T;
	message?: string;
};

function toTrimmedString(value: unknown): string {
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return "";
}

function normalizeOptionSet(raw: any): OptionSet {
	const values = Array.isArray(raw?.values)
		? raw.values.map((value: any, index: number) => ({
				id: toTrimmedString(value?.id),
				name: toTrimmedString(value?.name),
				sortOrder:
					typeof value?.sortOrder === "number" && Number.isFinite(value.sortOrder)
						? Math.trunc(value.sortOrder)
						: index,
				isActive: typeof value?.isActive === "boolean" ? value.isActive : true,
				archivedAt: typeof value?.archivedAt === "string" ? value.archivedAt : null,
		  }))
		: [];

	return {
		id: toTrimmedString(raw?.id),
		name: toTrimmedString(raw?.name),
		displayName: toTrimmedString(raw?.displayName) || toTrimmedString(raw?.name),
		values,
		isActive: typeof raw?.isActive === "boolean" ? raw.isActive : true,
		archivedAt: typeof raw?.archivedAt === "string" ? raw.archivedAt : null,
		createdAt: toTrimmedString(raw?.createdAt),
		updatedAt: toTrimmedString(raw?.updatedAt),
	};
}

export const optionsApi = {
	async list(params?: ListOptionSetsParams): Promise<OptionSetListResponse> {
		const res = await apiClient.get<ApiEnvelope<{ items: OptionSet[] }>>("/options", { params });
		const items = Array.isArray(res.data.data?.items) ? res.data.data.items.map(normalizeOptionSet) : [];
		return { items };
	},

	async getById(id: string): Promise<OptionSet> {
		const res = await apiClient.get<ApiEnvelope<{ item: OptionSet }>>(`/options/${encodeURIComponent(id)}`);
		return normalizeOptionSet(res.data.data.item);
	},

	async create(payload: CreateOptionSetPayload): Promise<OptionSet> {
		const res = await apiClient.post<ApiEnvelope<{ item: OptionSet }>>("/options", payload);
		return normalizeOptionSet(res.data.data.item);
	},

	async update(id: string, payload: UpdateOptionSetPayload): Promise<OptionSet> {
		const res = await apiClient.patch<ApiEnvelope<{ item: OptionSet }>>(`/options/${encodeURIComponent(id)}`, payload);
		return normalizeOptionSet(res.data.data.item);
	},

	async archive(id: string): Promise<OptionSet> {
		await apiClient.delete<ApiEnvelope<Record<string, never>>>(`/options/${encodeURIComponent(id)}`);
		return optionsApi.getById(id);
	},

	async restore(id: string): Promise<OptionSet> {
		await apiClient.patch<ApiEnvelope<Record<string, never>>>(`/options/${encodeURIComponent(id)}/restore`);
		return optionsApi.getById(id);
	},
};

