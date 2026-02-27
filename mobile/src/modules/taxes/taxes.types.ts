export type TaxApplicationMode = "ALL_TAXABLE" | "SELECT_ITEMS";

export type ItemPricingMode = "ADD_TO_ITEM_PRICE" | "INCLUDE_IN_ITEM_PRICE";

export type SalesTax = {
	id: string;
	name: string;
	percentage: number;
	enabled: boolean;
	applicationMode: TaxApplicationMode;
	customAmounts: boolean;
	itemPricingMode: ItemPricingMode;
	itemIds: string[];
	serviceIds: string[];
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
};

export type SalesTaxDraft = {
	name: string;
	percentageText: string;
	enabled: boolean;
	applicationMode: TaxApplicationMode;
	customAmounts: boolean;
	itemPricingMode: ItemPricingMode;
	itemIds: string[];
	serviceIds: string[];
};

export const DEFAULT_SALES_TAX_DRAFT: SalesTaxDraft = {
	name: "Sales Tax",
	percentageText: "",
	enabled: true,
	applicationMode: "ALL_TAXABLE",
	customAmounts: true,
	itemPricingMode: "INCLUDE_IN_ITEM_PRICE",
	itemIds: [],
	serviceIds: [],
};
