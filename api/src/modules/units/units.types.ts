// BizAssist_api path: src/modules/units/units.types.ts
import { UnitCategory } from "@prisma/client";

export type UnitCatalogDto = {
	id: string;
	category: UnitCategory;
	name: string;
	abbreviation: string;
	defaultPrecisionScale: number;
};

export type UnitDto = {
	id: string;
	businessId: string;
	catalogId: string | null;
	category: UnitCategory;
	name: string;
	abbreviation: string;
	precisionScale: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreateBusinessUnitInput =
	| {
			intent: "ENABLE_CATALOG";
			catalogId: string;
			precisionScale?: number;
	  }
		| {
			intent: "CREATE_CUSTOM";
			// Governance: category uses COUNT for count-based units.
			category: UnitCategory;
			name: string;
			abbreviation: string;
			precisionScale: number;
		};

export type UpdateBusinessUnitInput = {
	name?: string;
	abbreviation?: string;
	precisionScale?: number;
};

export type ListUnitsQuery = {
	includeArchived?: boolean;
	category?: UnitCategory;
};
