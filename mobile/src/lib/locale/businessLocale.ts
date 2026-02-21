// BizAssist_mobile
// path: src/lib/locale/businessLocale.ts
//
// Business locale resolution + compact number formatting.
// Locale is derived from business countryCode (NOT device locale).

const COUNTRY_LOCALE_MAP: Record<string, string> = {
	PH: "en-PH",
	US: "en-US",
	GB: "en-GB",
	AU: "en-AU",
	CA: "en-CA",
	FR: "fr-FR",
	DE: "de-DE",
	ES: "es-ES",
	IT: "it-IT",
	NL: "nl-NL",
	SE: "sv-SE",
	NO: "nb-NO",
	DK: "da-DK",
	JP: "ja-JP",
	KR: "ko-KR",
	CN: "zh-CN",
	TW: "zh-TW",
	SG: "en-SG",
	MY: "ms-MY",
	TH: "th-TH",
	VN: "vi-VN",
	ID: "id-ID",
	IN: "en-IN",
	AE: "ar-AE",
	SA: "ar-SA",
};

function normalizeCountryCode(countryCode?: string | null): string {
	return (countryCode ?? "").trim().toUpperCase();
}

export function getBusinessLocale(countryCode?: string | null): string {
	const code = normalizeCountryCode(countryCode);
	return COUNTRY_LOCALE_MAP[code] ?? "en-US";
}

export function getBusinessNumberFormatter(
	countryCode?: string | null,
	options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
	const locale = getBusinessLocale(countryCode);
	return new Intl.NumberFormat(locale, options);
}

export function formatCompactNumber(value: number, countryCode?: string | null): string {
	const n = Number.isFinite(value) ? value : 0;
	const abs = Math.abs(n);
	const locale = getBusinessLocale(countryCode);

	if (abs < 1000) {
		return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
	}

	const maximumFractionDigits = abs >= 10000 ? 0 : 1;
	return new Intl.NumberFormat(locale, {
		notation: "compact",
		compactDisplay: "short",
		maximumFractionDigits,
	}).format(n);
}
