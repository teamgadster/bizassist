// path: src/modules/business/business.api.ts

import apiClient from "@/lib/api/httpClient";
import type {
	ActiveBusinessContext,
	ApiEnvelope,
	CreateBusinessPayload,
	CreateBusinessResponse,
} from "./business.types";

import { mmkv, MMKVKeys } from "@/lib/storage/mmkv";

/**
 * Business API is the authoritative place to ensure we have an activeBusinessId
 * after business creation. This prevents downstream Inventory/POS failures
 * when backend enforces active business context.
 */

function safeString(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const s = v.trim();
	return s.length ? s : null;
}

function persistActiveBusinessId(id: string | null | undefined): void {
	const v = safeString(id);
	if (!v) return;
	mmkv.set(MMKVKeys.activeBusinessId, v);
}

/**
 * Attempt to extract a business id from the create-business response,
 * without assuming a single strict response shape.
 */
function extractBusinessIdFromCreateResponse(res: CreateBusinessResponse): string | null {
	// Common candidates we might see across evolving backend payloads.
	const anyRes = res as any;

	// 1) Envelope style: { success, data: { ... } }
	const data = anyRes?.data ?? anyRes?.result ?? anyRes;

	const candidates: unknown[] = [
		// direct fields
		data?.activeBusinessId,
		data?.businessId,
		data?.id,

		// nested business objects
		data?.business?.id,
		data?.activeBusiness?.id,
		data?.context?.business?.id,

		// sometimes the envelope itself carries it
		anyRes?.activeBusinessId,
		anyRes?.businessId,
		anyRes?.id,
		anyRes?.business?.id,
	];

	for (const c of candidates) {
		const id = safeString(c);
		if (id) return id;
	}

	return null;
}

/**
 * Attempt to extract a business id from the active business context envelope.
 */
function extractBusinessIdFromActiveContext(env: ApiEnvelope<ActiveBusinessContext>): string | null {
	const anyEnv = env as any;
	const data = anyEnv?.data;

	const candidates: unknown[] = [
		data?.activeBusinessId,
		data?.businessId,

		data?.business?.id,
		data?.activeBusiness?.id,
		data?.id,
	];

	for (const c of candidates) {
		const id = safeString(c);
		if (id) return id;
	}

	return null;
}

export const businessApi = {
	async createBusiness(payload: CreateBusinessPayload): Promise<CreateBusinessResponse> {
		// Back-compat mapping: current backend expects { country, timezone, currency? }
		const dto = {
			name: payload.name,
			businessType: payload.businessType,
			country: payload.countryCode,
			timezone: payload.timezone,
			currency: payload.currencyCode, // back-compat only; backend should derive/validate
			moduleChoice: payload.moduleChoice,
		};

		const res = await apiClient.post<CreateBusinessResponse>("/business/create", dto);
		const created = res.data;

		/**
		 * CRITICAL INVARIANT:
		 * Ensure activeBusinessId is available for subsequent Inventory/POS calls.
		 *
		 * Strategy:
		 * 1) Try to extract ID directly from create response.
		 * 2) If missing, fall back to /business/active and persist from there.
		 */
		const createdId = extractBusinessIdFromCreateResponse(created);
		if (createdId) {
			persistActiveBusinessId(createdId);
			return created;
		}

		// Fallback: fetch active business context, then persist if possible.
		try {
			const active = await this.getActiveBusiness();
			const activeId = extractBusinessIdFromActiveContext(active);
			if (activeId) persistActiveBusinessId(activeId);
		} catch {
			// If /business/active fails, we still return create response.
			// Downstream flows may handle missing business context via bootstrap.
		}

		return created;
	},

	async getActiveBusiness(): Promise<ApiEnvelope<ActiveBusinessContext>> {
		const res = await apiClient.get<ApiEnvelope<ActiveBusinessContext>>("/business/active");
		const env = res.data;

		/**
		 * Defensive persistence:
		 * If the backend provides active business context, persist it immediately.
		 */
		const id = extractBusinessIdFromActiveContext(env);
		if (id) persistActiveBusinessId(id);

		return env;
	},
};
