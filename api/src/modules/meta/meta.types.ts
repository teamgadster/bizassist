// path: src/modules/meta/meta.types.ts

export type CountryMeta = {
	countryCode: string; // ISO 3166-1 alpha-2
	name: string;
	currencyCode: string; // ISO 4217
	timezones: string[]; // curated/trimmed for UI
};

export type CountryMetaAll = CountryMeta & {
	timezonesAll: string[]; // full set for strict backend validation
};
