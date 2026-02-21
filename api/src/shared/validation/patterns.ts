// path: src/shared/validation/patterns.ts

// Name: allow letters (including accents), spaces, hyphens, apostrophes.
// Length constraints are enforced separately via FIELD_LIMITS.
export const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

// Email: pragmatic, SaaS-safe pattern.
// Do not overcomplicate this—paired with normalization on backend it’s enough.
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Length constraints are defined in FIELD_LIMITS.
