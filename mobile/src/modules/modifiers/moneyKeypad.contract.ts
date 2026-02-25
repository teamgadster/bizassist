export const SETTINGS_MODIFIER_MONEY_KEYPAD_ROUTE = "/(app)/(tabs)/settings/modifiers/price-keypad" as const;
export const INVENTORY_MODIFIER_MONEY_KEYPAD_ROUTE = "/(app)/(tabs)/inventory/modifiers/price-keypad" as const;

export const MONEY_RETURN_TO_KEY = "moneyReturnTo" as const;
export const MONEY_DRAFT_ID_KEY = "moneyDraftId" as const;
export const MONEY_OPTION_KEY = "moneyOptionKey" as const;
export const MONEY_DELTA_MINOR_KEY = "moneyDeltaMinor" as const;

function normalizeParam(value: unknown): string {
	return String(value ?? "").trim();
}

function toMinorOrZero(value: unknown): number {
	const raw = normalizeParam(value);
	if (!raw) return 0;
	if (!/^\d+$/.test(raw)) return 0;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return 0;
	const normalized = Math.trunc(parsed);
	return normalized < 0 ? 0 : normalized;
}

export function parseMoneySelectionParams(raw: {
	[MONEY_OPTION_KEY]?: unknown;
	[MONEY_DELTA_MINOR_KEY]?: unknown;
}) {
	return {
		optionKey: normalizeParam(raw?.[MONEY_OPTION_KEY]),
		deltaMinor: toMinorOrZero(raw?.[MONEY_DELTA_MINOR_KEY]),
		hasSelectionKey: raw?.[MONEY_DELTA_MINOR_KEY] !== undefined,
	};
}

export function parseMoneyKeypadParams(raw: {
	[MONEY_RETURN_TO_KEY]?: unknown;
	[MONEY_DRAFT_ID_KEY]?: unknown;
	[MONEY_OPTION_KEY]?: unknown;
	[MONEY_DELTA_MINOR_KEY]?: unknown;
}) {
	return {
		returnTo: normalizeParam(raw?.[MONEY_RETURN_TO_KEY]),
		draftId: normalizeParam(raw?.[MONEY_DRAFT_ID_KEY]),
		optionKey: normalizeParam(raw?.[MONEY_OPTION_KEY]),
		deltaMinor: toMinorOrZero(raw?.[MONEY_DELTA_MINOR_KEY]),
	};
}
