// path: src/modules/meta/meta.types.ts

export type CountryMeta = {
	countryCode: string; // ISO2
	name: string; // full country name
	currencyCode: string; // ISO4217 (display)
	timezones: string[]; // curated list for UI
};

export type ApiEnvelope<T> = {
	success: boolean;
	data: T;
	message?: string;
	code?: string;
};
