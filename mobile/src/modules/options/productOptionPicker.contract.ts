export const PRODUCT_SELECT_OPTIONS_ROUTE = "/(app)/(tabs)/inventory/products/options/select" as const;
export const PRODUCT_CREATE_OPTION_ROUTE = "/(app)/(tabs)/inventory/products/options/create-option" as const;
export const PRODUCT_OPTION_VALUES_ROUTE = "/(app)/(tabs)/inventory/products/options/values" as const;
export const PRODUCT_CREATE_VARIATIONS_ROUTE = "/(app)/(tabs)/inventory/products/options/variations" as const;

export const RETURN_TO_KEY = "returnTo" as const;
export const ROOT_RETURN_TO_KEY = "rootReturnTo" as const;
export const DRAFT_ID_KEY = "draftId" as const;
export const OPTION_SET_ID_KEY = "optionSetId" as const;
export const PRODUCT_ID_KEY = "productId" as const;

export function normalizeReturnTo(raw: unknown): string | null {
	const value = String(raw ?? "").trim();
	if (!value) return null;
	if (!value.startsWith("/")) return null;
	if (value === "undefined" || value === "null") return null;
	return value;
}
