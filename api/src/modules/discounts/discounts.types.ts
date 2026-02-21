// BizAssist_api
// path: src/modules/discounts/discounts.types.ts

import type { DiscountType } from "@prisma/client";

export type DiscountDTO = {
	id: string;
	businessId: string;
	name: string;
	note: string | null;
	type: DiscountType;
	value: string; // compatibility payload: FIXED=major-decimal string, PERCENT=percent string
	valueMinor: string | null; // canonical: FIXED=minor-units digits, PERCENT=basis points digits
	isStackable: boolean;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ListDiscountsQuery = {
	q?: string;
	type?: DiscountType;
	isActive?: boolean;
	includeArchived?: boolean;
	limit?: number;
};

export type CreateDiscountInput = {
	name: string;
	note?: string;
	type: DiscountType;
	value?: string; // compatibility: FIXED=major-decimal or PERCENT string
	valueMinor?: string; // canonical FIXED value
	isStackable?: boolean;
	isActive?: boolean;
};

export type UpdateDiscountInput = {
	name?: string;
	note?: string;
	type?: DiscountType;
	value?: string;
	valueMinor?: string;
	isStackable?: boolean;
};

