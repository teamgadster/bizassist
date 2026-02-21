// BizAssist_mobile path: src/modules/discounts/discounts.api.ts
import { httpClient } from "@/lib/api";
import type {
	CreateDiscountPayload,
	Discount,
	DiscountListResponse,
	DiscountVisibilityAction,
	DiscountVisibilityState,
	UpdateDiscountPayload,
} from "@/modules/discounts/discounts.types";

type ApiEnvelope<T> = {
	success: boolean;
	data: T;
	message?: string;
};

export type ListDiscountsParams = {
	q?: string;
	isActive?: boolean;
	includeArchived?: boolean;
	limit?: number;
};

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

function extractVisibilityPayload(raw: unknown): DiscountVisibilityState {
	const candidates: unknown[] = [get(raw, "data"), raw];

	for (const c of candidates) {
		if (c && typeof c === "object") {
			const obj = asRecord(c);
			const hiddenDiscountIds = Array.isArray(obj.hiddenDiscountIds)
				? obj.hiddenDiscountIds
						.map((id) => toTrimmedString(id))
						.filter((id): id is string => !!id)
				: Array.isArray((obj as any).ids)
				  ? (obj as any).ids.filter((id: unknown): id is string => typeof id === "string" && !!id.trim())
				  : [];
			return { hiddenDiscountIds };
		}
	}

	return { hiddenDiscountIds: [] };
}

export const discountsApi = {
	async list(params?: ListDiscountsParams): Promise<DiscountListResponse> {
		// Canonical: list endpoint returns an envelope containing { items }
		const res = await httpClient.get<ApiEnvelope<DiscountListResponse>>("/discounts", { params });
		return res.data.data;
	},

	async listForPicker(params?: { q?: string }): Promise<DiscountListResponse> {
		const res = await httpClient.get<ApiEnvelope<DiscountListResponse>>("/discounts/picker", { params });
		return res.data.data;
	},

	async getById(id: string): Promise<Discount> {
		const res = await httpClient.get<ApiEnvelope<{ item: Discount }>>(`/discounts/${encodeURIComponent(id)}`);
		return res.data.data.item;
	},

	async create(payload: CreateDiscountPayload): Promise<Discount> {
		const res = await httpClient.post<ApiEnvelope<{ item: Discount }>>("/discounts", payload);
		return res.data.data.item;
	},

	async update(id: string, payload: UpdateDiscountPayload): Promise<Discount> {
		const res = await httpClient.patch<ApiEnvelope<{ item: Discount }>>(`/discounts/${encodeURIComponent(id)}`, payload);
		return res.data.data.item;
	},

	async archive(id: string): Promise<{ ok: true }> {
		await httpClient.patch<ApiEnvelope<{ ok: true }>>(`/discounts/${encodeURIComponent(id)}/archive`);
		return { ok: true };
	},

	async restore(id: string): Promise<{ ok: true }> {
		await httpClient.patch<ApiEnvelope<{ ok: true }>>(`/discounts/${encodeURIComponent(id)}/restore`);
		// Keep restore semantics predictable: restored discounts should be visible by default.
		try {
			await discountsApi.show(id);
		} catch {
			// Best effort; do not fail restore when visibility cleanup cannot be applied.
		}
		return { ok: true };
	},

	async getVisibility(): Promise<DiscountVisibilityState> {
		const res = await httpClient.get<{ success?: boolean; data?: unknown }>(`/discounts/visibility`);
		return extractVisibilityPayload(res.data);
	},

	async patchVisibility(action: DiscountVisibilityAction, discountId: string): Promise<{ ok: boolean }> {
		const res = await httpClient.patch<{ success?: boolean; data?: { ok?: boolean } }>(`/discounts/visibility`, {
			action,
			discountId,
		});
		const ok = (res.data as any)?.ok ?? (res.data as any)?.data?.ok ?? true;
		return { ok: !!ok };
	},

	async hide(discountId: string): Promise<{ ok: boolean }> {
		return discountsApi.patchVisibility("HIDE", discountId);
	},

	async show(discountId: string): Promise<{ ok: boolean }> {
		return discountsApi.patchVisibility("RESTORE", discountId);
	},
};
