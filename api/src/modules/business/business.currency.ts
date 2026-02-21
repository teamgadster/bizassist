// path: src/modules/business/business.currency.ts

import { StatusCodes } from "http-status-codes";
import { AppError } from "@/core/errors/AppError";
import { getCountryMetaAll } from "@/modules/meta/meta.service";

export function deriveCurrencyFromCountry(countryCode: string): string {
	const cc = String(countryCode ?? "")
		.trim()
		.toUpperCase();

	if (cc.length !== 2) {
		throw new AppError(StatusCodes.BAD_REQUEST, "Invalid country code.", "VALIDATION_ERROR", {
			field: "countryCode",
			countryCode,
		});
	}

	const meta = getCountryMetaAll(cc);

	if (!meta) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"This country isn’t supported yet. Please choose another nearby country.",
			"COUNTRY_UNSUPPORTED",
			{ countryCode: cc }
		);
	}

	const currencyCode = String(meta.currencyCode ?? "")
		.trim()
		.toUpperCase();

	// Hard invariant: currency must exist and be ISO-4217 shaped
	if (!/^[A-Z]{3}$/.test(currencyCode)) {
		throw new AppError(
			StatusCodes.INTERNAL_SERVER_ERROR,
			"Invalid currency configuration for selected country.",
			"CURRENCY_CONFIG_ERROR",
			{ countryCode: cc, currencyCode }
		);
	}

	return currencyCode;
}
