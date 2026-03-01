import apiClient from "@/lib/api/httpClient";
import type {
	Attribute,
	CreateAttributeInput,
	ReplaceProductAttributesInput,
	ProductAttributeAssignment,
	UpdateAttributeInput,
} from "./attributes.types";

type Envelope<T> = { success: true; data: T };

export const attributesApi = {
	async list(includeArchived = false): Promise<Attribute[]> {
		const res = await apiClient.get<Envelope<{ items: Attribute[] }>>("/attributes", {
			params: includeArchived ? { includeArchived: 1 } : undefined,
		});
		return res.data.data.items ?? [];
	},

	async getById(id: string): Promise<Attribute> {
		const res = await apiClient.get<Envelope<{ item: Attribute }>>(`/attributes/${encodeURIComponent(id)}`);
		return res.data.data.item;
	},

	async create(input: CreateAttributeInput): Promise<Attribute> {
		const res = await apiClient.post<Envelope<{ item: Attribute }>>("/attributes", input);
		return res.data.data.item;
	},

	async update(id: string, input: UpdateAttributeInput): Promise<Attribute> {
		const res = await apiClient.patch<Envelope<{ item: Attribute }>>(`/attributes/${encodeURIComponent(id)}`, input);
		return res.data.data.item;
	},

	async archive(id: string): Promise<void> {
		await apiClient.post(`/attributes/${encodeURIComponent(id)}/archive`);
	},

	async restore(id: string): Promise<void> {
		await apiClient.post(`/attributes/${encodeURIComponent(id)}/restore`);
	},

	async getProductAttributes(productId: string): Promise<ProductAttributeAssignment[]> {
		const res = await apiClient.get<Envelope<{ items: ProductAttributeAssignment[] }>>(
			`/catalog/products/${encodeURIComponent(productId)}/attributes`,
		);
		return res.data.data.items ?? [];
	},

	async replaceProductAttributes(
		productId: string,
		input: ReplaceProductAttributesInput,
	): Promise<ProductAttributeAssignment[]> {
		const res = await apiClient.put<Envelope<{ items: ProductAttributeAssignment[] }>>(
			`/catalog/products/${encodeURIComponent(productId)}/attributes`,
			input,
		);
		return res.data.data.items ?? [];
	},
};
