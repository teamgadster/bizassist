import type { QueryClient } from "@tanstack/react-query";

import { unitKeys } from "@/modules/units/units.queries";
import type { Unit } from "@/modules/units/units.types";

function sortUnits(units: Unit[]): Unit[] {
	return [...units].sort((a, b) => {
		const byCategory = a.category.localeCompare(b.category);
		if (byCategory !== 0) return byCategory;
		return a.name.localeCompare(b.name);
	});
}

function upsertUnit(list: Unit[] | undefined, unit: Unit, includeArchived: boolean): Unit[] {
	const current = Array.isArray(list) ? list : [];
	const withoutTarget = current.filter((item) => item.id !== unit.id);
	const next = !includeArchived && !unit.isActive ? withoutTarget : [...withoutTarget, unit];
	return sortUnits(next);
}

export function syncUnitListCaches(queryClient: QueryClient, unit: Unit): void {
	queryClient.setQueryData<Unit[]>(unitKeys.list({ includeArchived: false }), (prev) =>
		upsertUnit(prev, unit, false),
	);
	queryClient.setQueryData<Unit[]>(unitKeys.list({ includeArchived: true }), (prev) => upsertUnit(prev, unit, true));
}
