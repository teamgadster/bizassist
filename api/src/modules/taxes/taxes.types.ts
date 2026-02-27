import type { TaxApplicationMode, TaxItemPricingMode } from "@prisma/client";

export type SalesTaxDTO = {
	id: string;
	businessId: string;
	name: string;
	percentage: string;
	isEnabled: boolean;
	applicationMode: TaxApplicationMode;
	customAmounts: boolean;
	itemPricingMode: TaxItemPricingMode;
	itemIds: string[];
	serviceIds: string[];
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ListSalesTaxesQuery = {
	q?: string;
	isEnabled?: boolean;
	includeArchived?: boolean;
	limit?: number;
};

export type CreateSalesTaxInput = {
	name: string;
	percentage: string;
	isEnabled?: boolean;
	applicationMode: TaxApplicationMode;
	customAmounts?: boolean;
	itemPricingMode: TaxItemPricingMode;
	itemIds?: string[];
	serviceIds?: string[];
};

export type UpdateSalesTaxInput = {
	name?: string;
	percentage?: string;
	isEnabled?: boolean;
	applicationMode?: TaxApplicationMode;
	customAmounts?: boolean;
	itemPricingMode?: TaxItemPricingMode;
	itemIds?: string[];
	serviceIds?: string[];
};
