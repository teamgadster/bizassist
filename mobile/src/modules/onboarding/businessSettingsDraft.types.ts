// path: src/modules/onboarding/businessSettingsDraft.types.ts

export type BusinessSettingsDraft = {
	// ISO2
	countryCode: string;

	// ISO4217 (auto-derived from country; immutable by policy)
	currencyCode: string;

	// IANA
	timezone: string;

	// Kept for forward-compat. Currency stays auto/true for now.
	currencyIsAuto: boolean;
	timezoneIsAuto: boolean;
};
