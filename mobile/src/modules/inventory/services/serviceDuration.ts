// BizAssist_mobile
// path: src/modules/inventory/services/serviceDuration.ts

export const SERVICE_DURATION_MAX_MINUTES = 1440;

export function clampDurationMinutes(value: unknown): number {
	const raw = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(raw)) return 0;
	const n = Math.trunc(raw);
	return Math.max(0, Math.min(SERVICE_DURATION_MAX_MINUTES, n));
}

export function formatDurationLabel(totalMinutes: number): string {
	const safe = clampDurationMinutes(totalMinutes);
	const hours = Math.floor(safe / 60);
	const minutes = safe % 60;

	if (hours > 0 && minutes > 0) {
		return `${hours} ${hours === 1 ? "Hour" : "Hours"}, ${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`;
	}
	if (hours > 0) {
		return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
	}
	return `${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`;
}
