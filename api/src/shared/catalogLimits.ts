// BizAssist_api
// path: src/shared/catalogLimits.ts
//
// Catalog guardrails are operational safety limits, not pricing-plan limits.

export const CATALOG_LIST_DEFAULT_LIMIT = 20;
export const CATALOG_LIST_MAX_LIMIT = 100;

export const MAX_PRODUCTS_PER_BUSINESS = 10_000;
export const CATALOG_USAGE_WARNING_THRESHOLD = 0.8;

export const MAX_PRODUCT_IMAGES = 10;

export const MAX_MODIFIER_GROUPS_PER_BUSINESS = 500;
export const MAX_MODIFIER_GROUPS_PER_PRODUCT = 25;
export const MAX_MODIFIER_OPTIONS_PER_GROUP = 50;
export const MAX_OPTION_SETS_PER_BUSINESS = 500;
export const MAX_OPTION_VALUES_PER_SET = 100;
export const MAX_VARIATIONS_PER_PRODUCT = 300;
export const VARIATION_WARNING_THRESHOLD = 150;
