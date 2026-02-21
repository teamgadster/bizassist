// path: src/modules/discounts/discounts.types.ts
export type DiscountType = "PERCENT" | "FIXED";

export type Discount = {
	id: string;
	name: string;
	note?: string | null;
	type: DiscountType;
	/**
	 * Decimal string (API contract).
	 */
	value: string;
	isStackable: boolean;
	isActive: boolean;
	archivedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

export type DiscountListResponse = {
	items: Discount[];
};

export type CreateDiscountPayload = {
	name: string;
	note?: string;
	type: DiscountType;
	value: string;
	isStackable: boolean;
};

export type UpdateDiscountPayload = Partial<CreateDiscountPayload>;

export type DiscountVisibilityAction = "HIDE" | "RESTORE";

export type DiscountVisibilityState = {
	hiddenDiscountIds: string[];
};

/**
 * POS application selection envelope for passing selection across screens.
 * Cart should snapshot values at checkout time for audit integrity.
 */
export type DiscountApplyTarget = "SALE" | "LINE_ITEM";

export type DiscountSelection = {
	target: DiscountApplyTarget;
	lineItemId?: string;
	discountId: string;
	nameSnapshot: string;
	typeSnapshot: DiscountType;
	/**
	 * For fixed: the fixed value
	 * For variable: cashier-entered value
	 */
	valueSnapshot: number;
	/**
	 * Target subtotal used to cap discounts safely.
	 * Must be supplied by the caller (POS cart).
	 */
	targetSubtotal: number;
};
