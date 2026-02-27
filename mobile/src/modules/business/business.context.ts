import type { ActiveBusinessContext, ApiEnvelope } from "@/modules/business/business.types";

function normalizeBusinessId(value: unknown): string {
	if (typeof value !== "string") return "";
	return value.trim();
}

export function resolveActiveBusinessIdFromContext(env?: ApiEnvelope<ActiveBusinessContext>): string {
	if (!env || !env.success) return "";

	const data = env.data;
	const candidates: unknown[] = [
		data.activeBusinessId,
		data.businessId,
		data.activeBusiness?.id,
		(data as any).business?.id,
		data.id,
	];

	for (const value of candidates) {
		const id = normalizeBusinessId(value);
		if (id) return id;
	}

	return "";
}

export function extractActiveBusinessIdFromContext(env: ApiEnvelope<ActiveBusinessContext>): string | null {
	const id = resolveActiveBusinessIdFromContext(env);
	return id || null;
}
