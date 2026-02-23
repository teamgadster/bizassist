import { ModifierSelectionType } from "@prisma/client";

export type ModifierOptionDto = {
	id: string;
	modifierGroupId: string;
	name: string;
	priceDeltaMinor: string;
	sortOrder: number;
	isSoldOut: boolean;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ModifierGroupDto = {
	id: string;
	name: string;
	selectionType: ModifierSelectionType;
	isRequired: boolean;
	minSelected: number;
	maxSelected: number;
	sortOrder: number;
	isArchived: boolean;
	attachedProductCount: number;
	availableOptionsCount: number;
	soldOutOptionsCount: number;
	createdAt: string;
	updatedAt: string;
	options: ModifierOptionDto[];
};

export type CreateModifierGroupInput = {
	name: string;
	selectionType: ModifierSelectionType;
	isRequired: boolean;
	minSelected: number;
	maxSelected: number;
	sortOrder?: number;
};

export type UpdateModifierGroupInput = Partial<CreateModifierGroupInput>;

export type CreateModifierOptionInput = {
	name: string;
	priceDeltaMinor: string;
	sortOrder?: number;
};

export type UpdateModifierOptionInput = Partial<CreateModifierOptionInput> & {
	isSoldOut?: boolean;
};

export type ReplaceProductModifierGroupsInput = {
	modifierGroupIds: string[];
};

export type SyncModifierGroupProductsInput = {
	modifierGroupId: string;
	selectedProductIds: string[];
};

export type SyncModifierGroupProductsResult = {
	updatedProductCount: number;
	attachedCount: number;
	detachedCount: number;
};
