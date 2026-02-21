// BizAssist_api
// path: src/modules/units/serviceUnitCatalog.seed.ts
//
// Service-oriented catalog seed entries.
// Keep this list in sync with mobile/src/features/units/serviceUnitCatalog.ts.

import { UnitCategory } from "@prisma/client";

export type ServiceUnitCatalogSeed = {
	id: string;
	category: UnitCategory;
	name: string;
	abbreviation: string;
	precisionScale: number;
	isActive: boolean;
};

const TIME_PRECISION_SCALE = 2;
const WHOLE_PRECISION_SCALE = 0;

const SERVICE_CATALOG_SEED: ServiceUnitCatalogSeed[] = [
	// TIME-BASED
	{
		id: "min",
		name: "Minute",
		abbreviation: "min",
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
		id: "day",
		name: "Day",
		abbreviation: "day",
		category: UnitCategory.TIME,
		precisionScale: TIME_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "shift",
		name: "Shift",
		abbreviation: "shift",
		category: UnitCategory.TIME,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "session",
		name: "Session",
		abbreviation: "sess",
		category: UnitCategory.TIME,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},

	// ENGAGEMENT / OUTCOME
	{
		id: "svc",
		name: "Service",
		abbreviation: "svc",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "job",
		name: "Job",
		abbreviation: "job",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "visit",
		name: "Visit",
		abbreviation: "visit",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "booking",
		name: "Booking",
		abbreviation: "booking",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "project",
		name: "Project",
		abbreviation: "project",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "pkg",
		name: "Package",
		abbreviation: "pkg",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "trip",
		name: "Trip",
		abbreviation: "trip",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},

	// TARGET-BASED
	{
		id: "class",
		name: "Class",
		abbreviation: "class",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "room",
		name: "Room",
		abbreviation: "room",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "vehicle",
		name: "Vehicle",
		abbreviation: "veh",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "page",
		name: "Page",
		abbreviation: "page",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "seat",
		name: "Seat",
		abbreviation: "seat",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "head",
		name: "Head",
		abbreviation: "head",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "ticket",
		name: "Ticket",
		abbreviation: "ticket",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
	{
		id: "item",
		name: "Item",
		abbreviation: "item",
		category: UnitCategory.COUNT,
		precisionScale: WHOLE_PRECISION_SCALE,
		isActive: true,
	},
];

export function getServiceCatalogSeedById(id: string): ServiceUnitCatalogSeed | null {
	if (!id) return null;
	return SERVICE_CATALOG_SEED.find((entry) => entry.id === id) ?? null;
}

export function allServiceCatalogSeedEntries(): ServiceUnitCatalogSeed[] {
	return [...SERVICE_CATALOG_SEED];
}
