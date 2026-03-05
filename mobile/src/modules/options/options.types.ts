export type OptionValue = {
id: string;
optionSetId: string;
name: string;
sortOrder: number;
isArchived: boolean;
createdAt: string;
updatedAt: string;
};

export type OptionSet = {
id: string;
name: string;
displayName?: string;
sortOrder: number;
isArchived: boolean;
attachedProductCount: number;
activeValuesCount: number;
archivedValuesCount: number;
createdAt: string;
updatedAt: string;
values: OptionValue[];
};
