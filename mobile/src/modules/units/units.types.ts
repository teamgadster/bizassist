// BizAssist_mobile
// path: src/modules/units/units.types.ts
//
// Units types (mobile)
// - Server-backed UnitCategory includes COUNT (aligned with API/Prisma)
// - PrecisionScale is clamped 0..5

export type UnitCategory = "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA" | "TIME" | "CUSTOM";

export type PrecisionScale = 0 | 1 | 2 | 3 | 4 | 5;

export type Unit = {
	id: string;
	businessId: string;
	catalogId: string | null;

	category: UnitCategory;
	name: string;

	abbreviation: string;

	precisionScale: PrecisionScale;

	isActive: boolean;

	createdAt?: string;
	updatedAt?: string;
};

export type EnableCatalogUnitBody = {
	intent: "ENABLE_CATALOG";
	catalogId: string;
	precisionScale?: PrecisionScale;
};

export type CreateCustomUnitBody = {
	intent: "CREATE_CUSTOM";
	category: UnitCategory;
	name: string;
	abbreviation: string;
	precisionScale: PrecisionScale;
};

export type CreateUnitBody = EnableCatalogUnitBody | CreateCustomUnitBody;

export type UnitVisibilityAction = "HIDE" | "RESTORE";

export type UnitVisibilityState = {
	hiddenUnitIds: string[];
};
