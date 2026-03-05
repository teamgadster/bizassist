// BizAssist_mobile
// path: src/shared/money/money.format.ts
//
// POS Currency Display Governance (locked):
// - Business.currencyCode is authoritative.
// - Operational UI defaults to compact symbol-first display.
// - Financial/audit/multi-currency surfaces must opt into explicit code display.
// - No ad-hoc toFixed/string concat in UI.
// - This formatter is for display only. Payloads can continue sending decimal strings.
//
// Notes:
// - Intl.NumberFormat is preferred when available.
// - Compact fallback is symbol-first when unambiguous, code fallback otherwise.
// - If currencyCode is missing, we return a best-effort numeric string (no invented currency).

import {
	normalizeMoneyDisplayMode,
	resolveCurrencySymbol,
	type MoneyDisplayMode,
} from "@/shared/money/money.symbol";

export type FormatMoneyArgs = {
	currencyCode?: string | null;
	amount: string | number | null | undefined; // decimal string (preferred), number, or null
	locale?: string | null;
	displayMode?: MoneyDisplayMode | null;
};

function normalizeCurrency(code?: string | null): string {
	return (code ?? "").trim().toUpperCase();
}

function normalizeAmount(amount: string | number | null | undefined): { raw: string; n: number | null } {
	if (amount === null || amount === undefined) return { raw: "0", n: 0 };

	if (typeof amount === "number") {
		if (!Number.isFinite(amount)) return { raw: "0", n: 0 };
		return { raw: String(amount), n: amount };
	}

	const raw = String(amount).trim();
	if (!raw) return { raw: "0", n: 0 };

	const n = Number(raw);
	return { raw, n: Number.isFinite(n) ? n : null };
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

export function formatMoney(args: FormatMoneyArgs): string {
	const code = normalizeCurrency(args.currencyCode);
	const { raw, n } = normalizeAmount(args.amount);
	const displayMode = normalizeMoneyDisplayMode(args.displayMode);

	// No currency? Do not invent one.
	if (!code) return raw;

	try {
		if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function" && n !== null) {
			const locale = (args.locale ?? "").trim() || undefined;
			const formattedNumber = new Intl.NumberFormat(locale, {
				style: "decimal",
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(n);
			return formatCurrencyDisplay(formattedNumber, code, displayMode);
		}
	} catch {
		// fall through
	}

	return formatCurrencyDisplay(raw, code, displayMode);
}
