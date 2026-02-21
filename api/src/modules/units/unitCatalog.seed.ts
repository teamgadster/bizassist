// BizAssist_api
// path: src/modules/units/unitCatalog.seed.ts
//
// NOTE: Keep this list in sync with mobile/src/features/units/unitCatalog.ts.
// The server catalog uses COUNT for count-like units.

import { UnitCategory } from "@prisma/client";

export type UnitCatalogSeed = {
	id: string;
	category: UnitCategory;
	name: string;
	abbreviation: string;
	precisionScale: number;
	isActive: boolean;
};

const COUNT_PRECISION_SCALE = 0;
const LENGTH_PRECISION_SCALE = 2;
const AREA_PRECISION_SCALE = 2;
const TIME_PRECISION_SCALE = 2;
const WEIGHT_PRECISION_SCALE = 3;
const VOLUME_PRECISION_SCALE = 3;

const CATALOG_SEED: UnitCatalogSeed[] = [
	// COUNT
	{
		id: "ea",
		name: "Each",
		abbreviation: "ea",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "doz",
		name: "Dozen",
		abbreviation: "doz",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "pr",
		name: "Pair",
		abbreviation: "pr",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "pk",
		name: "Pack",
		abbreviation: "pk",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "box",
		name: "Box",
		abbreviation: "box",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "case",
		name: "Case",
		abbreviation: "case",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "set",
		name: "Set",
		abbreviation: "set",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "roll",
		name: "Roll",
		abbreviation: "roll",
		category: UnitCategory.COUNT,
		precisionScale: COUNT_PRECISION_SCALE,
		isActive: true,
	},

	// LENGTH
	{
		id: "cm",
		name: "Centimeter",
		abbreviation: "cm",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "ft",
		name: "Foot",
		abbreviation: "ft",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "in",
		name: "Inch",
		abbreviation: "in",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "km",
		name: "Kilometer",
		abbreviation: "km",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "m",
		name: "Meter",
		abbreviation: "m",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "mi",
		name: "Mile",
		abbreviation: "mi",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "mm",
		name: "Millimeter",
		abbreviation: "mm",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "yd",
		name: "Yard",
		abbreviation: "yd",
		category: UnitCategory.LENGTH,
		precisionScale: LENGTH_PRECISION_SCALE,
		isActive: true,
	},

	// AREA
	{
		id: "ac",
		name: "Acre",
		abbreviation: "ac",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_cm",
		name: "Square Centimeter",
		abbreviation: "sq cm",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_ft",
		name: "Square Foot",
		abbreviation: "sq ft",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_in",
		name: "Square Inch",
		abbreviation: "sq in",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_km",
		name: "Square Kilometer",
		abbreviation: "sq km",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_m",
		name: "Square Meter",
		abbreviation: "sq m",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_mi",
		name: "Square Mile",
		abbreviation: "sq mi",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sq_yd",
		name: "Square Yard",
		abbreviation: "sq yd",
		category: UnitCategory.AREA,
		precisionScale: AREA_PRECISION_SCALE,
		isActive: true,
	},

	// TIME
	{
		id: "day",
		name: "Day",
		abbreviation: "day",
		category: UnitCategory.TIME,
		precisionScale: TIME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "hr",
		name: "Hour",
		abbreviation: "hr",
		category: UnitCategory.TIME,
		precisionScale: TIME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "ms",
		name: "Millisecond",
		abbreviation: "ms",
		category: UnitCategory.TIME,
		precisionScale: TIME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "min",
		name: "Minute",
		abbreviation: "min",
		category: UnitCategory.TIME,
		precisionScale: TIME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sec",
		name: "Second",
		abbreviation: "sec",
		category: UnitCategory.TIME,
		precisionScale: TIME_PRECISION_SCALE,
		isActive: true,
	},

	// WEIGHT
	{
		id: "g",
		name: "Gram",
		abbreviation: "g",
		category: UnitCategory.WEIGHT,
		precisionScale: WEIGHT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "kg",
		name: "Kilogram",
		abbreviation: "kg",
		category: UnitCategory.WEIGHT,
		precisionScale: WEIGHT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "mg",
		name: "Milligram",
		abbreviation: "mg",
		category: UnitCategory.WEIGHT,
		precisionScale: WEIGHT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "oz",
		name: "Ounce",
		abbreviation: "oz",
		category: UnitCategory.WEIGHT,
		precisionScale: WEIGHT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "lb",
		name: "Pound",
		abbreviation: "lb",
		category: UnitCategory.WEIGHT,
		precisionScale: WEIGHT_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "st",
		name: "Stone",
		abbreviation: "st",
		category: UnitCategory.WEIGHT,
		precisionScale: WEIGHT_PRECISION_SCALE,
		isActive: true,
	},

	// VOLUME
	{
		id: "cu_ft",
		name: "Cubic Foot",
		abbreviation: "cu ft",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "cu_in",
		name: "Cubic Inch",
		abbreviation: "cu in",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "cu_yd",
		name: "Cubic Yard",
		abbreviation: "cu yd",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "c",
		name: "Cup",
		abbreviation: "c",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "fl_oz",
		name: "Fluid Ounce",
		abbreviation: "fl oz",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "gal",
		name: "Gallon",
		abbreviation: "gal",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "l",
		name: "Liter",
		abbreviation: "L",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "ml",
		name: "Milliliter",
		abbreviation: "mL",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "pt",
		name: "Pint",
		abbreviation: "pt",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "qt",
		name: "Quart",
		abbreviation: "qt",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "sh",
		name: "Shot",
		abbreviation: "sh",
		category: UnitCategory.VOLUME,
		precisionScale: VOLUME_PRECISION_SCALE,
		isActive: true,
	},
];

export function getCatalogSeedById(id: string): UnitCatalogSeed | null {
	if (!id) return null;
	return CATALOG_SEED.find((entry) => entry.id === id) ?? null;
}

export function allCatalogSeedEntries(): UnitCatalogSeed[] {
	return [...CATALOG_SEED];
}
