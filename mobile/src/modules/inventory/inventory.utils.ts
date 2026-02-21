// path: src/modules/inventory/inventory.utils.ts
import * as Device from "expo-device";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

export function toNumberSafe(value: unknown, fallback = 0): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return fallback;
}

function randomToken(len = 10): string {
	return Array.from({ length: len }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

function sanitizeIdSegment(value: string): string {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9._:-]/g, "");
}

export function makeIdempotencyKey(prefix = "inv"): string {
	const rawDevice = Device.modelId || Device.modelName || "device";
	const safeDevice = sanitizeIdSegment(rawDevice) || "device";
	const safePrefix = sanitizeIdSegment(prefix) || "inv";
	const ts = Date.now().toString(36);
	const rnd = randomToken(12);
	const base = `${safePrefix}_${safeDevice}_${ts}_${rnd}`;
	if (base.length <= FIELD_LIMITS.idempotencyKey) return base;
	const overhead = safePrefix.length + ts.length + rnd.length + 3; // 3 separators
	const maxDeviceLen = Math.max(1, FIELD_LIMITS.idempotencyKey - overhead);
	const trimmedDevice = safeDevice.slice(0, maxDeviceLen);
	return `${safePrefix}_${trimmedDevice}_${ts}_${rnd}`;
}

/**
 * Canonical v1 reason semantics:
 * - STOCK_IN: user enters a positive quantity; app converts to +delta
 * - STOCK_OUT: user enters a positive quantity; app converts to -delta
 * - ADJUSTMENT: signed delta is allowed (+ / -)
 *
 * NOTE: Your API ultimately wants { delta }, not { reason, quantity }.
 */
export type InventoryAdjustReason = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

export function buildDeltaFromReason(reason: InventoryAdjustReason, quantityRaw: number): number {
	if (!Number.isFinite(quantityRaw) || quantityRaw === 0) return 0;

	if (reason === "ADJUSTMENT") return quantityRaw;

	const qty = Math.abs(quantityRaw);
	return reason === "STOCK_IN" ? qty : -qty;
}
