// BizAssist_mobile
// path: src/shared/money/money.symbol.ts

const CURRENCY_SYMBOL_FALLBACK: Record<string, string> = {
	PHP: "₱",
	USD: "$",
	EUR: "€",
	GBP: "£",
	JPY: "¥",
	KRW: "₩",
	INR: "₹",
	THB: "฿",
	VND: "₫",
};

function normalizeCurrencyCode(code?: string | null): string {
	return String(code ?? "").trim().toUpperCase();
}

function extractSymbolFromFormatter(formatter: Intl.NumberFormat, currencyCode: string): string {
	if (typeof formatter.formatToParts === "function") {
		const part = formatter.formatToParts(0).find((piece) => piece.type === "currency")?.value?.trim();
		if (part && part.toUpperCase() !== currencyCode) {
			return part;
		}
	}

	const formatted = formatter.format(0);
	const parsed = formatted.replace(/[\d\s.,-]/g, "").trim();
	if (parsed && parsed.toUpperCase() !== currencyCode) {
		return parsed;
	}

	return "";
}

export function resolveCurrencySymbol(currencyCode?: string | null): string {
	const code = normalizeCurrencyCode(currencyCode);
	if (!code) return "";

	try {
		if (typeof Intl === "undefined" || typeof Intl.NumberFormat !== "function") {
			return CURRENCY_SYMBOL_FALLBACK[code] || code;
		}

		const narrowFormatter = new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: code,
			currencyDisplay: "narrowSymbol",
		});
		const narrowSymbol = extractSymbolFromFormatter(narrowFormatter, code);
		if (narrowSymbol) return narrowSymbol;

		const symbolFormatter = new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: code,
			currencyDisplay: "symbol",
		});
		const symbol = extractSymbolFromFormatter(symbolFormatter, code);
		if (symbol) return symbol;
	} catch {
		return CURRENCY_SYMBOL_FALLBACK[code] || code;
	}

	return CURRENCY_SYMBOL_FALLBACK[code] || code;
}
