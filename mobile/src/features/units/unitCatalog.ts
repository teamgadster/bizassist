// BizAssist_mobile
// path: src/features/units/unitCatalog.ts
//
// Unit catalog is a UI/system catalog used for picker flows.
// Categories here mirror the server categories for catalog grouping.

export type UnitCategory = "COUNT" | "LENGTH" | "AREA" | "VOLUME" | "WEIGHT" | "TIME";

export type UnitItem = {
	id: string;
	name: string;
	symbol: string;
	category: UnitCategory;
	isSystem: true;
};

export const UNIT_CATALOG: UnitItem[] = [
	// COUNT (v1 governance)
	{ id: "ea", name: "Each", symbol: "ea", category: "COUNT", isSystem: true },
	{ id: "doz", name: "Dozen", symbol: "doz", category: "COUNT", isSystem: true },
	{ id: "pr", name: "Pair", symbol: "pr", category: "COUNT", isSystem: true },
	{ id: "pk", name: "Pack", symbol: "pk", category: "COUNT", isSystem: true },
	{ id: "box", name: "Box", symbol: "box", category: "COUNT", isSystem: true },
	{ id: "case", name: "Case", symbol: "case", category: "COUNT", isSystem: true },
	{ id: "set", name: "Set", symbol: "set", category: "COUNT", isSystem: true },
	{ id: "roll", name: "Roll", symbol: "roll", category: "COUNT", isSystem: true },

	// LENGTH
	{ id: "cm", name: "Centimeter", symbol: "cm", category: "LENGTH", isSystem: true },
	{ id: "ft", name: "Foot", symbol: "ft", category: "LENGTH", isSystem: true },
	{ id: "in", name: "Inch", symbol: "in", category: "LENGTH", isSystem: true },
	{ id: "km", name: "Kilometer", symbol: "km", category: "LENGTH", isSystem: true },
	{ id: "m", name: "Meter", symbol: "m", category: "LENGTH", isSystem: true },
	{ id: "mi", name: "Mile", symbol: "mi", category: "LENGTH", isSystem: true },
	{ id: "mm", name: "Millimeter", symbol: "mm", category: "LENGTH", isSystem: true },
	{ id: "yd", name: "Yard", symbol: "yd", category: "LENGTH", isSystem: true },

	// AREA
	{ id: "ac", name: "Acre", symbol: "ac", category: "AREA", isSystem: true },
	{ id: "sq_cm", name: "Square Centimeter", symbol: "sq cm", category: "AREA", isSystem: true },
	{ id: "sq_ft", name: "Square Foot", symbol: "sq ft", category: "AREA", isSystem: true },
	{ id: "sq_in", name: "Square Inch", symbol: "sq in", category: "AREA", isSystem: true },
	{ id: "sq_km", name: "Square Kilometer", symbol: "sq km", category: "AREA", isSystem: true },
	{ id: "sq_m", name: "Square Meter", symbol: "sq m", category: "AREA", isSystem: true },
	{ id: "sq_mi", name: "Square Mile", symbol: "sq mi", category: "AREA", isSystem: true },
	{ id: "sq_yd", name: "Square Yard", symbol: "sq yd", category: "AREA", isSystem: true },

	// TIME
	{ id: "day", name: "Day", symbol: "day", category: "TIME", isSystem: true },
	{ id: "hr", name: "Hour", symbol: "hr", category: "TIME", isSystem: true },
	{ id: "ms", name: "Millisecond", symbol: "ms", category: "TIME", isSystem: true },
	{ id: "min", name: "Minute", symbol: "min", category: "TIME", isSystem: true },
	{ id: "sec", name: "Second", symbol: "sec", category: "TIME", isSystem: true },

	// WEIGHT
	{ id: "g", name: "Gram", symbol: "g", category: "WEIGHT", isSystem: true },
	{ id: "kg", name: "Kilogram", symbol: "kg", category: "WEIGHT", isSystem: true },
	{ id: "mg", name: "Milligram", symbol: "mg", category: "WEIGHT", isSystem: true },
	{ id: "oz", name: "Ounce", symbol: "oz", category: "WEIGHT", isSystem: true },
	{ id: "lb", name: "Pound", symbol: "lb", category: "WEIGHT", isSystem: true },
	{ id: "st", name: "Stone", symbol: "st", category: "WEIGHT", isSystem: true },

	// VOLUME
	{ id: "cu_ft", name: "Cubic Foot", symbol: "cu ft", category: "VOLUME", isSystem: true },
	{ id: "cu_in", name: "Cubic Inch", symbol: "cu in", category: "VOLUME", isSystem: true },
	{ id: "cu_yd", name: "Cubic Yard", symbol: "cu yd", category: "VOLUME", isSystem: true },
	{ id: "c", name: "Cup", symbol: "c", category: "VOLUME", isSystem: true },
	{ id: "fl_oz", name: "Fluid Ounce", symbol: "fl oz", category: "VOLUME", isSystem: true },
	{ id: "gal", name: "Gallon", symbol: "gal", category: "VOLUME", isSystem: true },
	{ id: "l", name: "Liter", symbol: "L", category: "VOLUME", isSystem: true },
	{ id: "ml", name: "Milliliter", symbol: "mL", category: "VOLUME", isSystem: true },
	{ id: "pt", name: "Pint", symbol: "pt", category: "VOLUME", isSystem: true },
	{ id: "qt", name: "Quart", symbol: "qt", category: "VOLUME", isSystem: true },
	{ id: "sh", name: "Shot", symbol: "sh", category: "VOLUME", isSystem: true },
];
