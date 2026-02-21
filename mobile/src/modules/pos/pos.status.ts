// BizAssist_mobile
// path: src/modules/pos/pos.status.ts
//
// POS status + sellability governance (locked).
// Priority:
// 1) Out of stock (trackInventory=true AND onHand<=0)
// 2) Low stock: X left (trackInventory=true AND reorderPoint exists AND onHand<=reorderPoint AND onHand>0)
// 3) X left (trackInventory=true AND onHand>0)
// 4) Service (trackInventory=false)
//
// NOTE: we intentionally avoid float math; compare decimal strings deterministically.

export type ResolvedPosStatus = {
	label: string;
	disabled: boolean; // true => cannot add to cart
	kind: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" | "SERVICE";
};

/**
 * Canonical resolver used by POS screens.
 * Screens currently call: resolvePosStatus(product).disabled + .label
 */
export function resolvePosStatus(product: any): ResolvedPosStatus {
	// Services are always sellable and labeled "Service"
	const trackInventory = !!product?.trackInventory;

	if (!trackInventory) {
		return { kind: "SERVICE", label: "Service", disabled: false };
	}

	const onHand = normalizeDecimalString(
		product?.onHand ?? product?.onHandCached ?? product?.inventoryOnHand ?? product?.stockOnHand ?? "0",
	);

	const reorderPointRaw = product?.reorderPoint ?? product?.reorderPointQty ?? product?.reorderPointCached ?? null;

	const reorderPoint = reorderPointRaw == null ? null : normalizeDecimalString(reorderPointRaw);

	const unitToken =
		String(product?.unitAbbreviation ?? product?.unit?.abbreviation ?? "").trim() ||
		String(product?.unitName ?? product?.unit?.name ?? "").trim() ||
		"";

	// Out of stock
	if (lte(onHand, "0")) {
		return { kind: "OUT_OF_STOCK", label: "Out of stock", disabled: true };
	}

	const leftLabel = unitToken ? `${onHand} ${unitToken} left` : `${onHand} left`;

	// Low stock
	if (reorderPoint !== null && lte(onHand, reorderPoint)) {
		return { kind: "LOW_STOCK", label: `Low stock: ${leftLabel}`, disabled: false };
	}

	// In stock
	return { kind: "IN_STOCK", label: leftLabel, disabled: false };
}

/**
 * Optional alias exports (safe for future refactors).
 * If any screen imports computePosStatus/buildPosStatusLine, they still work.
 */
export const computePosStatus = (args: {
	trackInventory: boolean;
	onHand?: string | number | null;
	reorderPoint?: string | number | null;
	unitToken?: string | null;
}): ResolvedPosStatus => {
	return resolvePosStatus({
		trackInventory: args.trackInventory,
		onHand: args.onHand ?? "0",
		reorderPoint: args.reorderPoint ?? null,
		unitAbbreviation: args.unitToken ?? "",
	});
};

export const buildPosStatusLine = (args: {
	trackInventory: boolean;
	onHand?: string | number | null;
	reorderPoint?: string | number | null;
	unitToken?: string | null;
}): string => computePosStatus(args).label;

export const isPosSellable = (args: { trackInventory: boolean; onHand?: string | number | null }): boolean => {
	if (!args.trackInventory) return true;
	return gt(normalizeDecimalString(args.onHand ?? "0"), "0");
};

/* ------------------------------ internals ------------------------------ */

function normalizeDecimalString(v: string | number | null | undefined): string {
	if (v === null || v === undefined) return "0";
	if (typeof v === "number") return String(v);
	const s = String(v).trim();
	if (!s) return "0";
	if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return "0";
	return s.startsWith("+") ? s.slice(1) : s;
}

function cmp(a: string, b: string): -1 | 0 | 1 {
	const A = splitSigned(a);
	const B = splitSigned(b);

	if (A.sign !== B.sign) return A.sign < B.sign ? -1 : 1;

	const mag = cmpAbs(A.abs, B.abs);
	if (mag === 0) return 0;

	return A.sign < 0 ? (mag === -1 ? 1 : -1) : mag;
}

function lte(a: string, b: string): boolean {
	return cmp(a, b) <= 0;
}
function gt(a: string, b: string): boolean {
	return cmp(a, b) > 0;
}

function splitSigned(s: string): { sign: 1 | -1; abs: string } {
	const t = s.trim();
	if (t.startsWith("-")) return { sign: -1, abs: t.slice(1) || "0" };
	if (t.startsWith("+")) return { sign: 1, abs: t.slice(1) || "0" };
	return { sign: 1, abs: t || "0" };
}

function cmpAbs(a: string, b: string): -1 | 0 | 1 {
	const A = splitDec(a);
	const B = splitDec(b);

	const ai = trimLeadingZeros(A.i);
	const bi = trimLeadingZeros(B.i);

	if (ai.length !== bi.length) return ai.length < bi.length ? -1 : 1;
	if (ai !== bi) return ai < bi ? -1 : 1;

	const maxF = Math.max(A.f.length, B.f.length);
	const af = A.f.padEnd(maxF, "0");
	const bf = B.f.padEnd(maxF, "0");

	if (af === bf) return 0;
	return af < bf ? -1 : 1;
}

function splitDec(s: string): { i: string; f: string } {
	const [i, f] = s.split(".");
	return { i: i ?? "0", f: f ?? "" };
}

function trimLeadingZeros(s: string): string {
	const t = s.replace(/^0+/, "");
	return t.length ? t : "0";
}
