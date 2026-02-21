// path: src/modules/business/business.service.ts

import { StatusCodes } from "http-status-codes";
import { AppError } from "@/core/errors/AppError";
import type { CreateBusinessInput, EnforcedCreateBusinessInput } from "@/modules/business/business.types";
import { createBusinessActivation, getActiveBusinessContext } from "@/modules/business/business.repository";
import { deriveCurrencyFromCountry } from "@/modules/business/business.currency";
import { getCountryMetaAll } from "@/modules/meta/meta.service";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";

function normalizeCountryCode(input: CreateBusinessInput): string {
	const raw = (input.countryCode ?? input.country ?? "").trim().toUpperCase();
	if (!raw || raw.length !== FIELD_LIMITS.countryCode) {
		throw new AppError(StatusCodes.BAD_REQUEST, "Country is required.", "VALIDATION_ERROR", {
			field: "countryCode",
		});
	}
	return raw;
}

function normalizeTimezone(input: CreateBusinessInput): string {
	const raw = (input.timezone ?? "").trim();
	if (!raw) {
		throw new AppError(StatusCodes.BAD_REQUEST, "Timezone is required.", "VALIDATION_ERROR", {
			field: "timezone",
		});
	}
	return raw;
}

function normalizeName(input: CreateBusinessInput): string {
	const raw = (input.name ?? "").trim();
	if (raw.length < FIELD_LIMITS.businessNameMin) {
		throw new AppError(StatusCodes.BAD_REQUEST, "Business name is required.", "VALIDATION_ERROR", {
			field: "name",
		});
	}
	return raw;
}

function enforceClientCurrencyMatch(input: CreateBusinessInput, derivedCurrencyCode: string, countryCode: string) {
	const clientRaw = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
	if (clientRaw && clientRaw !== derivedCurrencyCode) {
		throw new AppError(StatusCodes.BAD_REQUEST, "Currency must match the selected country.", "CURRENCY_MISMATCH", {
			countryCode,
			derivedCurrencyCode,
			clientCurrency: clientRaw,
		});
	}
}

export type ActivateBusinessResult =
	| { alreadyExists: true; context: Awaited<ReturnType<typeof getActiveBusinessContext>> }
	| { alreadyExists: false; business: unknown; store: unknown; membership: unknown };

export async function activateBusiness(userId: string, input: CreateBusinessInput): Promise<ActivateBusinessResult> {
	const existing = await getActiveBusinessContext(userId);

	// ✅ Idempotent: if already has an active business, return it (no conflict)
	if (existing?.activeBusiness?.id) {
		return { alreadyExists: true, context: existing };
	}

	const countryCode = normalizeCountryCode(input);
	const timezone = normalizeTimezone(input);
	const name = normalizeName(input);

	// 1) Validate country via Meta (single source of truth)
	const meta = getCountryMetaAll(countryCode);
	if (!meta) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Country not supported yet. Please select a supported country.",
			"COUNTRY_UNSUPPORTED",
			{ countryCode }
		);
	}

	// 2) Validate timezone belongs to country (strict)
	if (!meta.timezonesAll.includes(timezone)) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Please select a timezone that matches your selected country.",
			"TIMEZONE_MISMATCH",
			{
				countryCode,
				timezone,
				allowedTimezones: meta.timezonesAll.slice(0, 50),
				allowedTimezonesCount: meta.timezonesAll.length,
			}
		);
	}

	// 3) Currency is authoritative and derived from country
	const currencyCode = deriveCurrencyFromCountry(countryCode);

	// Backwards-compat: if client sends currency, enforce match
	enforceClientCurrencyMatch(input, currencyCode, countryCode);

	const enforcedInput: EnforcedCreateBusinessInput = {
		name,
		businessType: input.businessType,
		countryCode,
		timezone,
		currencyCode,
		...(input.moduleChoice ? { moduleChoice: input.moduleChoice } : {}),
	};

	const created = await createBusinessActivation(userId, enforcedInput, { maxBusinesses: 1 });

	return { alreadyExists: false, business: created.business, store: created.store, membership: created.membership };
}

export async function fetchActiveBusiness(userId: string) {
	const ctx = await getActiveBusinessContext(userId);

	if (!ctx) {
		throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized", "UNAUTHORIZED");
	}

	return ctx;
}
