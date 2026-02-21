// BizAssist_mobile
// path: src/modules/categories/categories.api.ts

import apiClient from "@/lib/api/httpClient";

import type {
	Category,
	CategoryVisibilityState,
	CreateCategoryInput,
	ListCategoriesResponse,
	UpdateCategoryInput,
	PatchCategoryVisibilityInput,
} from "./categories.types";

function asRecord(input: unknown): Record<string, unknown> {
	return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function toTrimmedString(value: unknown): string | null {
	if (typeof value === "string") {
		const t = value.trim();
		return t || null;
	}
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
}

function get(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let cur: any = obj;
	for (const p of parts) {
		if (!cur || typeof cur !== "object") return undefined;
		cur = cur[p];
	}
	return cur;
}

function extractVisibilityPayload(raw: unknown): CategoryVisibilityState {
	const candidates: unknown[] = [get(raw, "data"), raw];

	for (const c of candidates) {
		if (c && typeof c === "object") {
			const obj = asRecord(c);
			const hiddenCategoryIds = Array.isArray(obj.hiddenCategoryIds)
				? obj.hiddenCategoryIds
						.map((id) => toTrimmedString(id))
						.filter((id): id is string => !!id)
				: Array.isArray((obj as any).ids)
				  ? (obj as any).ids.filter((id: unknown): id is string => typeof id === "string" && !!id.trim())
				  : [];
			return { hiddenCategoryIds };
		}
	}

	return { hiddenCategoryIds: [] };
}

export const categoriesApi = {
	async list(params: { q?: string; isActive?: boolean; limit?: number } = {}) {
		const res = await apiClient.get<{ success: true; data: ListCategoriesResponse }>(`/categories`, { params });
		return res.data.data;
	},

	async listForPicker(params: { q?: string; includeSelectedCategoryId?: string } = {}) {
		const res = await apiClient.get<{ success: true; data: ListCategoriesResponse }>(`/categories/picker`, {
			params,
		});
		return res.data.data;
	},

	async create(input: CreateCategoryInput) {
		const res = await apiClient.post<{ success: true; data: { item: Category } }>(`/categories`, input);
		return res.data.data.item;
	},

	async update(id: string, input: UpdateCategoryInput) {
		const res = await apiClient.patch<{ success: true; data: { item: Category } }>(`/categories/${id}`, input);
		return res.data.data.item;
	},

	/** Archive category (soft-delete). Idempotent. */
	async archive(id: string) {
		const res = await apiClient.delete<{ success: true }>(`/categories/${id}`);
		return res.data;
	},

	/** Restore previously archived category. Idempotent. */
	async restore(id: string) {
		const res = await apiClient.patch<{ success: true }>(`/categories/${id}/restore`);
		// Keep restore semantics predictable: restored categories should be visible by default.
		try {
			await categoriesApi.restoreCategoryVisibility(id);
		} catch {
			// Best effort; do not fail restore when visibility cleanup cannot be applied.
		}
		return res.data;
	},

	async getVisibility(): Promise<CategoryVisibilityState> {
		const res = await apiClient.get<{ success?: boolean; data?: unknown }>(`/categories/visibility`);
		return extractVisibilityPayload(res.data);
	},

	async patchVisibility(input: PatchCategoryVisibilityInput): Promise<{ ok: boolean }> {
		const res = await apiClient.patch<{ success?: boolean; data?: { ok?: boolean } }>(`/categories/visibility`, input);
		const ok = (res.data as any)?.ok ?? (res.data as any)?.data?.ok ?? true;
		return { ok: !!ok };
	},

	async hideCategory(categoryId: string): Promise<{ ok: boolean }> {
		return categoriesApi.patchVisibility({ action: "HIDE", categoryId });
	},

	async restoreCategoryVisibility(categoryId: string): Promise<{ ok: boolean }> {
		return categoriesApi.patchVisibility({ action: "RESTORE", categoryId });
	},
};
