// path: src/modules/onboarding/businessSettingsDraft.derive.ts

import type { CountryMeta } from "@/modules/meta/meta.types";
import type { BusinessSettingsDraft } from "./businessSettingsDraft.types";

export function getDeviceTimeZone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
	} catch {
		return null;
	}
}

export function deriveTimezoneForCountry(country: CountryMeta): { timezone: string; timezoneIsAuto: boolean } {
	const deviceTz = getDeviceTimeZone();
	const tz = deviceTz && country.timezones.includes(deviceTz) ? deviceTz : country.timezones[0] ?? "UTC";

	return {
		timezone: tz,
		timezoneIsAuto: true,
	};
}

export function deriveDraftFromCountry(country: CountryMeta): BusinessSettingsDraft {
	const tz = deriveTimezoneForCountry(country);

	return {
		countryCode: country.countryCode,
		currencyCode: country.currencyCode, // currency is derived and treated as auto/immutable
		timezone: tz.timezone,
		currencyIsAuto: true,
		timezoneIsAuto: tz.timezoneIsAuto,
	};
}
