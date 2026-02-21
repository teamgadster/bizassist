// BizAssist_api
// path: src/shared/catalogLimits.ts
//
// Catalog guardrails are operational safety limits, not pricing-plan limits.

export const CATALOG_LIST_DEFAULT_LIMIT = 20;
export const CATALOG_LIST_MAX_LIMIT = 100;

export const MAX_PRODUCTS_PER_BUSINESS = 10_000;
export const CATALOG_USAGE_WARNING_THRESHOLD = 0.8;

export const MAX_PRODUCT_IMAGES = 10;

// Variation/option guardrails (schema exists; enforcement points are TODO until modules are shipped).
export const MAX_VARIANTS_PER_PRODUCT = 50;
export const MAX_MODIFIERS_PER_PRODUCT = 20;
// TODO(catalog-variants): enforce MAX_VARIANTS_PER_PRODUCT in variant create/update flows when module lands.
// TODO(catalog-modifiers): enforce MAX_MODIFIERS_PER_PRODUCT in option/modifier assignment flows when module lands.
