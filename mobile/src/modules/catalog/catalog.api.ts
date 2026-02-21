// BizAssist_mobile
// path: src/modules/catalog/catalog.api.ts

import apiClient from "@/lib/api/httpClient";
import type { CatalogListProductsResult, CatalogProduct } from "./catalog.types";

type ApiEnvelope<T> = {
	success: boolean;
	data: T;
	message?: string;
};

// Backwards-compat: callers expect ListProductsResponse
export type ListProductsResponse = CatalogListProductsResult;

// ✅ API uses `cursor`.
// ✅ Keep `nextCursor` as a backwards-compat alias so existing callers don’t break.
export type ListCatalogProductsParams = {
	q?: string;
	limit?: number;

	// canonical
	cursor?: string | null;

	// backwards-compat alias (will be mapped to cursor if provided)
	nextCursor?: string | null;
};

function normalizeListParams(params: ListCatalogProductsParams) {
	const { nextCursor, cursor, ...rest } = params;

	// Prefer explicit cursor; otherwise use nextCursor alias.
	const effectiveCursor = cursor ?? nextCursor ?? undefined;

	return {
		...rest,
		cursor: effectiveCursor,
	};
}

export const catalogApi = {
	async listProducts(params: ListCatalogProductsParams = {}): Promise<ListProductsResponse> {
		const res = await apiClient.get<ApiEnvelope<ListProductsResponse>>("/catalog/products", {
			params: normalizeListParams(params),
		});
		return res.data.data;
	},

	async getProduct(id: string): Promise<CatalogProduct> {
		const res = await apiClient.get<ApiEnvelope<CatalogProduct>>(`/catalog/products/${id}`);
		return res.data.data;
	},
};
