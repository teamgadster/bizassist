// BizAssist_mobile
// path: src/modules/options/options.navigation.ts

export const SETTINGS_OPTIONS_LEDGER_ROUTE = "/(app)/(tabs)/settings/options" as const;
export const SETTINGS_OPTIONS_CREATE_ROUTE = "/(app)/(tabs)/settings/options/create" as const;

export const INVENTORY_OPTIONS_LEDGER_ROUTE = "/(app)/(tabs)/inventory/options" as const;
export const INVENTORY_OPTIONS_CREATE_ROUTE = "/(app)/(tabs)/inventory/options/create" as const;

export const INVENTORY_PRODUCT_CREATE_ROUTE = "/(app)/(tabs)/inventory/products/create" as const;
export const INVENTORY_PRODUCT_OPTIONS_SELECT_ROUTE = "/(app)/(tabs)/inventory/products/options/select" as const;
export const INVENTORY_PRODUCT_OPTIONS_VALUES_ROUTE = "/(app)/(tabs)/inventory/products/options/values" as const;
export const INVENTORY_PRODUCT_OPTIONS_CREATE_VARIATIONS_ROUTE =
	"/(app)/(tabs)/inventory/products/options/create-variations" as const;
export const INVENTORY_PRODUCT_OPTIONS_ADD_VARIATION_ROUTE =
	"/(app)/(tabs)/inventory/products/options/add-variation" as const;
export const INVENTORY_PRODUCT_OPTIONS_STOCK_RECEIVED_ROUTE =
	"/(app)/(tabs)/inventory/products/options/stock-received" as const;

export function appendReturnToQuery(route: string, returnTo: string | null): string {
	if (!returnTo) return route;
	const encoded = encodeURIComponent(returnTo);
	const separator = route.includes("?") ? "&" : "?";
	return `${route}${separator}returnTo=${encoded}`;
}

export function normalizeReturnTo(raw: unknown): string | null {
	const value = String(raw ?? "").trim();
	if (!value || !value.startsWith("/")) return null;
	if (value === "undefined" || value === "null") return null;
	return value;
}

export function buildSettingsOptionDetailsRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/options/${encodeURIComponent(id)}`, returnTo);
}

export function buildSettingsOptionEditRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/options/${encodeURIComponent(id)}/edit`, returnTo);
}

export function buildSettingsOptionArchiveRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/options/${encodeURIComponent(id)}/archive`, returnTo);
}

export function buildSettingsOptionRestoreRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/options/${encodeURIComponent(id)}/restore`, returnTo);
}

export function buildInventoryOptionDetailsRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/options/${encodeURIComponent(id)}`, returnTo);
}

export function buildInventoryOptionEditRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/options/${encodeURIComponent(id)}/edit`, returnTo);
}

export function buildInventoryOptionArchiveRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/options/${encodeURIComponent(id)}/archive`, returnTo);
}

export function buildInventoryOptionRestoreRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/options/${encodeURIComponent(id)}/restore`, returnTo);
}

export function resolveSettingsOptionFlowExitRoute(returnTo: string | null): string {
	return returnTo ?? SETTINGS_OPTIONS_LEDGER_ROUTE;
}

export function resolveInventoryOptionFlowExitRoute(returnTo: string | null): string {
	return returnTo ?? INVENTORY_OPTIONS_LEDGER_ROUTE;
}
