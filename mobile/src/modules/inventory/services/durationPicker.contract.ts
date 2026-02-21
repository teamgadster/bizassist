// BizAssist_mobile
// path: src/modules/inventory/services/durationPicker.contract.ts

export const SERVICE_DURATION_PICKER_ROUTE = "/(app)/(tabs)/inventory/services/duration-picker" as const;

export const RETURN_TO_KEY = "returnTo" as const;
export const DRAFT_ID_KEY = "draftId" as const;
export const DURATION_TARGET_KEY = "durationTarget" as const;
export const DURATION_MINUTES_KEY = "durationMinutes" as const;

export type ServiceDurationTarget = "total" | "initial" | "processing" | "final";

function normalizeParam(value: unknown): string {
	return String(value ?? "").trim();
}

export function normalizeDurationTarget(value: unknown): ServiceDurationTarget | null {
	const raw = normalizeParam(value);
	if (raw === "total" || raw === "initial" || raw === "processing" || raw === "final") return raw;
	return null;
}

export function parseDurationSelectionParams(raw: {
	[DURATION_TARGET_KEY]?: unknown;
	[DURATION_MINUTES_KEY]?: unknown;
	[DRAFT_ID_KEY]?: unknown;
}) {
	const target = normalizeDurationTarget(raw?.[DURATION_TARGET_KEY]);
	const minutesRaw = normalizeParam(raw?.[DURATION_MINUTES_KEY]);
	const minutesNum = Number(minutesRaw);
	const minutes = Number.isFinite(minutesNum) ? Math.trunc(minutesNum) : null;

	return {
		target,
		minutes,
		draftId: normalizeParam(raw?.[DRAFT_ID_KEY]),
		hasSelectionKey: raw?.[DURATION_MINUTES_KEY] !== undefined,
	};
}
