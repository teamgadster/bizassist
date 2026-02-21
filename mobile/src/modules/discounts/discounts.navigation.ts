// BizAssist_mobile
// path: src/modules/discounts/discounts.navigation.ts
//
// Navigation governance helpers for Discounts flows:
// - PROCESS screens: exit deterministically (returnTo override).
// - DETAIL screens: back uses history with deterministic fallback.

const INVENTORY_ROOT_ROUTE = "/(app)/(tabs)/inventory" as const;
export const INVENTORY_DISCOUNTS_LEDGER_ROUTE = "/(app)/(tabs)/inventory/discounts/discount.ledger" as const;
export const INVENTORY_DISCOUNTS_CREATE_ROUTE = "/(app)/(tabs)/inventory/discounts/create" as const;
export const SETTINGS_DISCOUNTS_LEDGER_ROUTE = "/(app)/(tabs)/settings/discounts" as const;
export const SETTINGS_DISCOUNTS_CREATE_ROUTE = "/(app)/(tabs)/settings/discounts/create" as const;

export function appendReturnToQuery(route: string, returnTo: string | null): string {
	if (!returnTo) return route;
	const encoded = encodeURIComponent(returnTo);
	const separator = route.includes("?") ? "&" : "?";
	return `${route}${separator}returnTo=${encoded}`;
}

export function normalizeReturnTo(raw: unknown): string | null {
	const value = String(raw ?? "").trim();
	if (!value) return null;
	if (!value.startsWith("/")) return null;
	if (value === "undefined" || value === "null") return null;
	return value;
}

export function normalizeDiscountReturnTo(raw: unknown): string | null {
	return normalizeReturnTo(raw);
}

export function buildSettingsDiscountLedgerRoute(returnTo: string | null = null): string {
	return appendReturnToQuery(SETTINGS_DISCOUNTS_LEDGER_ROUTE, returnTo);
}

export function buildSettingsDiscountCreateRoute(returnTo: string | null = null): string {
	return appendReturnToQuery(SETTINGS_DISCOUNTS_CREATE_ROUTE, returnTo);
}

export function buildSettingsDiscountDetailsRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildSettingsDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/settings/discounts/${encodeURIComponent(id)}`;
	return appendReturnToQuery(base, returnTo);
}

export function buildSettingsDiscountEditRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildSettingsDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/settings/discounts/${encodeURIComponent(id)}/edit`;
	return appendReturnToQuery(base, returnTo);
}

export function buildSettingsDiscountArchiveRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildSettingsDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/settings/discounts/${encodeURIComponent(id)}/archive`;
	return appendReturnToQuery(base, returnTo);
}

export function buildSettingsDiscountRestoreRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildSettingsDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/settings/discounts/${encodeURIComponent(id)}/restore`;
	return appendReturnToQuery(base, returnTo);
}

export function resolveSettingsDiscountFlowExitRoute(returnTo: string | null): string {
	return returnTo ?? SETTINGS_DISCOUNTS_LEDGER_ROUTE;
}

export function resolveSettingsDiscountDetailBackFallbackRoute(returnTo: string | null): string {
	return buildSettingsDiscountLedgerRoute(returnTo);
}

export function buildInventoryDiscountLedgerRoute(returnTo: string | null = null): string {
	return appendReturnToQuery(INVENTORY_DISCOUNTS_LEDGER_ROUTE, returnTo);
}

export function buildInventoryDiscountCreateRoute(returnTo: string | null = null): string {
	return appendReturnToQuery(INVENTORY_DISCOUNTS_CREATE_ROUTE, returnTo);
}

export function buildInventoryDiscountDetailsRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildInventoryDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/inventory/discounts/${encodeURIComponent(id)}`;
	return appendReturnToQuery(base, returnTo);
}

export function buildInventoryDiscountEditRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildInventoryDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/inventory/discounts/${encodeURIComponent(id)}/edit`;
	return appendReturnToQuery(base, returnTo);
}

export function buildInventoryDiscountArchiveRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildInventoryDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/inventory/discounts/${encodeURIComponent(id)}/archive`;
	return appendReturnToQuery(base, returnTo);
}

export function buildInventoryDiscountRestoreRoute(discountId: string, returnTo: string | null = null): string {
	const id = String(discountId ?? "").trim();
	if (!id) return buildInventoryDiscountLedgerRoute(returnTo);
	const base = `/(app)/(tabs)/inventory/discounts/${encodeURIComponent(id)}/restore`;
	return appendReturnToQuery(base, returnTo);
}

export function resolveInventoryDiscountFlowExitRoute(returnTo: string | null): string {
	return returnTo ?? INVENTORY_ROOT_ROUTE;
}

export function resolveInventoryDiscountCreateExitRoute(returnTo: string | null): string {
	return returnTo ?? INVENTORY_DISCOUNTS_LEDGER_ROUTE;
}

export function resolveInventoryDiscountEditExitRoute(returnTo: string | null, discountId: string): string {
	return returnTo ?? buildInventoryDiscountDetailsRoute(discountId);
}

export function resolveInventoryDiscountDetailBackFallbackRoute(returnTo: string | null): string {
	return buildInventoryDiscountLedgerRoute(returnTo);
}
