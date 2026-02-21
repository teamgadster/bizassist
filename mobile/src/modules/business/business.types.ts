// path: src/modules/business/business.types.ts

export type ModuleChoice = "POS" | "INVENTORY";

/**
 * Must match API Prisma enum BusinessType.
 * Keep backward-safe by allowing both "RETAIL" and "GENERAL_RETAIL" (depending on your schema history).
 */
export type BusinessType = "RETAIL" | "GENERAL_RETAIL" | "CLINIC" | "VET" | "GROOMING" | "RESTAURANT" | "OTHER";

/**
 * Canonical (masterplan) create payload used by mobile.
 * businessApi maps this to backend DTO fields for back-compat.
 */
export type CreateBusinessPayload = {
	name: string;
	businessType: BusinessType;

	// Canonical (masterplan)
	countryCode: string; // ISO2
	currencyCode: string; // ISO4217 (derived; immutable by policy)
	timezone: string; // IANA

	moduleChoice?: ModuleChoice;
};

export type Store = {
	id: string;
	businessId: string;
	name: string;
	isDefault: boolean;
	code?: string | null;
};

export type StaffMembership = {
	id: string;
	userId?: string; // sometimes omitted in API selects
	businessId: string;
	staffRole: "OWNER" | "MANAGER" | "CASHIER" | "STAFF";
	isPrimary: boolean;
};

/**
 * Business settings is a server-owned bag.
 * Keep it flexible but safer than `any`.
 */
export type BusinessSettings = {
	currency?: string; // ISO4217 (authoritative, immutable by policy)
	moduleChoice?: ModuleChoice;

	// allow forward expansion without forcing `any`
	[key: string]: unknown;
};

export type ActiveBusiness = {
	id: string;
	name: string;

	// Current backend fields (back-compat)
	country: string; // ISO2
	timezone: string; // IANA

	businessType: BusinessType;

	/**
	 * Preferred stable field (API should expose this).
	 * If not present, fallback to settings.currency.
	 */
	currencyCode?: string; // ISO4217

	/**
	 * Raw settings object returned by API.
	 * Currency is often stored here in current backend implementations.
	 */
	settings?: BusinessSettings;

	// allow forward expansion
	[key: string]: unknown;
};

export type ActiveStore = {
	id: string;
	businessId?: string; // sometimes omitted in selects
	name: string;
	isDefault: boolean;
	code?: string | null;
};

export type ActiveBusinessContext = {
	/**
	 * Canonical context object.
	 */
	activeBusiness: ActiveBusiness | null;

	/**
	 * Optional convenience IDs some backends return.
	 * (Useful for defensive extraction/persistence.)
	 */
	activeBusinessId?: string;
	businessId?: string;

	// depending on backend naming, one or more may exist:
	activeStore?: ActiveStore | null;
	defaultStore?: ActiveStore | null;

	staffMembership?: StaffMembership | null;

	// allow future expansion without breaking
	[key: string]: unknown;
};

/**
 * Create Business response:
 * Keep the expected nested shape (current backend),
 * but allow future/alternate shapes without breaking callers.
 */
export type CreateBusinessResponse = {
	success: true;
	data: {
		business: {
			id: string;
			name: string;
			country: string;
			timezone: string;
			businessType: BusinessType;

			// some APIs return these directly:
			currencyCode?: string;
			settings?: BusinessSettings;

			[key: string]: unknown;
		};
		defaultStore: Store;
		staffMembership: StaffMembership;

		// optional forward/back-compat additions
		activeBusinessId?: string;
		businessId?: string;

		[key: string]: unknown;
	};

	// optional convenience fields if backend ever hoists them
	activeBusinessId?: string;
	businessId?: string;
	id?: string;

	[key: string]: unknown;
};

/**
 * Envelope types
 * - Prefer these for new code.
 * - Keep ApiEnvelope<T> as an alias for backwards usage.
 */
export type ApiSuccessEnvelope<T> = {
	success: true;
	data: T;
	message?: string;
	code?: string;
};

export type ApiErrorEnvelope = {
	success: false;
	message: string;
	code?: string;
	data?: unknown;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
