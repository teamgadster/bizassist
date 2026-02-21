// BizAssist_mobile
// path: src/modules/options/options.flow.ts

import type { OptionSelectionDraft, OptionSet, ProductVariationDraft } from "@/modules/options/options.types";

function makeVariationId(): string {
	const rand = Math.random().toString(36).slice(2, 9);
	return `var_${Date.now().toString(36)}_${rand}`;
}

export function buildVariationKey(valueMap: Record<string, string>): string {
	const keys = Object.keys(valueMap).sort();
	return keys.map((k) => `${k}:${valueMap[k]}`).join("|");
}

export function getOptionValueName(optionSet: OptionSet | undefined, valueId: string): string {
	if (!optionSet) return "";
	const value = optionSet.values.find((item) => item.id === valueId);
	return value?.name ?? "";
}

export function getSelectionSummary(selection: OptionSelectionDraft, optionSet: OptionSet | undefined): string {
	if (!optionSet) return "";
	const names = selection.selectedValueIds
		.map((valueId) => getOptionValueName(optionSet, valueId))
		.filter(Boolean);
	return names.join(", ");
}

function cartesianProduct<T>(input: T[][]): T[][] {
	if (input.length === 0) return [];
	return input.reduce<T[][]>(
		(acc, group) => {
			const next: T[][] = [];
			for (const partial of acc) {
				for (const item of group) {
					next.push([...partial, item]);
				}
			}
			return next;
		},
		[[]],
	);
}

export function buildCartesianVariations(
	selections: OptionSelectionDraft[],
	optionSetsById: Map<string, OptionSet>,
): ProductVariationDraft[] {
	const normalized = selections
		.map((selection) => {
			const optionSet = optionSetsById.get(selection.optionSetId);
			if (!optionSet) return null;
			const valueIds = selection.selectedValueIds.filter((valueId) =>
				optionSet.values.some((value) => value.id === valueId && value.isActive !== false),
			);
			if (valueIds.length === 0) return null;
			return {
				selection,
				valueIds,
			};
		})
		.filter((item): item is { selection: OptionSelectionDraft; valueIds: string[] } => !!item);

	if (normalized.length === 0) return [];

	const groups = normalized.map((entry) => entry.valueIds);
	const combinations = cartesianProduct(groups);

	return combinations.map((combo) => {
		const valueMap: Record<string, string> = {};
		const labelParts: string[] = [];

		combo.forEach((valueId, index) => {
			const selection = normalized[index]?.selection;
			if (!selection) return;
			valueMap[selection.optionSetId] = valueId;
			const optionSet = optionSetsById.get(selection.optionSetId);
			const valueName = getOptionValueName(optionSet, valueId);
			if (valueName) labelParts.push(valueName);
		});

		return {
			id: makeVariationId(),
			label: labelParts.join(" / "),
			valueMap,
			stockStatus: "VARIABLE",
			stockReason: null,
			stockReceived: "",
		} satisfies ProductVariationDraft;
	});
}

export function dedupeVariations(variations: ProductVariationDraft[]): ProductVariationDraft[] {
	const map = new Map<string, ProductVariationDraft>();
	for (const variation of variations) {
		const key = buildVariationKey(variation.valueMap);
		if (!key) continue;
		if (!map.has(key)) {
			map.set(key, variation);
		}
	}
	return [...map.values()];
}
