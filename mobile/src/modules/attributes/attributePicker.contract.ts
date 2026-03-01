export const ATTRIBUTE_PICKER_ROUTE = "/(app)/(tabs)/inventory/attributes/picker" as const;

export const ATTRIBUTE_SELECTIONS_KEY = "selectedAttributes" as const;
export const RETURN_TO_KEY = "returnTo" as const;
export const DRAFT_ID_KEY = "draftId" as const;

export type ProductAttributeSelection = {
	attributeId: string;
	isRequired?: boolean;
};

function normalizeString(value: unknown): string {
	return String(value ?? "").trim();
}

export function normalizeReturnTo(raw: unknown): string | null {
	const value = normalizeString(raw);
	if (!value || !value.startsWith("/")) return null;
	if (value === "undefined" || value === "null") return null;
	return value;
}

export function encodeAttributeSelections(values: ProductAttributeSelection[]): string {
	const normalized = Array.from(
		new Map(
			(values ?? [])
				.map((entry) => ({
					attributeId: normalizeString(entry.attributeId),
					isRequired: entry.isRequired === true,
				}))
				.filter((entry) => entry.attributeId)
				.map((entry) => [entry.attributeId, entry]),
		).values(),
	).sort((a, b) => a.attributeId.localeCompare(b.attributeId));
	return JSON.stringify(normalized);
}

export function decodeAttributeSelections(raw: unknown): ProductAttributeSelection[] {
	const text = normalizeString(raw);
	if (!text) return [];
	try {
		const parsed = JSON.parse(text);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((entry) => ({
				attributeId: normalizeString(entry?.attributeId),
				isRequired: entry?.isRequired === true,
			}))
			.filter((entry) => entry.attributeId);
	} catch {
		return [];
	}
}

export function buildAttributeSelectionParams(input: {
	selectedAttributes: ProductAttributeSelection[];
	draftId?: string;
}) {
	return {
		[ATTRIBUTE_SELECTIONS_KEY]: encodeAttributeSelections(input.selectedAttributes),
		[DRAFT_ID_KEY]: input.draftId,
	};
}
