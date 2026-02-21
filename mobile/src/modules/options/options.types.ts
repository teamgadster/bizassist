// BizAssist_mobile
// path: src/modules/options/options.types.ts

export type OptionValue = {
	id: string;
	name: string;
	sortOrder: number;
	isActive: boolean;
	archivedAt?: string | null;
};

export type OptionSet = {
	id: string;
	name: string;
	displayName: string;
	values: OptionValue[];
	isActive: boolean;
	archivedAt?: string | null;
	createdAt: string;
	updatedAt: string;
};

export type OptionSetListResponse = {
	items: OptionSet[];
};

export type OptionValueInput = {
	id?: string;
	name: string;
	sortOrder?: number;
	isActive?: boolean;
};

export type CreateOptionSetPayload = {
	name: string;
	displayName?: string;
	values: string[];
};

export type UpdateOptionSetPayload = {
	name: string;
	displayName?: string;
	values: OptionValueInput[];
};

export type ListOptionSetsParams = {
	q?: string;
	isActive?: boolean;
	includeArchived?: boolean;
	limit?: number;
};

export type OptionSelectionDraft = {
	optionSetId: string;
	optionSetName: string;
	displayName: string;
	selectedValueIds: string[];
};

export type ProductVariationDraft = {
	id: string;
	label: string;
	valueMap: Record<string, string>;
	stockStatus: "VARIABLE" | "SOLD_OUT";
	stockReason: string | null;
	stockReceived: string;
};
