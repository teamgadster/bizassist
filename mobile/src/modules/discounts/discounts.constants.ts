// path: src/modules/discounts/discounts.constants.ts
import type { DiscountType } from "./discounts.types";

export const DEFAULT_STACKABLE = false;

export function isPercentType(t: DiscountType) {
	return t === "PERCENT";
}

export function formatDiscountSubtitle(type: DiscountType, value: string, currencySymbol = "₱") {
	const num = Number(value);
	if (!Number.isFinite(num)) return "";

	if (type === "FIXED") return `${currencySymbol}${stripTrailingZeros(num)}`;
	if (type === "PERCENT") return `${stripTrailingZeros(num)}%`;
	return "";
}

function stripTrailingZeros(n: number) {
	const s = n.toFixed(2);
	return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
