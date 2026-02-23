export type ModifierOption = {
	id: string;
	modifierGroupId: string;
	name: string;
	priceDeltaMinor: string;
	sortOrder: number;
	isSoldOut: boolean;
	isArchived: boolean;
};

export type ModifierSelectionType = "SINGLE" | "MULTI";

export type ModifierGroup = {
	id: string;
	name: string;
	selectionType: "SINGLE" | "MULTI";
	isRequired: boolean;
	minSelected: number;
	maxSelected: number;
	sortOrder: number;
	isArchived: boolean;
	attachedProductCount: number;
	availableOptionsCount: number;
	soldOutOptionsCount: number;
	options: ModifierOption[];
};

export type CreateModifierGroupPayload = {
	name: string;
	selectionType: ModifierSelectionType;
	isRequired: boolean;
	minSelected: number;
	maxSelected: number;
	sortOrder?: number;
};

export type UpdateModifierGroupPayload = Partial<CreateModifierGroupPayload>;

export type CreateModifierOptionPayload = {
	name: string;
	priceDeltaMinor: string;
	sortOrder?: number;
};

export type UpdateModifierOptionPayload = Partial<CreateModifierOptionPayload> & {
	isSoldOut?: boolean;
};

export type ProductModifierAttachmentPayload = {
	modifierGroupIds: string[];
};

export type SyncModifierGroupProductsPayload = {
	modifierGroupId: string;
	selectedProductIds: string[];
};

export type SyncModifierGroupProductsResult = {
	updatedProductCount: number;
	attachedCount: number;
	detachedCount: number;
};
