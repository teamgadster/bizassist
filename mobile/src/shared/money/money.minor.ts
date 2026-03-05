import { MONEY_INPUT_MAX_WHOLE_DIGITS, MONEY_INPUT_PRECISION } from "@/shared/money/money.constants";
import {
	normalizeMoneyDisplayMode,
	resolveCurrencySymbol,
	type MoneyDisplayMode,
} from "@/shared/money/money.symbol";

export const MONEY_MINOR_SCALE_DEFAULT = MONEY_INPUT_PRECISION;
export const MONEY_MAX_MINOR_DIGITS = MONEY_INPUT_MAX_WHOLE_DIGITS + MONEY_INPUT_PRECISION;

function toNonNegativeInteger(value: unknown): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	const normalized = Math.trunc(parsed);
	return normalized < 0 ? 0 : normalized;
}

function minorDigitsCount(value: number): number {
	const normalized = toNonNegativeInteger(value);
	if (normalized === 0) return 1;
	return String(normalized).length;
}

function canGrow(nextValue: number, maxMinorDigits: number): boolean {
	const safeMaxDigits = Math.max(1, Math.trunc(maxMinorDigits));
	return minorDigitsCount(nextValue) <= safeMaxDigits;
}

export function parseMinorUnits(raw: unknown): number {
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return 0;
		if (!/^\d+$/.test(trimmed)) return 0;
		return toNonNegativeInteger(Number(trimmed));
	}
	return toNonNegativeInteger(raw);
}

export function sanitizeDigits(text: string): string {
	return String(text ?? "").replace(/\D+/g, "");
}

export function digitsToMinorUnits(digits: string, maxDigits = MONEY_MAX_MINOR_DIGITS): number {
	const sanitized = sanitizeDigits(digits);
	if (!sanitized) return 0;
	const safeMaxDigits = Math.max(1, Math.trunc(maxDigits));
	const clampedDigits = sanitized.length > safeMaxDigits ? sanitized.slice(0, safeMaxDigits) : sanitized;
	return parseMinorUnits(clampedDigits);
}

function formatCurrencyDisplay(
	formattedNumber: string,
	currencyCode: string,
	displayMode: MoneyDisplayMode,
): string {
	if (displayMode === "explicit") {
		return `${currencyCode} ${formattedNumber}`;
	}

	const symbol = resolveCurrencySymbol(currencyCode);
	if (symbol && symbol !== currencyCode) {
		return `${symbol}${formattedNumber}`;
	}
	return `${currencyCode} ${formattedNumber}`;
}

export function formatMoneyFromMinor(args: {
	minorUnits: number;
	currencyCode?: string | null;
	scale?: number;
	locale?: string | null;
	displayMode?: MoneyDisplayMode | null;
}): string {
	const scale = Number.isFinite(args.scale) ? Math.max(0, Math.trunc(args.scale!)) : MONEY_MINOR_SCALE_DEFAULT;
	const minorUnits = toNonNegativeInteger(args.minorUnits);
	const divisor = 10 ** scale;
	const major = minorUnits / divisor;
	const code = String(args.currencyCode ?? "PHP").trim().toUpperCase() || "PHP";
	const displayMode = normalizeMoneyDisplayMode(args.displayMode);

	try {
		if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
			const locale = String(args.locale ?? "").trim() || undefined;
			const formattedNumber = new Intl.NumberFormat(locale, {
				style: "decimal",
				minimumFractionDigits: scale,
				maximumFractionDigits: scale,
			}).format(major);
			return formatCurrencyDisplay(formattedNumber, code, displayMode);
		}
	} catch {
		// fall through
	}

	return formatCurrencyDisplay(major.toFixed(scale), code, displayMode);
}

export function formatMinorUnits(args: {
	minorUnits: number;
	currencyCode?: string | null;
	scale?: number;
	locale?: string | null;
	displayMode?: MoneyDisplayMode | null;
}): string {
	return formatMoneyFromMinor(args);
}

export const moneyOps = {
	appendDigit(currentMinor: number, digit: number, maxMinorDigits = MONEY_MAX_MINOR_DIGITS): number {
		const current = toNonNegativeInteger(currentMinor);
		const normalizedDigit = Math.max(0, Math.min(9, Math.trunc(digit)));
		const next = current * 10 + normalizedDigit;
		if (!canGrow(next, maxMinorDigits)) return current;
		return next;
	},

	appendDoubleZero(currentMinor: number, maxMinorDigits = MONEY_MAX_MINOR_DIGITS): number {
		const current = toNonNegativeInteger(currentMinor);
		const next = current * 100;
		if (!canGrow(next, maxMinorDigits)) return current;
		return next;
	},

	backspace(currentMinor: number): number {
		const current = toNonNegativeInteger(currentMinor);
		return Math.floor(current / 10);
	},

	clear(): number {
		return 0;
	},
};
