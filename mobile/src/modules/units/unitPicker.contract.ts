// BizAssist_mobile
// path: src/modules/units/unitPicker.contract.ts

import type { PrecisionScale, UnitCategory } from "@/modules/units/units.types";

export const UNIT_PICKER_ROUTE = "/(app)/(tabs)/inventory/units/picker" as const;
export const UNIT_ADD_ROUTE = "/(app)/(tabs)/inventory/units/add" as const;
export const UNIT_CREATE_ROUTE = "/(app)/(tabs)/inventory/units/create" as const;
export const UNIT_SELECT_ROUTE = "/(app)/(tabs)/inventory/units/select" as const; // ✅ NEW
export const UNIT_CUSTOM_CREATE_ROUTE = "/(app)/(tabs)/inventory/units/custom-create" as const;

// ---- selection keys (router params) ----
export const UNIT_SELECTED_ID_KEY = "selectedUnitId" as const;
export const UNIT_SELECTED_NAME_KEY = "selectedUnitName" as const;
export const UNIT_SELECTED_ABBR_KEY = "selectedUnitAbbreviation" as const;
export const UNIT_SELECTED_CATEGORY_KEY = "selectedUnitCategory" as const;
export const UNIT_SELECTED_PRECISION_KEY = "selectedUnitPrecisionScale" as const;
export const UNIT_SELECTION_SOURCE_KEY = "selectionSource" as const;

// ---- governance context (picker filtering) ----
export const UNIT_CONTEXT_PRODUCT_TYPE_KEY = "unitProductType" as const;
export type UnitProductType = "PHYSICAL" | "SERVICE";

// ✅ shared canonical navigation keys
export const RETURN_TO_KEY = "returnTo" as const;
export const DRAFT_ID_KEY = "draftId" as const;

// optional create screen helper keys
export const INITIAL_NAME_KEY = "initialName" as const;
export const INITIAL_ABBR_KEY = "initialAbbreviation" as const;
export const INITIAL_CATEGORY_KEY = "initialCategory" as const;

// ✅ Add Unit → Select Unit category key
export const UNIT_CREATE_CATEGORY_KEY = "createUnitCategory" as const;
export const UNIT_SERVICE_GROUP_KEY = "unitServiceGroup" as const;

export type UnitServiceGroup = "TIME_BASED" | "SESSION_BLOCKS" | "ENGAGEMENT_OUTCOME" | "TARGET_BASED";

export type UnitSelectionSource = "existing" | "created" | "cleared";

export type UnitSelectionReturnParams = {
	[UNIT_SELECTED_ID_KEY]?: string;
	[UNIT_SELECTED_NAME_KEY]?: string;
	[UNIT_SELECTED_ABBR_KEY]?: string;
	[UNIT_SELECTED_CATEGORY_KEY]?: UnitCategory | string;
	[UNIT_SELECTED_PRECISION_KEY]?: string;
	[UNIT_SELECTION_SOURCE_KEY]?: UnitSelectionSource;

	[UNIT_CONTEXT_PRODUCT_TYPE_KEY]?: UnitProductType;

	[RETURN_TO_KEY]?: string;
	[DRAFT_ID_KEY]?: string;
};

export type UnitPickerInboundParams = UnitSelectionReturnParams;

export type UnitCreateInboundParams = {
	[RETURN_TO_KEY]?: string;
	[DRAFT_ID_KEY]?: string;

	// seeds
	[INITIAL_NAME_KEY]?: string;
	[INITIAL_ABBR_KEY]?: string;
	[INITIAL_CATEGORY_KEY]?: UnitCategory | string;

	// Create → Select
	[UNIT_CREATE_CATEGORY_KEY]?: UnitCategory | string;

	[UNIT_CONTEXT_PRODUCT_TYPE_KEY]?: UnitProductType;

	// Optional: preserve currently selected unit while creating a new one.
	[UNIT_SELECTED_ID_KEY]?: string;
};

function normalizeString(v: unknown): string {
	return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export function normalizeReturnTo(raw: unknown): string | null {
	const v = String(raw ?? "").trim();
	if (!v) return null;
	if (!v.startsWith("/")) return null;
	if (v === "undefined" || v === "null") return null;
	return v;
}

function clampPrecisionScale(raw: unknown): PrecisionScale {
	const n = typeof raw === "number" ? raw : Number(raw);
	const x = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.trunc(n))) : 0;
	return x as PrecisionScale;
}

function toUnitCategory(raw: unknown): UnitCategory {
	const s = normalizeString(raw);
	const allowed: UnitCategory[] = ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME", "CUSTOM"];
	return allowed.includes(s as UnitCategory) ? (s as UnitCategory) : "COUNT";
}

function toUnitProductType(raw: unknown): UnitProductType | undefined {
	const s = normalizeString(raw);
	return s === "PHYSICAL" || s === "SERVICE" ? (s as UnitProductType) : undefined;
}

function toSelectionSource(raw: unknown): UnitSelectionSource | undefined {
	const s = normalizeString(raw);
	return s === "existing" || s === "created" || s === "cleared" ? (s as UnitSelectionSource) : undefined;
}

function toUnitServiceGroup(raw: unknown): UnitServiceGroup | undefined {
	const s = normalizeString(raw);
	if (s === "TIME_BASED" || s === "SESSION_BLOCKS" || s === "ENGAGEMENT_OUTCOME" || s === "TARGET_BASED") {
		return s as UnitServiceGroup;
	}
	return undefined;
}

export function parseUnitSelectionParams(raw: Record<string, unknown>) {
	const selectedUnitId = normalizeString(raw?.[UNIT_SELECTED_ID_KEY]);
	const selectedUnitName = normalizeString(raw?.[UNIT_SELECTED_NAME_KEY]);
	const selectedUnitAbbreviation = normalizeString(raw?.[UNIT_SELECTED_ABBR_KEY]);
	const selectedUnitCategory = toUnitCategory(raw?.[UNIT_SELECTED_CATEGORY_KEY]);
	const selectedUnitPrecisionScale = clampPrecisionScale(raw?.[UNIT_SELECTED_PRECISION_KEY]);

	const hasSelectionKey = raw?.[UNIT_SELECTED_ID_KEY] !== undefined;

	const returnTo = normalizeReturnTo(raw?.[RETURN_TO_KEY]) ?? "";
	const draftId = normalizeString(raw?.[DRAFT_ID_KEY]);
	const hasDraftIdKey = raw?.[DRAFT_ID_KEY] !== undefined;

	const initialName = normalizeString(raw?.[INITIAL_NAME_KEY]);
	const initialAbbreviation = normalizeString(raw?.[INITIAL_ABBR_KEY]);
	const initialCategory = toUnitCategory(raw?.[INITIAL_CATEGORY_KEY]);

	const createUnitCategory = toUnitCategory(raw?.[UNIT_CREATE_CATEGORY_KEY]);
	const serviceUnitGroup = toUnitServiceGroup(raw?.[UNIT_SERVICE_GROUP_KEY]);

	return {
		selectedUnitId,
		selectedUnitName,
		selectedUnitAbbreviation,
		selectedUnitCategory,
		selectedUnitPrecisionScale,
		selectionSource: toSelectionSource(raw?.[UNIT_SELECTION_SOURCE_KEY]),
		productType: toUnitProductType(raw?.[UNIT_CONTEXT_PRODUCT_TYPE_KEY]),

		returnTo,
		draftId,
		hasDraftIdKey,
		hasSelectionKey,

		// seeds
		initialName,
		initialAbbreviation,
		initialCategory,

		// create flow
		createUnitCategory,
		serviceUnitGroup,
	};
}

export function buildUnitSelectionParams(input: {
	selectedUnitId: string;
	selectedUnitName: string;
	selectedUnitAbbreviation?: string;
	selectedUnitCategory: UnitCategory;
	selectedUnitPrecisionScale: PrecisionScale;
	selectionSource?: UnitSelectionSource;

	draftId?: string;
	returnTo?: string;

	productType?: UnitProductType;
}): UnitSelectionReturnParams {
	return {
		[UNIT_SELECTED_ID_KEY]: input.selectedUnitId,
		[UNIT_SELECTED_NAME_KEY]: input.selectedUnitName,
		[UNIT_SELECTED_ABBR_KEY]: input.selectedUnitAbbreviation ?? "",
		[UNIT_SELECTED_CATEGORY_KEY]: input.selectedUnitCategory,
		[UNIT_SELECTED_PRECISION_KEY]: String(clampPrecisionScale(input.selectedUnitPrecisionScale)),
		[UNIT_SELECTION_SOURCE_KEY]: input.selectionSource,

		[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: input.productType,

		[DRAFT_ID_KEY]: input.draftId,
		[RETURN_TO_KEY]: input.returnTo,
	};
}

export type OpenUnitCreateParamsInput = {
	returnTo?: string;
	draftId?: string;
	initialName?: string;
	productType?: UnitProductType;

	selectedUnitId?: string;
};

export function buildOpenUnitCreateParams(input: OpenUnitCreateParamsInput): UnitCreateInboundParams {
	return {
		[RETURN_TO_KEY]: input.returnTo,
		[DRAFT_ID_KEY]: input.draftId,
		[INITIAL_NAME_KEY]: input.initialName,
		[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: input.productType,
		[UNIT_SELECTED_ID_KEY]: input.selectedUnitId,
	};
}

export type OpenUnitCustomCreateParamsInput = {
	returnTo?: string;
	draftId?: string;
	productType?: UnitProductType;

	selectedUnitId?: string;

	initialName?: string;
	initialAbbreviation?: string;
	initialCategory?: UnitCategory;
};

export function buildOpenUnitCustomCreateParams(input: OpenUnitCustomCreateParamsInput): UnitCreateInboundParams {
	return {
		[RETURN_TO_KEY]: input.returnTo,
		[DRAFT_ID_KEY]: input.draftId,

		[INITIAL_NAME_KEY]: input.initialName,
		[INITIAL_ABBR_KEY]: input.initialAbbreviation,
		[INITIAL_CATEGORY_KEY]: input.initialCategory,

		[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: input.productType,
		[UNIT_SELECTED_ID_KEY]: input.selectedUnitId,
	};
}
