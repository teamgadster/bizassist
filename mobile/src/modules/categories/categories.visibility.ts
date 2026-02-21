// BizAssist_mobile
// path: src/modules/categories/categories.visibility.ts

import type { Category } from "@/modules/categories/categories.types";

function toHiddenSet(hiddenCategoryIds?: Set<string> | string[]): Set<string> {
	if (!hiddenCategoryIds) return new Set();
	if (hiddenCategoryIds instanceof Set) return hiddenCategoryIds;
	return new Set(hiddenCategoryIds);
}

export function isCategoryHidden(categoryId: string, hiddenCategoryIds?: Set<string> | string[]): boolean {
	return toHiddenSet(hiddenCategoryIds).has(categoryId);
}

export function filterVisiblePickerCategories(args: {
	items: Category[];
	hiddenCategoryIds?: Set<string> | string[];
	includeCategoryId?: string | null;
}): Category[] {
	const hidden = toHiddenSet(args.hiddenCategoryIds);
	const out: Category[] = [];

	for (const item of args.items) {
		const isSelected = args.includeCategoryId && item.id === args.includeCategoryId;

		if (item.isActive === false && !isSelected) continue;

		if (!hidden.has(item.id)) {
			out.push(item);
			continue;
		}

		if (isSelected) {
			out.push(item);
		}
	}

	return out;
}
