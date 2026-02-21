// BizAssist_mobile
// path: src/modules/options/options.contract.ts

export const DRAFT_ID_KEY = "draftId" as const;
export const RETURN_TO_KEY = "returnTo" as const;
export const OPTION_SET_ID_KEY = "optionSetId" as const;
export const OPTION_VALUES_MODE_KEY = "selectionMode" as const;
export const VARIATION_ID_KEY = "variationId" as const;

export type OptionValueSelectionMode = "MULTI" | "SINGLE";

export function normalizeRoutePath(raw: unknown): string | null {
	const value = String(raw ?? "").trim();
	if (!value || !value.startsWith("/")) return null;
	if (value === "undefined" || value === "null") return null;
	return value;
}

export function normalizeString(raw: unknown): string {
	return String(raw ?? "").trim();
}

export function parseSelectionMode(raw: unknown): OptionValueSelectionMode {
	const mode = String(raw ?? "").trim().toUpperCase();
	return mode === "SINGLE" ? "SINGLE" : "MULTI";
}
