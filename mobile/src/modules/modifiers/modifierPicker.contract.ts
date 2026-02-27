export const MODIFIER_PICKER_ROUTE = "/(app)/(tabs)/inventory/modifiers/picker" as const;

export const MODIFIER_SELECTED_IDS_KEY = "selectedModifierGroupIds" as const;
export const MODIFIER_SELECTION_SOURCE_KEY = "modifierSelectionSource" as const;
export const RETURN_TO_KEY = "returnTo" as const;
export const DRAFT_ID_KEY = "draftId" as const;

export type ModifierSelectionSource = "existing" | "cleared";

export type ModifierSelectionReturnParams = {
	[MODIFIER_SELECTED_IDS_KEY]?: string;
	[MODIFIER_SELECTION_SOURCE_KEY]?: ModifierSelectionSource;
	[DRAFT_ID_KEY]?: string;
};

export type ModifierPickerInboundParams = {
	[MODIFIER_SELECTED_IDS_KEY]?: string;
	[MODIFIER_SELECTION_SOURCE_KEY]?: ModifierSelectionSource;
	[RETURN_TO_KEY]?: string;
	[DRAFT_ID_KEY]?: string;
};

function normalizeString(value: unknown): string {
	return String(value ?? "").trim();
}

function normalizeIdsFromCsv(raw: unknown): string[] {
	const csv = normalizeString(raw);
	if (!csv) return [];
	return Array.from(
		new Set(
			csv
				.split(",")
				.map((id) => normalizeString(id))
				.filter(Boolean),
		),
	).sort();
}

export function normalizeReturnTo(raw: unknown): string | null {
	const value = normalizeString(raw);
	if (!value) return null;
	if (!value.startsWith("/")) return null;
	if (value === "undefined" || value === "null") return null;
	return value;
}

export function buildModifierSelectionParams(input: {
	selectedModifierGroupIds: string[];
	selectionSource?: ModifierSelectionSource;
	draftId?: string;
}) {
	const csv = Array.from(new Set((input.selectedModifierGroupIds ?? []).map((id) => normalizeString(id)).filter(Boolean)))
		.sort()
		.join(",");
	return {
		[MODIFIER_SELECTED_IDS_KEY]: csv,
		[MODIFIER_SELECTION_SOURCE_KEY]: input.selectionSource,
		[DRAFT_ID_KEY]: input.draftId,
	} satisfies ModifierSelectionReturnParams;
}

export function parseModifierSelectionParams(raw: {
	[MODIFIER_SELECTED_IDS_KEY]?: unknown;
	[MODIFIER_SELECTION_SOURCE_KEY]?: unknown;
	[DRAFT_ID_KEY]?: unknown;
}): {
	selectedModifierGroupIds: string[];
	selectionSource?: ModifierSelectionSource;
	hasSelectionKey: boolean;
	draftId: string;
	hasDraftIdKey: boolean;
} {
	const ids = normalizeIdsFromCsv(raw?.[MODIFIER_SELECTED_IDS_KEY]);
	const sourceRaw = normalizeString(raw?.[MODIFIER_SELECTION_SOURCE_KEY]);
	const selectionSource: ModifierSelectionSource | undefined =
		sourceRaw === "existing" || sourceRaw === "cleared" ? (sourceRaw as ModifierSelectionSource) : undefined;

	return {
		selectedModifierGroupIds: ids,
		selectionSource,
		hasSelectionKey: raw?.[MODIFIER_SELECTED_IDS_KEY] !== undefined,
		draftId: normalizeString(raw?.[DRAFT_ID_KEY]),
		hasDraftIdKey: raw?.[DRAFT_ID_KEY] !== undefined,
	};
}
