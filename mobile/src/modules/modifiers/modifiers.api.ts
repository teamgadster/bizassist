import apiClient from "@/lib/api/httpClient";
import type {
	CreateModifierGroupPayload,
	CreateModifierOptionPayload,
	ModifierGroup,
	ProductModifierAttachmentPayload,
	UpdateModifierGroupPayload,
	UpdateModifierOptionPayload,
} from "./modifiers.types";

export const modifiersApi = {
	async listGroups(includeArchived = false): Promise<ModifierGroup[]> {
		const res = await apiClient.get<{ success: true; data: { items: ModifierGroup[] } }>("/catalog/modifiers/groups", {
			params: includeArchived ? { includeArchived: 1 } : undefined,
		});
		return res.data.data.items ?? [];
	},

	async archiveGroup(id: string) {
		await apiClient.post(`/catalog/modifiers/modifier-groups/${encodeURIComponent(id)}/archive`);
	},

	async restoreGroup(id: string) {
		await apiClient.post(`/catalog/modifiers/modifier-groups/${encodeURIComponent(id)}/restore`);
	},

	async getGroup(id: string): Promise<ModifierGroup> {
		const res = await apiClient.get<{ success: true; data: { item: ModifierGroup } }>(
			`/catalog/modifiers/groups/${encodeURIComponent(id)}`,
		);
		return res.data.data.item;
	},

	async createGroup(input: CreateModifierGroupPayload): Promise<ModifierGroup> {
		const res = await apiClient.post<{ success: true; data: { item: ModifierGroup } }>("/catalog/modifiers/groups", input);
		return res.data.data.item;
	},

	async updateGroup(id: string, input: UpdateModifierGroupPayload): Promise<ModifierGroup> {
		const res = await apiClient.patch<{ success: true; data: { item: ModifierGroup } }>(
			`/catalog/modifiers/modifier-groups/${encodeURIComponent(id)}`,
			input,
		);
		return res.data.data.item;
	},

	async createOption(groupId: string, input: CreateModifierOptionPayload): Promise<ModifierGroup> {
		const res = await apiClient.post<{ success: true; data: { item: ModifierGroup } }>(
			`/catalog/modifiers/modifier-groups/${encodeURIComponent(groupId)}/options`,
			input,
		);
		return res.data.data.item;
	},

	async updateOption(optionId: string, input: UpdateModifierOptionPayload): Promise<ModifierGroup> {
		const res = await apiClient.patch<{ success: true; data: { item: ModifierGroup } }>(
			`/catalog/modifiers/modifier-options/${encodeURIComponent(optionId)}`,
			input,
		);
		return res.data.data.item;
	},

	async archiveOption(optionId: string) {
		await apiClient.post(`/catalog/modifiers/modifier-options/${encodeURIComponent(optionId)}/archive`);
	},

	async restoreOption(optionId: string) {
		await apiClient.post(`/catalog/modifiers/modifier-options/${encodeURIComponent(optionId)}/restore`);
	},

	async getProductModifiers(productId: string): Promise<ModifierGroup[]> {
		const res = await apiClient.get<{ success: true; data: { items: ModifierGroup[] } }>(
			`/catalog/modifiers/products/${encodeURIComponent(productId)}/modifiers`,
		);
		return res.data.data.items ?? [];
	},

	async replaceProductModifiers(productId: string, input: ProductModifierAttachmentPayload): Promise<ModifierGroup[]> {
		const res = await apiClient.put<{ success: true; data: { items: ModifierGroup[] } }>(
			`/catalog/modifiers/products/${encodeURIComponent(productId)}/modifiers`,
			input,
		);
		return res.data.data.items ?? [];
	},
};
