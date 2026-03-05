import type { QueryClient } from "@tanstack/react-query";

import type { ModifierGroup } from "./modifiers.types";

function withArchivedState(group: ModifierGroup, isArchived: boolean): ModifierGroup {
	if (group.isArchived === isArchived) return group;
	return { ...group, isArchived };
}

function recalculateOptionCounts(group: ModifierGroup): ModifierGroup {
	const activeOptions = group.options.filter((option) => !option.isArchived);
	const soldOutOptionsCount = activeOptions.filter((option) => option.isSoldOut).length;
	const availableOptionsCount = Math.max(0, activeOptions.length - soldOutOptionsCount);

	if (group.soldOutOptionsCount === soldOutOptionsCount && group.availableOptionsCount === availableOptionsCount) {
		return group;
	}

	return {
		...group,
		soldOutOptionsCount,
		availableOptionsCount,
	};
}

function withOptionArchivedState(group: ModifierGroup, optionId: string, isArchived: boolean): ModifierGroup {
	let didChange = false;
	const nextOptions = group.options.map((option) => {
		if (option.id !== optionId) return option;
		if (option.isArchived === isArchived) return option;
		didChange = true;
		return { ...option, isArchived };
	});

	if (!didChange) return group;
	return recalculateOptionCounts({ ...group, options: nextOptions });
}

export function updateModifierGroupArchiveState(queryClient: QueryClient, groupId: string, isArchived: boolean) {
	if (!groupId) return;

	queryClient.setQueryData<ModifierGroup>(["modifiers", "group", groupId], (current) =>
		current ? withArchivedState(current, isArchived) : current,
	);

	const groupLists = queryClient.getQueriesData<ModifierGroup[]>({
		queryKey: ["modifiers", "groups"],
	});

	for (const [queryKey, groups] of groupLists) {
		if (!Array.isArray(groups)) continue;

		let didChange = false;
		const next = groups.map((group) => {
			if (group.id !== groupId) return group;
			didChange = true;
			return withArchivedState(group, isArchived);
		});

		if (didChange) {
			queryClient.setQueryData<ModifierGroup[]>(queryKey, next);
		}
	}
}

export function updateModifierOptionArchiveState(queryClient: QueryClient, optionId: string, isArchived: boolean) {
	if (!optionId) return;

	const groupDetails = queryClient.getQueriesData<ModifierGroup>({
		queryKey: ["modifiers", "group"],
	});

	for (const [queryKey, group] of groupDetails) {
		if (!group) continue;
		const next = withOptionArchivedState(group, optionId, isArchived);
		if (next !== group) {
			queryClient.setQueryData<ModifierGroup>(queryKey, next);
		}
	}

	const groupLists = queryClient.getQueriesData<ModifierGroup[]>({
		queryKey: ["modifiers", "groups"],
	});

	for (const [queryKey, groups] of groupLists) {
		if (!Array.isArray(groups)) continue;

		let didChange = false;
		const next = groups.map((group) => {
			const nextGroup = withOptionArchivedState(group, optionId, isArchived);
			if (nextGroup !== group) didChange = true;
			return nextGroup;
		});

		if (didChange) {
			queryClient.setQueryData<ModifierGroup[]>(queryKey, next);
		}
	}
}

export function removeModifierGroupFromCache(queryClient: QueryClient, groupId: string) {
	if (!groupId) return;

	queryClient.removeQueries({
		queryKey: ["modifiers", "group", groupId],
		exact: true,
	});

	const groupLists = queryClient.getQueriesData<ModifierGroup[]>({
		queryKey: ["modifiers", "groups"],
	});

	for (const [queryKey, groups] of groupLists) {
		if (!Array.isArray(groups)) continue;
		const next = groups.filter((group) => group.id !== groupId);
		if (next.length !== groups.length) {
			queryClient.setQueryData<ModifierGroup[]>(queryKey, next);
		}
	}
}
