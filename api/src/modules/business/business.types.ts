// path: src/modules/business/business.types.ts

import type { BusinessType, StaffRole } from "@prisma/client";

/**
 * Future-proof module selection
 */
export type ModuleChoice = "POS" | "INVENTORY";

/**
 * Input accepted by the service layer.
 *
 * Backward compatible:
 * - Accepts countryCode OR country (legacy)
 * - Currency optional (back-compat only); derived/enforced in service
 */
export type CreateBusinessInput = {
	name: string;
	businessType: BusinessType;

	// Canonical
	countryCode?: string; // ISO2 (PH, US, ...)

	// Legacy/back-compat
	country?: string; // ISO2 (PH, US, ...)

	timezone: string; // IANA timezone (Asia/Manila, America/New_York, etc.)

	/**
	 * ISO-4217 currency code.
	 * Optional for backwards compatibility only.
	 * Service layer derives authoritative currency and enforces match if provided.
	 */
	currency?: string;

	moduleChoice?: ModuleChoice;
};

/**
 * Persistence-safe input.
 * By the time we hit the repository:
 * - countryCode MUST exist
 * - currencyCode MUST exist (derived)
 */
export type EnforcedCreateBusinessInput = {
	name: string;
	businessType: BusinessType;
	countryCode: string; // ISO2 required
	timezone: string; // IANA
	currencyCode: string; // ISO4217 required
	moduleChoice?: ModuleChoice;
};

/**
 * Active business context returned to the client.
 * This is the canonical shape used by mobile + web.
 */
export type ActiveBusinessContext = {
	user: {
		id: string;
		email: string | null;
		firstName: string;
		lastName: string;
		activeBusinessId: string | null;
		emailVerified: boolean;
		emailVerifiedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	};

	activeBusiness: null | {
		id: string;
		name: string;
		businessType: BusinessType;

		/**
		 * Back-compat field (existing clients may still read this).
		 * Always equals countryCode.
		 */
		country: string;

		/**
		 * Canonical stable field going forward.
		 */
		countryCode: string;

		timezone: string;

		/**
		 * Canonical stable field going forward.
		 */
		currencyCode: string | null;

		/**
		 * Raw settings blob (future-proofing).
		 */
		settings: Record<string, any> | null;
	};

	defaultStore: null | {
		id: string;
		name: string;
		code: string | null;
		isDefault: boolean;
	};

	staffMembership: null | {
		id: string;
		businessId: string;
		staffRole: StaffRole;
		isPrimary: boolean;
	};
};
