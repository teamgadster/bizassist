// path: src/modules/meta/meta.service.ts

import type { CountryMeta, CountryMetaAll } from "@/modules/meta/meta.types";
import { COUNTRIES_ALL, COUNTRIES_ALL_FULL, COUNTRIES_PUBLIC } from "@/modules/meta/meta.data";

/**
 * Public list for UI (onboarding, settings).
 * - Trimmed timezones
 * - Reduced noise
 * - Searchable
 */
export function listCountries(query?: string): ReadonlyArray<CountryMeta> {
	if (!query) return COUNTRIES_PUBLIC;

	const q = query.trim().toLowerCase();

	return COUNTRIES_PUBLIC.filter((c) => c.name.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q));
}

/**
 * Internal trimmed list (rarely needed).
 */
export function getCountriesAll(): ReadonlyArray<CountryMeta> {
	return COUNTRIES_ALL;
}

/**
 * Strict lookup (backend enforcement).
 * Use for:
 * - timezone validation
 * - currency derivation
 */
export function getCountryMetaAll(countryCode: string): CountryMetaAll | null {
	const cc = countryCode.trim().toUpperCase();
	return COUNTRIES_ALL_FULL.find((c) => c.countryCode === cc) ?? null;
}

/**
 * UI lookup (trimmed).
 * Do NOT use for strict validation or currency derivation.
 */
export function getCountryMetaUi(countryCode: string): CountryMeta | null {
	const cc = countryCode.trim().toUpperCase();
	return COUNTRIES_ALL.find((c) => c.countryCode === cc) ?? null;
}

// Back-compat alias to avoid breaking imports.
// Consider deleting once the codebase migrates.
export const getCountryMeta = getCountryMetaUi;
