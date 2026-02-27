import apiClient from "@/lib/api/httpClient";

import { DEFAULT_SALES_TAX_DRAFT, type SalesTax, type SalesTaxDraft } from "./taxes.types";

type ApiEnvelope<T> = {
	success: boolean;
	data: T;
};

type ApiSalesTax = {
	id: string;
	name: string;
	percentage: string | number;
	isEnabled: boolean;
	applicationMode: "ALL_TAXABLE" | "SELECT_ITEMS";
	customAmounts: boolean;
	itemPricingMode: "ADD_TO_ITEM_PRICE" | "INCLUDE_IN_ITEM_PRICE";
	itemIds?: string[];
	serviceIds?: string[];
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
};

function sanitizePercentage(value: string | number): number {
	const text = typeof value === "number" ? String(value) : value;
	const n = Number(text.trim());
	if (!Number.isFinite(n)) return 0;
	if (n < 0) return 0;
	if (n > 100) return 100;
	return n;
}

function toSalesTax(item: ApiSalesTax): SalesTax {
	return {
		id: item.id,
		name: item.name,
		percentage: sanitizePercentage(item.percentage),
		enabled: !!item.isEnabled,
		applicationMode: item.applicationMode,
		customAmounts: !!item.customAmounts,
		itemPricingMode: item.itemPricingMode,
		itemIds: Array.isArray(item.itemIds) ? item.itemIds : [],
		serviceIds: Array.isArray(item.serviceIds) ? item.serviceIds : [],
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		archivedAt: item.archivedAt,
	};
}

export const salesTaxesApi = {
	async list(params?: { includeArchived?: boolean }): Promise<{ items: SalesTax[] }> {
		const response = await apiClient.get<ApiEnvelope<{ items: ApiSalesTax[] }>>("/taxes", {
			params: params?.includeArchived ? { includeArchived: true } : undefined,
		});
		const items = (response.data.data.items ?? []).map(toSalesTax);
		return { items };
	},

	async getById(id: string): Promise<SalesTax> {
		const response = await apiClient.get<ApiEnvelope<{ item: ApiSalesTax }>>(`/taxes/${id}`);
		return toSalesTax(response.data.data.item);
	},

	async create(draft: SalesTaxDraft): Promise<SalesTax> {
		const payload = {
			name: draft.name.trim() || DEFAULT_SALES_TAX_DRAFT.name,
			percentage: draft.percentageText.trim() || "0",
			isEnabled: !!draft.enabled,
			applicationMode: draft.applicationMode,
			customAmounts: !!draft.customAmounts,
			itemPricingMode: draft.itemPricingMode,
			itemIds: Array.from(new Set(draft.itemIds)),
			serviceIds: Array.from(new Set(draft.serviceIds)),
		};

		const response = await apiClient.post<ApiEnvelope<{ item: ApiSalesTax }>>("/taxes", payload);
		return toSalesTax(response.data.data.item);
	},

	async update(id: string, draft: SalesTaxDraft): Promise<SalesTax> {
		const payload = {
			name: draft.name.trim() || DEFAULT_SALES_TAX_DRAFT.name,
			percentage: draft.percentageText.trim() || "0",
			isEnabled: !!draft.enabled,
			applicationMode: draft.applicationMode,
			customAmounts: !!draft.customAmounts,
			itemPricingMode: draft.itemPricingMode,
			itemIds: Array.from(new Set(draft.itemIds)),
			serviceIds: Array.from(new Set(draft.serviceIds)),
		};

		const response = await apiClient.patch<ApiEnvelope<{ item: ApiSalesTax }>>(`/taxes/${id}`, payload);
		return toSalesTax(response.data.data.item);
	},

	async archive(id: string): Promise<SalesTax> {
		const response = await apiClient.patch<ApiEnvelope<{ item: ApiSalesTax }>>(`/taxes/${id}/archive`);
		return toSalesTax(response.data.data.item);
	},

	async restore(id: string): Promise<SalesTax> {
		const response = await apiClient.patch<ApiEnvelope<{ item: ApiSalesTax }>>(`/taxes/${id}/restore`);
		return toSalesTax(response.data.data.item);
	},
};
