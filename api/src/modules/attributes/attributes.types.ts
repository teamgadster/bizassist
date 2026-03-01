import { AttributeSelectionType } from "@prisma/client";

export type AttributeOptionDto = {
	id: string;
	attributeId: string;
	name: string;
	sortOrder: number;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
};

export type AttributeDto = {
	id: string;
	name: string;
	selectionType: AttributeSelectionType;
	isRequired: boolean;
	sortOrder: number;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
	options: AttributeOptionDto[];
};

export type UpsertAttributeOptionInput = {
	id?: string;
	name: string;
	sortOrder?: number;
	isArchived?: boolean;
};

export type CreateAttributeInput = {
	name: string;
	selectionType: AttributeSelectionType;
	isRequired: boolean;
	sortOrder?: number;
	options: UpsertAttributeOptionInput[];
};

export type UpdateAttributeInput = {
	name?: string;
	selectionType?: AttributeSelectionType;
	isRequired?: boolean;
	sortOrder?: number;
	options?: UpsertAttributeOptionInput[];
};

export type ProductAttributeLinkInput = {
	attributeId: string;
	isRequired?: boolean;
};

export type ReplaceProductAttributesInput = {
	attributes: ProductAttributeLinkInput[];
};

export type ProductAttributeDto = {
	attributeId: string;
	productId: string;
	isRequired: boolean;
	sortOrder: number;
	attribute: AttributeDto;
};

export type CheckoutSelectedAttributeInput = {
	attributeId: string;
	optionId: string;
	attributeNameSnapshot?: string;
	optionNameSnapshot?: string;
};

export type CheckoutSelectedAttributeSnapshot = {
	attributeId: string;
	optionId: string;
	attributeNameSnapshot: string;
	optionNameSnapshot: string;
};
