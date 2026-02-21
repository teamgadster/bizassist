// path: src/shared/validation/patterns.ts

// Name: allow letters (including accents), spaces, hyphens, apostrophes.
// Length constraints are enforced separately via FIELD_LIMITS.
export const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

// Email: pragmatic, SaaS-safe pattern.
// Do not overcomplicate this—paired with normalization on backend it’s enough.
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Length constraints are defined in FIELD_LIMITS.

// POS tile label: letters, numbers, spaces only. Length in FIELD_LIMITS.posTileLabel.
export const posTileLabelRegex = /^[A-Za-z0-9 ]+$/;

// Label-style names: letters (incl. accents), numbers, spaces, and basic punctuation.
export const labelRegex = /^[A-Za-z0-9À-ÖØ-öø-ÿ'&().,\/\- ]+$/;

// Unit abbreviation: letters/numbers with basic separators (no leading space).
export const unitAbbreviationRegex = /^[A-Za-z0-9][A-Za-z0-9 .\/\-]*$/;

// SKU: letters/numbers, dot, underscore, dash (no spaces). Length in FIELD_LIMITS.sku.
export const skuRegex = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Barcode: letters/numbers with dot, underscore, colon, dash. Length in FIELD_LIMITS.barcode.
export const barcodeRegex = /^[0-9A-Za-z][0-9A-Za-z._:-]*$/;
