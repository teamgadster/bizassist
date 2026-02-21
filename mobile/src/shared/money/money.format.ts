// BizAssist_mobile
// path: src/shared/money/money.format.ts
//
// POS Currency Display Governance (locked):
// - Business.currencyCode is authoritative.
// - Always show currency explicitly (symbol preferred, code fallback).
// - No ad-hoc toFixed/string concat in UI.
// - This formatter is for display only. Payloads can continue sending decimal strings.
//
// Notes:
// - Intl.NumberFormat is preferred when available.
// - Fallback is "{CODE} {amount}" (ugly but correct).
// - If currencyCode is missing, we return a best-effort numeric string (no invented currency).

export type FormatMoneyArgs = {
	currencyCode?: string | null;
	amount: string | number | null | undefined; // decimal string (preferred), number, or null
	locale?: string | null;
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

export function formatMoney(args: FormatMoneyArgs): string {
	const code = normalizeCurrency(args.currencyCode);
	const { raw, n } = normalizeAmount(args.amount);

	// No currency? Do not invent one.
	if (!code) return raw;

	try {
		if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function" && n !== null) {
			const locale = (args.locale ?? "").trim() || undefined;
			return new Intl.NumberFormat(locale, {
				style: "currency",
				currency: code,
				currencyDisplay: "symbol",
			}).format(n);
		}
	} catch {
		// fall through
	}

	return `${code} ${raw}`;
}
