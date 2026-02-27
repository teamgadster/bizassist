type PercentageRangeOptions = {
	min?: number;
	max?: number;
};

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

export function sanitizePercentageInput(input: string): string {
	let sanitized = "";
	let hasDecimal = false;

	for (const ch of input) {
		if (ch >= "0" && ch <= "9") {
			sanitized += ch;
			continue;
		}

		if (ch === "." && !hasDecimal) {
			hasDecimal = true;
			sanitized += ch;
		}
	}

	return sanitized;
}

export function parsePercentageInput(input: string, options?: PercentageRangeOptions): number | null {
	const min = options?.min ?? DEFAULT_MIN;
	const max = options?.max ?? DEFAULT_MAX;

	const sanitized = sanitizePercentageInput(input.trim());
	if (!sanitized || sanitized === ".") return null;

	const normalized = sanitized.startsWith(".") ? `0${sanitized}` : sanitized;
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) return null;
	if (parsed < min || parsed > max) return null;
	return parsed;
}

export function formatPercentageInput(input: string, options?: PercentageRangeOptions): string {
	const sanitized = sanitizePercentageInput(input.trim());
	if (!sanitized) return "";

	const parsed = parsePercentageInput(sanitized, options);
	if (parsed === null) return sanitized;
	return String(parsed);
}

export function isPercentageInputValid(input: string, options?: PercentageRangeOptions): boolean {
	return parsePercentageInput(input, options) !== null;
}
