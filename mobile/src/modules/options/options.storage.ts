// BizAssist_mobile
// path: src/modules/options/options.storage.ts

import { MMKVKeys, mmkv } from "@/lib/storage/mmkv";
import type {
	CreateOptionSetPayload,
	ListOptionSetsParams,
	OptionSet,
	OptionSetListResponse,
	OptionValue,
	OptionValueInput,
	UpdateOptionSetPayload,
} from "@/modules/options/options.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeEntityNameInput } from "@/shared/validation/sanitize";

const OPTIONS_KEY_PREFIX = "inventory.options.catalog";
const OPTION_VALUES_CAP = FIELD_LIMITS.optionValuesPerSet;
const OPTION_SETS_CAP = 200;

type OptionCatalogStore = {
	items: OptionSet[];
};

function nowIso(): string {
	return new Date().toISOString();
}

function makeId(prefix: string): string {
	const rand = Math.random().toString(36).slice(2, 9);
	return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function normalizeName(raw: string): string {
	return sanitizeEntityNameInput(raw).trim();
}

function normalizeNameKey(raw: string): string {
	return normalizeName(raw).toLowerCase();
}

function buildError(code: string, message: string, data?: Record<string, unknown>) {
	const err: any = new Error(message);
	err.response = {
		data: {
			code,
			message,
			data,
			error: {
				code,
				message,
				data,
			},
		},
	};
	return err;
}

function getBusinessScope(): string {
	const activeBusinessId = (mmkv.getString(MMKVKeys.activeBusinessId) ?? "").trim();
	return activeBusinessId || "default";
}

function getStoreKey(): string {
	return `${OPTIONS_KEY_PREFIX}.${getBusinessScope()}`;
}

function sortValues(values: OptionValue[]): OptionValue[] {
	return [...values].sort((a, b) => {
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
		return a.name.localeCompare(b.name);
	});
}

function sortOptionSets(items: OptionSet[]): OptionSet[] {
	return [...items].sort((a, b) => {
		const archivedDelta = Number(a.isActive) - Number(b.isActive);
		if (archivedDelta !== 0) return -archivedDelta;
		return a.name.localeCompare(b.name);
	});
}

function readCatalog(): OptionCatalogStore {
	const raw = mmkv.getString(getStoreKey());
	if (!raw) return { items: [] };

	try {
		const parsed = JSON.parse(raw) as OptionCatalogStore;
		if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
		return {
			items: sortOptionSets(
				parsed.items
					.filter((item) => item && typeof item.id === "string")
					.map((item) => ({
						...item,
						name: normalizeName(item.name ?? ""),
						displayName: normalizeName(item.displayName ?? item.name ?? ""),
						values: sortValues(
							(item.values ?? [])
								.filter((value) => value && typeof value.id === "string")
								.map((value, idx) => ({
									id: String(value.id),
									name: normalizeName(String(value.name ?? "")),
									sortOrder: Number.isFinite(value.sortOrder) ? value.sortOrder : idx,
									isActive: value.isActive !== false,
									archivedAt: value.archivedAt ?? null,
								}))
						),
						isActive: item.isActive !== false,
						archivedAt: item.archivedAt ?? null,
						createdAt: item.createdAt ?? nowIso(),
						updatedAt: item.updatedAt ?? nowIso(),
					})),
			),
		};
	} catch {
		return { items: [] };
	}
}

function writeCatalog(store: OptionCatalogStore): void {
	mmkv.set(getStoreKey(), JSON.stringify({ items: sortOptionSets(store.items) }));
}

function normalizeCreateValues(rawValues: string[]): OptionValue[] {
	const seen = new Set<string>();
	const values: OptionValue[] = [];

	for (const raw of rawValues) {
		const name = normalizeName(String(raw ?? ""));
		if (!name) continue;
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		values.push({
			id: makeId("opt_val"),
			name,
			sortOrder: values.length,
			isActive: true,
			archivedAt: null,
		});
	}

	if (values.length === 0) {
		throw buildError("OPTION_VALUES_REQUIRED", "Add at least one option value.");
	}
	if (values.length > OPTION_VALUES_CAP) {
		throw buildError("OPTION_VALUES_LIMIT", `You can add up to ${OPTION_VALUES_CAP} option values.`);
	}

	return values;
}

function normalizeUpdateValues(rawValues: OptionValueInput[]): OptionValue[] {
	const seen = new Set<string>();
	const values: OptionValue[] = [];

	for (const raw of rawValues) {
		const name = normalizeName(raw.name ?? "");
		if (!name) continue;
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);

		values.push({
			id: (raw.id ?? "").trim() || makeId("opt_val"),
			name,
			sortOrder: Number.isFinite(raw.sortOrder) ? Number(raw.sortOrder) : values.length,
			isActive: raw.isActive !== false,
			archivedAt: raw.isActive === false ? nowIso() : null,
		});
	}

	if (values.length === 0) {
		throw buildError("OPTION_VALUES_REQUIRED", "Add at least one option value.");
	}
	if (values.length > OPTION_VALUES_CAP) {
		throw buildError("OPTION_VALUES_LIMIT", `You can add up to ${OPTION_VALUES_CAP} option values.`);
	}

	return sortValues(values);
}

export function listOptionSetsStore(params?: ListOptionSetsParams): OptionSetListResponse {
	const q = normalizeName(String(params?.q ?? "")).toLowerCase();
	const includeArchived = params?.includeArchived === true;
	const isActive = typeof params?.isActive === "boolean" ? params.isActive : undefined;
	const limit = typeof params?.limit === "number" ? Math.max(1, Math.trunc(params.limit)) : undefined;

	let items = readCatalog().items;

	if (!includeArchived) {
		items = items.filter((item) => item.isActive);
	}

	if (isActive !== undefined) {
		items = items.filter((item) => item.isActive === isActive);
	}

	if (q) {
		items = items.filter((item) => {
			if (item.name.toLowerCase().includes(q)) return true;
			if (item.displayName.toLowerCase().includes(q)) return true;
			return item.values.some((value) => value.name.toLowerCase().includes(q));
		});
	}

	if (limit !== undefined) {
		items = items.slice(0, limit);
	}

	return { items };
}

export function getOptionSetByIdStore(id: string): OptionSet {
	const optionSetId = String(id ?? "").trim();
	if (!optionSetId) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	const optionSet = readCatalog().items.find((item) => item.id === optionSetId);
	if (!optionSet) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	return optionSet;
}

export function createOptionSetStore(payload: CreateOptionSetPayload): OptionSet {
	const name = normalizeName(payload.name ?? "");
	const displayName = normalizeName(payload.displayName ?? payload.name ?? "");

	if (!name) {
		throw buildError("OPTION_NAME_REQUIRED", "Option set name is required.");
	}

	const nextValues = normalizeCreateValues(payload.values ?? []);
	const now = nowIso();
	const catalog = readCatalog();

	const duplicate = catalog.items.find((item) => normalizeNameKey(item.name) === normalizeNameKey(name));
	if (duplicate && duplicate.isActive) {
		throw buildError("OPTION_NAME_EXISTS", "Option set name already exists.");
	}
	if (!duplicate && catalog.items.length >= OPTION_SETS_CAP) {
		throw buildError("OPTION_SET_LIMIT_REACHED", `Option set limit reached (max ${OPTION_SETS_CAP}).`, {
			limit: OPTION_SETS_CAP,
		});
	}

	let created: OptionSet;
	if (duplicate && !duplicate.isActive) {
		created = {
			...duplicate,
			name,
			displayName: displayName || name,
			values: nextValues,
			isActive: true,
			archivedAt: null,
			updatedAt: now,
		};
		catalog.items = catalog.items.map((item) => (item.id === duplicate.id ? created : item));
	} else {
		created = {
			id: makeId("opt_set"),
			name,
			displayName: displayName || name,
			values: nextValues,
			isActive: true,
			archivedAt: null,
			createdAt: now,
			updatedAt: now,
		};
		catalog.items.push(created);
	}

	writeCatalog(catalog);
	return created;
}

export function updateOptionSetStore(id: string, payload: UpdateOptionSetPayload): OptionSet {
	const optionSetId = String(id ?? "").trim();
	if (!optionSetId) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	const name = normalizeName(payload.name ?? "");
	const displayName = normalizeName(payload.displayName ?? payload.name ?? "");
	if (!name) {
		throw buildError("OPTION_NAME_REQUIRED", "Option set name is required.");
	}

	const nextValues = normalizeUpdateValues(payload.values ?? []);
	const now = nowIso();
	const catalog = readCatalog();

	const current = catalog.items.find((item) => item.id === optionSetId);
	if (!current) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	const duplicate = catalog.items.find(
		(item) => item.id !== optionSetId && normalizeNameKey(item.name) === normalizeNameKey(name),
	);
	if (duplicate && duplicate.isActive) {
		throw buildError("OPTION_NAME_EXISTS", "Option set name already exists.");
	}

	const updated: OptionSet = {
		...current,
		name,
		displayName: displayName || name,
		values: nextValues,
		updatedAt: now,
	};

	catalog.items = catalog.items.map((item) => (item.id === optionSetId ? updated : item));
	writeCatalog(catalog);
	return updated;
}

export function archiveOptionSetStore(id: string): void {
	const optionSetId = String(id ?? "").trim();
	if (!optionSetId) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	const catalog = readCatalog();
	let found = false;
	catalog.items = catalog.items.map((item) => {
		if (item.id !== optionSetId) return item;
		found = true;
		if (!item.isActive) return item;
		const now = nowIso();
		return {
			...item,
			isActive: false,
			archivedAt: now,
			updatedAt: now,
		};
	});

	if (!found) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	writeCatalog(catalog);
}

export function restoreOptionSetStore(id: string): void {
	const optionSetId = String(id ?? "").trim();
	if (!optionSetId) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	const catalog = readCatalog();
	let found = false;
	catalog.items = catalog.items.map((item) => {
		if (item.id !== optionSetId) return item;
		found = true;
		if (item.isActive) return item;
		const now = nowIso();
		return {
			...item,
			isActive: true,
			archivedAt: null,
			updatedAt: now,
		};
	});

	if (!found) {
		throw buildError("OPTION_NOT_FOUND", "Option set not found.");
	}

	writeCatalog(catalog);
}
