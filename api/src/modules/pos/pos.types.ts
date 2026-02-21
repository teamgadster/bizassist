// BizAssist_api
// path: src/modules/pos/pos.types.ts

export type CheckoutCartItemInput = {
	productId: string;
	productName?: string;
	quantity: string; // UDQI decimal string
	unitPriceMinor?: string; // canonical
	unitPrice?: string; // legacy decimal major units (compatibility)
};

export type CheckoutPaymentInput = {
	method: "CASH" | "EWALLET" | "BANK_TRANSFER" | "OTHER";
	amountMinor?: string; // canonical
	amount?: string; // legacy decimal major units (compatibility)
};

export type CheckoutDiscountInput = {
	discountId: string;
};

export type CheckoutInput = {
	idempotencyKey: string;
	deviceId?: string;
	cart: CheckoutCartItemInput[];
	payments: CheckoutPaymentInput[];
	discounts?: CheckoutDiscountInput[];
};

export type CheckoutResult = {
	sale: {
		id: string;
		status: "COMPLETED";
		createdAt: string;
		idempotencyKey: string;
		deviceId?: string | null;
		subtotalMinor: string;
		totalMinor: string;
		discountTotalMinor: string;
		taxTotalMinor: string;
		subtotal: string; // compatibility decimal major units
		total: string; // compatibility decimal major units
		discountTotal: string; // compatibility decimal major units
		taxTotal: string; // compatibility decimal major units
		lineItems: Array<{
			id: string;
			productId: string;
			productName: string;
			quantity: string;
			unitPriceMinor: string;
			lineTotalMinor: string;
			unitPrice: string; // compatibility decimal major units
			lineTotal: string; // compatibility decimal major units
		}>;
		payments: Array<{
			id: string;
			method: "CASH" | "EWALLET" | "BANK_TRANSFER" | "OTHER";
			amountMinor: string;
			amount: string; // compatibility decimal major units
		}>;
		discounts: Array<{
			id: string;
			discountId: string | null;
			scope: "SALE" | "LINE_ITEM";
			nameSnapshot: string;
			typeSnapshot: "PERCENT" | "FIXED";
			valueSnapshotMinor: string;
			amountAppliedMinor: string;
			valueSnapshot: string; // compatibility payload
			amountApplied: string; // compatibility payload
		}>;
	};
	receipt: {
		saleId: string;
		subtotalMinor: string;
		taxTotalMinor: string;
		discountTotalMinor: string;
		totalMinor: string;
		paidTotalMinor: string;
		changeDueMinor: string;
		subtotal: string; // compatibility decimal major units
		taxTotal: string; // compatibility decimal major units
		discountTotal: string; // compatibility decimal major units
		total: string; // compatibility decimal major units
		paidTotal: string; // compatibility decimal major units
		changeDue: string; // compatibility decimal major units
		itemCount: number;
	};
};

