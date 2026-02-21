// BizAssist_mobile
// path: src/modules/units/units.api.ts
//
// Units API (governance-aligned)
//
// - listUnits():        GET /units
// - createCustomUnit(): POST /units { intent: "CREATE_CUSTOM", ... }
// - enableCatalogUnit():POST /units { intent: "ENABLE_CATALOG", catalogId, precisionScale? }
//
// NOTES:
// - Backend CREATE_CUSTOM is now idempotent by (businessId, name)
// - Client must treat duplicate-name responses as SUCCESS
// - COUNT + "Each" is the only valid count-based representation

import apiClient from "@/lib/api/httpClient";
import type {
	CreateCustomUnitBody,
	EnableCatalogUnitBody,
	PrecisionScale,
	Unit,
	UnitCategory,
	UnitVisibilityAction,
	UnitVisibilityState,
} from "@/modules/units/units.types";

type ApiEnvelope<T = unknown> = {
	success?: boolean;
	data?: T;
	message?: string;
	error?: { code?: string; message?: string };
};

const UNITS_BASE_PATH = "/units" as const;
const UNIT_VISIBILITY_PATH = `${UNITS_BASE_PATH}/visibility` as const;

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

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

function toNumberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function clampPrecisionScale(raw: unknown): PrecisionScale {
	const n = toNumberOrNull(raw) ?? 0;
	return Math.max(0, Math.min(5, Math.trunc(n))) as PrecisionScale;
}

function toUnitCategory(raw: unknown): UnitCategory {
	const s = (toTrimmedString(raw) ?? "COUNT").toUpperCase();
	const allowed: UnitCategory[] = ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME", "CUSTOM"];
	return (allowed.includes(s as UnitCategory) ? s : "COUNT") as UnitCategory;
}

// Deep getter (keep deterministic; no lodash)
function get(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let cur: any = obj;
	for (const p of parts) {
		if (!cur || typeof cur !== "object") return undefined;
		cur = cur[p];
	}
	return cur;
}

/* -------------------------------------------------------------------------- */
/* Payload extraction (tolerant by design)                                     */
/* -------------------------------------------------------------------------- */

function extractItemsPayload(raw: unknown): unknown[] {
	const candidates: unknown[] = [
		get(raw, "data.items"),
		get(raw, "data.data.items"),
		get(raw, "items"),
		get(raw, "data"),
		raw,
	];

	for (const c of candidates) {
		if (Array.isArray(c)) return c;
	}
	return [];
}

function extractSingleUnitPayload(raw: unknown): unknown {
	const candidates: unknown[] = [
		get(raw, "data.item"),
		get(raw, "data.data.item"),
		get(raw, "item"),
		get(raw, "unit"),
		get(raw, "data.unit"),
		get(raw, "data.data.unit"),
		raw,
	];

	for (const c of candidates) {
		if (c && typeof c === "object") return c;
	}
	return raw;
}

function extractVisibilityPayload(raw: unknown): UnitVisibilityState {
	const candidates: unknown[] = [get(raw, "data"), raw];

	for (const c of candidates) {
		if (c && typeof c === "object") {
			const obj = asRecord(c);
			const hiddenUnitIds = Array.isArray(obj.hiddenUnitIds)
				? obj.hiddenUnitIds.map((id) => toTrimmedString(id)).filter((id): id is string => !!id)
				: [];
			return { hiddenUnitIds };
		}
	}

	return { hiddenUnitIds: [] };
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                               */
/* -------------------------------------------------------------------------- */

function normalizeUnit(input: unknown): Unit {
	const obj = asRecord(input);

	const id = toTrimmedString(obj.id) ?? toTrimmedString((obj as any).unitId) ?? ""; // last resort

	return {
		id,
		businessId: toTrimmedString(obj.businessId) ?? "",
		catalogId: toTrimmedString(obj.catalogId) ?? null,

		category: toUnitCategory(obj.category),

		// COUNT fallback → "Each"
		name: toTrimmedString(obj.name) ?? "Each",

		abbreviation: toTrimmedString(obj.abbreviation) ?? "",
		precisionScale: clampPrecisionScale(obj.precisionScale),

		isActive: typeof obj.isActive === "boolean" ? obj.isActive : true,

		createdAt: toTrimmedString(obj.createdAt) ?? undefined,
		updatedAt: toTrimmedString(obj.updatedAt) ?? undefined,
	};
}

/* -------------------------------------------------------------------------- */
/* API surface                                                                 */
/* -------------------------------------------------------------------------- */

export const unitsApi = {
	async listUnits(opts?: { includeArchived?: boolean }): Promise<Unit[]> {
		const res = await apiClient.get<ApiEnvelope>(UNITS_BASE_PATH, {
			params: { includeArchived: opts?.includeArchived ? 1 : 0 },
		});

		const items = extractItemsPayload(res.data);

		return items.map(normalizeUnit).filter((u) => !!u.id && !!u.name);
	},

	async createCustomUnit(body: CreateCustomUnitBody): Promise<Unit> {
		// IMPORTANT:
		// Backend CREATE_CUSTOM is idempotent.
		// Duplicate names return the existing unit as SUCCESS.
		const res = await apiClient.post<ApiEnvelope>(UNITS_BASE_PATH, body);

		const rawUnit = extractSingleUnitPayload(res.data);
		return normalizeUnit(rawUnit);
	},

	async enableCatalogUnit(body: EnableCatalogUnitBody): Promise<Unit> {
		const res = await apiClient.post<ApiEnvelope>(UNITS_BASE_PATH, body);

		const rawUnit = extractSingleUnitPayload(res.data);
		return normalizeUnit(rawUnit);
	},

	async updateUnit(id: string, body: { name?: string; abbreviation?: string }): Promise<Unit> {
		const safeId = encodeURIComponent(String(id || "").trim());
		const res = await apiClient.patch<ApiEnvelope>(`${UNITS_BASE_PATH}/${safeId}`, body);

		const rawUnit = extractSingleUnitPayload(res.data);
		return normalizeUnit(rawUnit);
	},

	async restoreUnit(id: string): Promise<Unit> {
		const safeId = encodeURIComponent(String(id || "").trim());
		const res = await apiClient.patch<ApiEnvelope>(`${UNITS_BASE_PATH}/${safeId}/restore`, {});

		const rawUnit = extractSingleUnitPayload(res.data);
		return normalizeUnit(rawUnit);
	},

	async archiveUnit(id: string): Promise<Unit> {
		const safeId = encodeURIComponent(String(id || "").trim());
		const res = await apiClient.delete<ApiEnvelope>(`${UNITS_BASE_PATH}/${safeId}`);

		const rawUnit = extractSingleUnitPayload(res.data);
		return normalizeUnit(rawUnit);
	},

	async getVisibility(): Promise<UnitVisibilityState> {
		const res = await apiClient.get<ApiEnvelope>(UNIT_VISIBILITY_PATH);
		return extractVisibilityPayload(res.data);
	},

	async patchVisibility(action: UnitVisibilityAction, unitId: string): Promise<{ ok: boolean }> {
		const res = await apiClient.patch<ApiEnvelope>(UNIT_VISIBILITY_PATH, { action, unitId });
		const ok = (res.data as any)?.ok ?? (res.data as any)?.data?.ok ?? true;
		return { ok: !!ok };
	},

	async hideUnit(unitId: string): Promise<{ ok: boolean }> {
		return unitsApi.patchVisibility("HIDE", unitId);
	},

	async restoreUnitVisibility(unitId: string): Promise<{ ok: boolean }> {
		return unitsApi.patchVisibility("RESTORE", unitId);
	},

	async resetUnitsToEmpty(): Promise<{ archived: string[] }> {
		// Fetch all active units
		const allUnits = await unitsApi.listUnits({ includeArchived: false });

		// Archive all custom units (catalogId === null) and all enabled system units except COUNT ("ea")
		const toArchive = allUnits.filter((u) => u.catalogId === null || (u.catalogId !== "ea" && u.catalogId !== null));

		// Archive all in parallel
		const archived: string[] = [];
		await Promise.all(
			toArchive.map(async (unit) => {
				try {
					await unitsApi.archiveUnit(unit.id);
					archived.push(unit.id);
				} catch {
					// Silently continue on error
				}
			}),
		);

		return { archived };
	},
};
