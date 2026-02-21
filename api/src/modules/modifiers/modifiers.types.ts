import { ModifierSelectionType } from "@prisma/client";

export type ModifierOptionDto = {
	id: string;
	name: string;
	priceDeltaMinor: string;
	sortOrder: number;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ModifierGroupDto = {
	id: string;
	productId: string;
	name: string;
	selectionType: ModifierSelectionType;
	isRequired: boolean;
	minSelected: number;
	maxSelected: number;
	sortOrder: number;
	isArchived: boolean;
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

export type UpdateModifierOptionInput = Partial<CreateModifierOptionInput>;
