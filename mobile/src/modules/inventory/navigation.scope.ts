// BizAssist_mobile
// path: src/modules/inventory/navigation.scope.ts
//
// Inventory route scope mapper:
// - inventory: routes live under /(app)/(tabs)/inventory
// - settings-items-services: mirrored routes live under /(app)/(tabs)/settings/items-services

export type InventoryRouteScope = "inventory" | "settings-items-services";

export const INVENTORY_ROOT_ROUTE = "/(app)/(tabs)/inventory" as const;
export const SETTINGS_ITEMS_SERVICES_ROOT_ROUTE = "/(app)/(tabs)/settings/items-services" as const;

export function inventoryScopeRoot(scope: InventoryRouteScope = "inventory"): string {
	return scope === "settings-items-services" ? SETTINGS_ITEMS_SERVICES_ROOT_ROUTE : INVENTORY_ROOT_ROUTE;
}

export function resolveInventoryRouteScope(route: string | null | undefined): InventoryRouteScope {
	const normalized = String(route ?? "").trim();
	if (normalized.startsWith(SETTINGS_ITEMS_SERVICES_ROOT_ROUTE)) return "settings-items-services";
	return "inventory";
}

export function mapInventoryRouteToScope(route: string, scope: InventoryRouteScope = "inventory"): string {
	if (scope === "inventory") return route;
	if (!route.startsWith(INVENTORY_ROOT_ROUTE)) return route;
	return `${SETTINGS_ITEMS_SERVICES_ROOT_ROUTE}${route.slice(INVENTORY_ROOT_ROUTE.length)}`;
}
