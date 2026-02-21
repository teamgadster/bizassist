// BizAssist_mobile path: src/shared/nav/returnTo.ts

export type SelectedCategoryPayload = {
	selectedCategoryId: string;
	selectedCategoryName: string;
};

export function normalizeReturnTo(v: unknown): string {
	return String(v ?? "").trim();
}

export function buildCategorySelectionParams(payload: SelectedCategoryPayload) {
	return {
		selectedCategoryId: payload.selectedCategoryId,
		selectedCategoryName: payload.selectedCategoryName,
	};
}
