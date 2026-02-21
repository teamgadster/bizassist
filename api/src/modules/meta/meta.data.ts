// path: src/modules/meta/meta.data.ts

import type { CountryMeta, CountryMetaAll } from "@/modules/meta/meta.types";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

import ct from "countries-and-timezones";
import countryToCurrency from "country-to-currency";

// i18n-iso-countries requires registering a locale JSON
// eslint-disable-next-line @typescript-eslint/no-var-requires
const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

type CountryToCurrencyMap = Record<string, string>;

const sortByName = (a: CountryMeta, b: CountryMeta) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const sortStrings = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

/**
 * Exclusions: territories/non-user locations that are unlikely to be valid
 * BizAssist onboarding targets (reduce noise in the picker).
 */
const EXCLUDED_COUNTRY_CODES = new Set<string>([
	"AQ", // Antarctica
	"UM", // US Minor Outlying Islands
	"BV", // Bouvet Island
	"TF", // French Southern Territories
	"HM", // Heard Island and McDonald Islands
]);

/**
 * If a country has a ton of timezones, showing all is noisy for onboarding.
 * We keep a trimmed UI list while retaining timezonesAll for strict validation.
 */
const MAX_TIMEZONES_PER_COUNTRY = 8;

/**
 * Small overrides for “business-first” ordering/curation.
 * Keep this tiny; the generator does the heavy lifting.
 */
const OVERRIDES: Partial<Record<string, Partial<CountryMeta>>> = {
	PH: { timezones: ["Asia/Manila"] },
	US: {
		timezones: [
			"America/New_York",
			"America/Chicago",
			"America/Denver",
			"America/Los_Angeles",
			"America/Anchorage",
			"Pacific/Honolulu",
		],
	},
	CN: { name: "China", timezones: ["Asia/Shanghai"] },
};

function normalizeName(name: string): string {
	return name
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^The\s+/i, "");
}

function normalizeTzListAll(timezones: string[]): string[] {
	return Array.from(new Set(timezones.map((t) => String(t).trim()).filter(Boolean))).sort(sortStrings);
}

function normalizeTzListDisplay(timezones: string[]): string[] {
	return normalizeTzListAll(timezones).slice(0, MAX_TIMEZONES_PER_COUNTRY);
}

function buildCountriesFull(): ReadonlyArray<CountryMetaAll> {
	const names: Record<string, string> = countries.getNames("en", { select: "official" }) as Record<string, string>;
	const c2c = countryToCurrency as unknown as CountryToCurrencyMap;

	const byCode = new Map<string, CountryMetaAll>();

	for (const [countryCode, rawName] of Object.entries(names)) {
		const cc = countryCode.trim().toUpperCase();
		if (cc.length !== 2) continue;
		if (EXCLUDED_COUNTRY_CODES.has(cc)) continue;

		const currencyCodeRaw = c2c[cc]?.trim()?.toUpperCase();
		if (!/^[A-Z]{3}$/.test(currencyCodeRaw ?? "")) continue;

		const country = (ct as any).getCountry?.(cc) ?? null;
		const timezonesRaw: string[] = Array.isArray(country?.timezones) ? country.timezones : [];
		if (!timezonesRaw.length) continue;

		const base: CountryMetaAll = {
			countryCode: cc,
			name: normalizeName(String(rawName)),
			currencyCode: currencyCodeRaw!,
			timezones: normalizeTzListDisplay(timezonesRaw),
			timezonesAll: normalizeTzListAll(timezonesRaw),
		};

		const override = OVERRIDES[cc];
		const merged: CountryMetaAll = {
			...base,
			...override,
			name: override?.name ?? base.name,
			timezones: override?.timezones ?? base.timezones,
			// IMPORTANT: never override timezonesAll from UI overrides
			timezonesAll: base.timezonesAll,
		};

		const existing = byCode.get(cc);
		if (!existing) {
			byCode.set(cc, merged);
			continue;
		}

		// Prefer less verbose names and a non-empty timezone list
		const existingScore =
			(existing.name.length <= FIELD_LIMITS.countryNameScoreMax ? 2 : 0) + (existing.timezones.length ? 1 : 0);
		const mergedScore =
			(merged.name.length <= FIELD_LIMITS.countryNameScoreMax ? 2 : 0) + (merged.timezones.length ? 1 : 0);

		if (mergedScore > existingScore) {
			byCode.set(cc, merged);
		}
	}

	return Object.freeze(Array.from(byCode.values()).sort(sortByName));
}

/**
 * Full generated list (for enforcement and internal lookup).
 * Contains: timezones + timezonesAll
 */
export const COUNTRIES_ALL_FULL: ReadonlyArray<CountryMetaAll> = buildCountriesFull();

/**
 * UI/display list (trimmed timezones); do NOT use for strict backend timezone validation.
 * Contains: timezones only (NO timezonesAll)
 */
export const COUNTRIES_ALL: ReadonlyArray<CountryMeta> = Object.freeze(
	COUNTRIES_ALL_FULL.map(({ timezonesAll, ...rest }) => rest)
);

/**
 * Public list filter: reduces onboarding picker noise while keeping global capability.
 * NOTE: Enforcement should always use COUNTRIES_ALL_FULL, not the public list.
 */
const PUBLIC_EXCLUDE = new Set<string>([
	// already excluded earlier: AQ, UM, BV, TF, HM
	"AX", // Åland Islands
	"AS", // American Samoa
	"AI", // Anguilla
	"AW", // Aruba
	"BQ", // Bonaire, Sint Eustatius and Saba
	"CK", // Cook Islands
	"CW", // Curaçao
	"FO", // Faroe Islands
	"FK", // Falkland Islands
	"GF", // French Guiana
	"GP", // Guadeloupe
	"GU", // Guam
	"IM", // Isle of Man
	"JE", // Jersey
	"GG", // Guernsey
	"KY", // Cayman Islands
	"MQ", // Martinique
	"MS", // Montserrat
	"NC", // New Caledonia
	"NF", // Norfolk Island
	"NU", // Niue
	"PF", // French Polynesia
	"PM", // Saint Pierre and Miquelon
	"PR", // Puerto Rico
	"RE", // Reunion
	"SH", // Saint Helena
	"SJ", // Svalbard and Jan Mayen
	"SX", // Sint Maarten (Dutch part)
	"TC", // Turks and Caicos Islands
	"VI", // Virgin Islands, U.S.
	"VG", // Virgin Islands, British
	"WF", // Wallis and Futuna
]);

export const COUNTRIES_PUBLIC: ReadonlyArray<CountryMeta> = Object.freeze(
	COUNTRIES_ALL.filter((c) => !PUBLIC_EXCLUDE.has(c.countryCode))
);
