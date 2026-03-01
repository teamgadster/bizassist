// path: src/modules/pos/pos.api.ts
import apiClient from "@/lib/api/httpClient";
import { CheckoutInput, CheckoutResult } from "./pos.types";
import type { ProductAttributeAssignment } from "@/modules/attributes/attributes.types";

export type ProductModifierOption = {
	id: string;
	name: string;
	priceDeltaMinor: string;
	sortOrder: number;
	isSoldOut?: boolean;
};

export type ProductModifierGroup = {
	id: string;
	productId: string;
	name: string;
	selectionType: "SINGLE" | "MULTI";
	isRequired: boolean;
	minSelected: number;
	maxSelected: number;
	sortOrder: number;
	options: ProductModifierOption[];
};

export const posApi = {
	async getProductModifiers(productId: string) {
		const res = await apiClient.get<{ success: true; data: { items: ProductModifierGroup[] } }>(
			`/modifiers/products/${encodeURIComponent(productId)}/modifiers`,
		);
		return res.data.data.items ?? [];
	},

	async checkout(input: CheckoutInput) {
		const res = await apiClient.post<{ success: true; data: CheckoutResult }>("/pos/checkout", input);
		return res.data.data;
	},

	async getProductAttributes(productId: string): Promise<ProductAttributeAssignment[]> {
		const res = await apiClient.get<{ success: true; data: { items: ProductAttributeAssignment[] } }>(
			`/catalog/products/${encodeURIComponent(productId)}/attributes`,
		);
		return res.data.data.items ?? [];
	},
};
