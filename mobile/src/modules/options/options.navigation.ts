// BizAssist_mobile
// path: src/modules/options/options.navigation.ts

export const SETTINGS_OPTIONS_LEDGER_ROUTE = "/(app)/(tabs)/settings/modifiers" as const;
export const SETTINGS_OPTIONS_CREATE_ROUTE = "/(app)/(tabs)/settings/modifiers/create" as const;

export const INVENTORY_OPTIONS_LEDGER_ROUTE = "/(app)/(tabs)/inventory/modifiers" as const;
export const INVENTORY_OPTIONS_CREATE_ROUTE = "/(app)/(tabs)/inventory/modifiers/create" as const;

export const INVENTORY_PRODUCT_CREATE_ROUTE = "/(app)/(tabs)/inventory/products/create" as const;
export const INVENTORY_PRODUCT_OPTIONS_SELECT_ROUTE = "/(app)/(tabs)/inventory/products/modifiers/select" as const;
export const INVENTORY_PRODUCT_OPTIONS_VALUES_ROUTE = "/(app)/(tabs)/inventory/products/modifiers/values" as const;

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
	return appendReturnToQuery(`/(app)/(tabs)/settings/modifiers/${encodeURIComponent(id)}`, returnTo);
}

export function buildSettingsOptionEditRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/modifiers/${encodeURIComponent(id)}/edit`, returnTo);
}

export function buildSettingsOptionArchiveRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/modifiers/${encodeURIComponent(id)}/archive`, returnTo);
}

export function buildSettingsOptionRestoreRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return SETTINGS_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/settings/modifiers/${encodeURIComponent(id)}/restore`, returnTo);
}

export function buildInventoryOptionDetailsRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/modifiers/${encodeURIComponent(id)}`, returnTo);
}

export function buildInventoryOptionEditRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/modifiers/${encodeURIComponent(id)}/edit`, returnTo);
}

export function buildInventoryOptionArchiveRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/modifiers/${encodeURIComponent(id)}/archive`, returnTo);
}

export function buildInventoryOptionRestoreRoute(optionSetId: string, returnTo: string | null = null): string {
	const id = String(optionSetId ?? "").trim();
	if (!id) return INVENTORY_OPTIONS_LEDGER_ROUTE;
	return appendReturnToQuery(`/(app)/(tabs)/inventory/modifiers/${encodeURIComponent(id)}/restore`, returnTo);
}

export function resolveSettingsOptionFlowExitRoute(returnTo: string | null): string {
	return returnTo ?? SETTINGS_OPTIONS_LEDGER_ROUTE;
}

export function resolveInventoryOptionFlowExitRoute(returnTo: string | null): string {
	return returnTo ?? INVENTORY_OPTIONS_LEDGER_ROUTE;
}
