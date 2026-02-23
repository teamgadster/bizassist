// BizAssist_mobile
// path: src/modules/inventory/inventory.selectors.ts

import type { InventoryProduct, InventoryProductDetail } from "@/modules/inventory/inventory.types";
import { unitDisplayToken } from "@/modules/units/units.format";

/**
 * Canonical: shared selectors for Inventory surfaces.
 * Keep all list/detail formatting logic centralized to avoid drift (phone ↔ tablet).
 */

type ProductLike =
	| Pick<
			InventoryProduct,
			| "sku"
			| "barcode"
			| "onHandCached"
			| "onHandDecimal"
			| "reorderPoint"
			| "unitPrecisionScale"
			| "onHandCachedRaw"
			| "reorderPointRaw"
	  >
	| Pick<
			InventoryProductDetail,
			| "sku"
			| "barcode"
			| "onHandCached"
			| "onHandDecimal"
			| "reorderPoint"
			| "unitPrecisionScale"
			| "onHandCachedRaw"
			| "reorderPointRaw"
	  >;

type QuantitySource = "udqi" | "legacy";

function clampPrecisionScale(value: unknown): number {
	const raw = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(raw)) return 0;
	return Math.max(0, Math.min(5, Math.trunc(raw)));
}

function toNumberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const s = value.trim();
		if (!s) return null;
		const n = Number(s);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

/**
 * IMPORTANT:
 * - If *Raw is present, treat it as UDQI decimal-string.
 * - Otherwise, treat numeric fields as legacy scaled-int.
 */
function resolveQuantity(value: unknown, raw?: string): { source: QuantitySource; raw: string | null } {
	if (typeof raw === "string") {
		const s = raw.trim();
		if (s) return { source: "udqi", raw: s };
	}

	if (typeof value === "string") {
		const s = value.trim();
		return s ? { source: "udqi", raw: s } : { source: "legacy", raw: null };
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return { source: "legacy", raw: String(Math.trunc(value)) };
	}

	return { source: "legacy", raw: null };
}

function formatLegacyScaledInt(rawScaledInt: string, scale: number): string {
	const s = rawScaledInt.trim();
	if (!/^-?\d+$/.test(s)) return s;

	const neg = s.startsWith("-");
	const digits = neg ? s.slice(1) : s;
	if (scale <= 0) return (neg ? "-" : "") + (digits || "0");

	const padded = digits.padStart(scale + 1, "0");
	const intPart = padded.slice(0, -scale) || "0";
	const fracPart = padded.slice(-scale);
	return (neg ? "-" : "") + intPart + "." + fracPart;
}

function formatUdqiDecimal(rawDecimal: string, scale: number): string {
	const trimmed = rawDecimal.trim();
	if (!trimmed) return "—";

	// accept "-?\d+(\.\d+)?", "10.", "10.5" while being defensive
	const s = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;

	if (!/^-?\d+(\.\d+)?$/.test(s)) return trimmed;

	if (!s.includes(".")) {
		// UDQI integer is still a real integer quantity; do NOT reinterpret as scaled-int.
		return scale > 0 ? `${s}.${"0".repeat(scale)}` : s;
	}

	const neg = s.startsWith("-");
	const body = neg ? s.slice(1) : s;
	const [intPartRaw, fracRaw = ""] = body.split(".");
	if (scale <= 0) return (neg ? "-" : "") + (intPartRaw || "0");

	const frac = (fracRaw + "0".repeat(scale)).slice(0, scale);
	return (neg ? "-" : "") + (intPartRaw || "0") + "." + frac;
}

function resolveOnHandParts(p: ProductLike): { source: QuantitySource; raw: string | null; display: string | null } {
	const precisionScale = clampPrecisionScale((p as any)?.unitPrecisionScale ?? (p as any)?.unit?.precisionScale);
	const onHandDecimal = typeof (p as any)?.onHandDecimal === "string" ? (p as any).onHandDecimal.trim() : "";
	const q = onHandDecimal
		? { source: "udqi" as const, raw: onHandDecimal }
		: resolveQuantity((p as any)?.onHandCached, (p as any)?.onHandCachedRaw);

	if (!q.raw) return { source: q.source, raw: null, display: null };

	const display =
		q.source === "udqi" ? formatUdqiDecimal(q.raw, precisionScale) : formatLegacyScaledInt(q.raw, precisionScale);
	return { source: q.source, raw: q.raw, display };
}

function resolveReorderPointParts(p: ProductLike): { source: QuantitySource; raw: string | null; n: number | null } {
	const q = resolveQuantity((p as any)?.reorderPoint, (p as any)?.reorderPointRaw);

	// comparisons can stay numeric (best-effort) in both modes
	const n = q.raw != null ? toNumberOrNull(q.source === "legacy" ? q.raw : q.raw) : null;
	return { source: q.source, raw: q.raw, n };
}

export function formatOnHandValue(p: ProductLike): string {
	const { display } = resolveOnHandParts(p);
	if (!display) return "—";
	return display;
}

export function formatOnHand(p: ProductLike): string {
	const { raw, display } = resolveOnHandParts(p);
	if (!display) return "—";
	const unitToken = unitDisplayToken(p as any, "quantity", raw ?? undefined);
	return unitToken ? `${display} ${unitToken}` : display;
}

export function hasReorderPoint(p: Pick<ProductLike, "reorderPoint" | "reorderPointRaw">): boolean {
	const { n } = resolveReorderPointParts(p as any);
	if (n == null || !Number.isFinite(n)) return false;
	return n > 0;
}

export function isOutOfStock(p: Pick<ProductLike, "onHandCached" | "onHandCachedRaw">): boolean {
	const q = resolveQuantity((p as any)?.onHandCached, (p as any)?.onHandCachedRaw);
	const n = q.raw != null ? toNumberOrNull(q.source === "legacy" ? q.raw : q.raw) : null;
	if (n == null || !Number.isFinite(n)) return false;
	return n <= 0;
}

export function isLowStock(p: ProductLike): boolean {
	const onHandQ = resolveQuantity((p as any)?.onHandCached, (p as any)?.onHandCachedRaw);
	const rpQ = resolveQuantity((p as any)?.reorderPoint, (p as any)?.reorderPointRaw);

	const onHand = onHandQ.raw != null ? toNumberOrNull(onHandQ.raw) : null;
	const reorderPoint = rpQ.raw != null ? toNumberOrNull(rpQ.raw) : null;

	if (onHand == null || !Number.isFinite(onHand)) return false;
	if (reorderPoint == null || !Number.isFinite(reorderPoint)) return false;
	if (onHand <= 0) return false;

	// Canonical: low-stock when onHand <= reorderPoint.
	return hasReorderPoint(p) && onHand <= reorderPoint;
}

export function isStockHealthy(p: ProductLike): boolean {
	const onHandQ = resolveQuantity((p as any)?.onHandCached, (p as any)?.onHandCachedRaw);
	const rpQ = resolveQuantity((p as any)?.reorderPoint, (p as any)?.reorderPointRaw);

	const onHand = onHandQ.raw != null ? toNumberOrNull(onHandQ.raw) : null;
	const reorderPoint = rpQ.raw != null ? toNumberOrNull(rpQ.raw) : null;

	if (onHand == null || !Number.isFinite(onHand)) return false;
	if (reorderPoint == null || !Number.isFinite(reorderPoint)) return false;

	return hasReorderPoint(p) && onHand > reorderPoint;
}

/**
 * Canonical labels used in list rows.
 * Keeps list UX consistent across Phone + Tablet.
 */
export function skuLabel(p: Pick<ProductLike, "sku">): string {
	const sku = (p.sku ?? "").trim();
	return sku ? `SKU: ${sku}` : "";
}

export function barcodeLabel(p: Pick<ProductLike, "barcode">): string {
	const barcode = (p.barcode ?? "").trim();
	return barcode ? `Barcode: ${barcode}` : "";
}

/**
 * Legacy label used in list rows: prefer SKU, else Barcode, else empty.
 * Keep for call sites that only want one line.
 */
export function skuOrBarcodeLabel(p: Pick<ProductLike, "sku" | "barcode">): string {
	const sku = skuLabel(p);
	if (sku) return sku;

	const barcode = barcodeLabel(p);
	if (barcode) return barcode;

	return "";
}
