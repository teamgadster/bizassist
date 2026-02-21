// BizAssist_mobile
// path: src/modules/units/units.queries.ts

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unitsApi } from "@/modules/units/units.api";
import type { UnitVisibilityAction, UnitVisibilityState } from "@/modules/units/units.types";

export const unitKeys = {
	root: ["units"] as const,
	all: ["units"] as const,

	list: (opts?: { includeArchived?: boolean }) =>
		["units", "list", { includeArchived: opts?.includeArchived ?? false }] as const,

	visibility: () => ["units", "visibility"] as const,
};

// Alias for backwards compatibility
export const unitsKeys = unitKeys;

export function useUnitVisibilityQuery() {
	const query = useQuery<UnitVisibilityState>({
		queryKey: unitKeys.visibility(),
		queryFn: () => unitsApi.getVisibility(),
		staleTime: 120_000,
	});

	const hiddenUnitIds = useMemo(() => new Set(query.data?.hiddenUnitIds ?? []), [query.data?.hiddenUnitIds]);

	return {
		...query,
		hiddenUnitIds,
	};
}

export function useUnitVisibilityMutation() {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (input: { action: UnitVisibilityAction; unitId: string }) =>
			unitsApi.patchVisibility(input.action, input.unitId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: unitKeys.visibility() });
			qc.invalidateQueries({ queryKey: unitKeys.list({ includeArchived: false }) });
			qc.invalidateQueries({ queryKey: unitKeys.list({ includeArchived: true }) });
		},
	});
}
