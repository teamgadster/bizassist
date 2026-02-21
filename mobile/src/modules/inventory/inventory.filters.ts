// BizAssist_mobile path: src/modules/inventory/inventory.filters.ts
import type { InventoryProduct } from "@/modules/inventory/inventory.types";
import { hasReorderPoint, isLowStock, isOutOfStock, isStockHealthy } from "@/modules/inventory/inventory.selectors";

export const inventoryHealthFilters = ["low", "out", "reorder", "healthy"] as const;
export type InventoryHealthFilter = (typeof inventoryHealthFilters)[number];

export function normalizeInventoryHealthFilter(value: unknown): InventoryHealthFilter | null {
	if (Array.isArray(value)) {
		const first = value[0];
		value = typeof first === "string" ? first : "";
	}
	if (typeof value !== "string") return null;
	const trimmed = value.trim().toLowerCase();
	if (trimmed === "low") return "low";
	if (trimmed === "out") return "out";
	if (trimmed === "reorder") return "reorder";
	if (trimmed === "healthy") return "healthy";
	return null;
}

export function inventoryHealthFilterLabel(filter: InventoryHealthFilter): string {
	switch (filter) {
		case "low":
			return "Low stock";
		case "out":
			return "Out of stock";
		case "reorder":
			return "Missing reorder points";
		case "healthy":
			return "In";
		default:
			return "Inventory";
	}
}

export function filterInventoryItems(items: InventoryProduct[], filter: InventoryHealthFilter | null): InventoryProduct[] {
	if (!filter) return items;

	switch (filter) {
		case "low":
			return items.filter((item) => item.trackInventory && isLowStock(item));
		case "out":
			return items.filter((item) => item.trackInventory && isOutOfStock(item));
		case "reorder":
			return items.filter((item) => item.trackInventory && !hasReorderPoint(item));
		case "healthy":
			return items.filter((item) => item.trackInventory && isStockHealthy(item));
		default:
			return items;
	}
}

export type InventoryHealthCounts = {
	low: number;
	out: number;
	missingReorder: number;
	thresholds: number;
	healthy: number;
};

export function getInventoryHealthCounts(items: InventoryProduct[]): InventoryHealthCounts {
	let low = 0;
	let out = 0;
	let missingReorder = 0;
	let thresholds = 0;
	let healthy = 0;

	for (const item of items) {
		if (!item.trackInventory) continue;

		const hasThreshold = hasReorderPoint(item);
		if (hasThreshold) thresholds += 1;
		else missingReorder += 1;

		if (isOutOfStock(item)) {
			out += 1;
			continue;
		}

		if (isLowStock(item)) {
			low += 1;
			continue;
		}

		if (hasThreshold && isStockHealthy(item)) {
			healthy += 1;
		}
	}

	return { low, out, missingReorder, thresholds, healthy };
}

export function inventoryHealthFilterEmptyLabel(filter: InventoryHealthFilter): string {
	switch (filter) {
		case "low":
			return "No low stock items";
		case "out":
			return "No out of stock items";
		case "reorder":
			return "All items have reorder points";
		case "healthy":
			return "No stock-on-hand items";
		default:
			return "No items yet";
	}
}
