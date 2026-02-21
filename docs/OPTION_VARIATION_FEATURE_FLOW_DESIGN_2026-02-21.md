# BizAssist Option + Variation Feature Flow Design

**Date:** 2026-02-21  
**Status:** Implementation-ready design (masterplan-locked constraints applied)  
**Scope:** `mobile` + `api` (feature-first)

## 1) Objective
Implement a deterministic, business-scoped Option and Variation flow for Create Item, and refactor the current Option flow so it is API-backed, governance-compliant, and production-safe.

This design intentionally does **not** introduce new architectural abstractions and does **not** redesign screen layout.

## 2) Step 1 - Read + Audit Summary

### 2.1 What exists now
- Mobile Option management screens already exist and are feature-first under `mobile/src/modules/options/*`.
- Product Create already routes into Select Options -> Option Values -> Create Variations flow.
- Prisma schema already has canonical models for options/variations:
  - `OptionSet`, `OptionValue`, `ProductOptionSet`, `ProductOptionSetValue`, `ProductVariation`, `ProductVariationValue` in `api/prisma/schema.prisma`.

### 2.2 Critical gaps found
1. Option data is local-only (not API-backed):
- `mobile/src/modules/options/options.api.ts` calls MMKV store functions directly.
- `mobile/src/modules/options/options.storage.ts` persists option catalog in-device (`MMKV`) per business key.

2. Create Item does not persist selected options/variations:
- `mobile/src/modules/inventory/screens/InventoryProductCreateScreen.tsx` sends product payload without option/variation data.
- API `CatalogService.createProduct` and repository create flows do not write `ProductOptionSet*`/`ProductVariation*` records.

3. Variation generation screen has no query-state safety:
- `mobile/src/modules/options/screens/ProductCreateVariationsScreen.tsx` renders rows directly from derived data with no explicit loading/error/empty states for `useOptionSetsList`.

4. API structure mismatch with constraints:
- No feature-first options module exists in API routing (`api/src/modules/index.ts` has no `/options` module).

## 3) Step 2 - Architecture Fit

## 3.1 API placement (feature-first)
Add a new module:
- `api/src/modules/options/options.types.ts`
- `api/src/modules/options/options.validators.ts`
- `api/src/modules/options/options.repository.ts`
- `api/src/modules/options/options.service.ts`
- `api/src/modules/options/options.controller.ts`
- `api/src/modules/options/options.routes.ts`

Register route in:
- `api/src/modules/index.ts` -> `apiRouter.use("/options", optionsRoutes)`

This mirrors existing Categories/Units/Discounts module structure.

## 3.2 Catalog integration point
Extend existing product create flow in:
- `api/src/modules/catalog/catalog.types.ts`
- `api/src/modules/catalog/catalog.validators.ts`
- `api/src/modules/catalog/catalog.service.ts`
- `api/src/modules/catalog/catalog.repository.ts`

Reason: options/variations are part of product creation and must be persisted transactionally with product creation.

## 3.3 Mobile placement
Keep feature-first module location unchanged:
- `mobile/src/modules/options/*`

Refactor data source only:
- Replace local store-based `options.api.ts` with HTTP-backed API client calls.
- Keep existing React Query keys/hooks (`options.queries.ts`) and cache sync pattern (`options.cache.ts`).

## 4) Step 3 - Exact Implementation Design

## 4.1 API contracts

### 4.1.1 Options endpoints
- `GET /api/v1/options`
- `GET /api/v1/options/:id`
- `POST /api/v1/options`
- `PATCH /api/v1/options/:id`
- `DELETE /api/v1/options/:id` (archive)
- `PATCH /api/v1/options/:id/restore`

Response shape should match existing API envelope style:
- list: `{ success: true, data: { items } }`
- detail/create/update: `{ success: true, data: { item } }`
- archive/restore: `{ success: true }`

### 4.1.2 Product create payload extension
Extend `CreateProductInput` with optional fields:
- `optionSelections?: Array<{ optionSetId: string; selectedValueIds: string[]; sortOrder?: number }>`
- `variations?: Array<{ label?: string; valueMap: Record<string, string>; sortOrder?: number }>`

Validation rules:
- If `optionSelections` exists, it must be non-empty.
- Each selection must reference active option sets/values in the same business.
- `selectedValueIds` must belong to the specified `optionSetId`.
- `variations` must be deduped by canonical variation key.
- Max variation count must honor `MAX_VARIANTS_PER_PRODUCT`.

## 4.2 API persistence behavior (single transaction)
When `createProduct` succeeds:
1. Create `Product` (existing behavior).
2. Create `ProductOptionSet` rows in `sortOrder`.
3. Create `ProductOptionSetValue` rows per selection (only selected values).
4. Create `ProductVariation` rows for selected variations.
5. Create `ProductVariationValue` rows for each variation’s option pair.

Canonical `variationKey` generation:
- Sort optionSet IDs, join as `"optionSetId:optionValueId|..."`.
- Use this key for dedupe and DB uniqueness consistency.

All writes stay inside existing product-create transaction path.

## 4.3 Mobile refactor behavior

### 4.3.1 Replace local options API
In `mobile/src/modules/options/options.api.ts`:
- Remove MMKV store usage.
- Use `apiClient` with same response-envelope parsing style used in categories/units modules.

### 4.3.2 Keep React Query patterns
No pattern changes required in `options.queries.ts`:
- Keep staleTime tier (`300_000`) for settings/admin nature.
- Keep existing cache sync + invalidate strategy.

### 4.3.3 Create Item save integration
In `mobile/src/modules/inventory/screens/InventoryProductCreateScreen.tsx`:
- Include `draft.optionSelections` and `draft.variations` in `inventoryApi.createProduct` payload.
- Add guard: if `optionSelections.length > 0 && variations.length === 0`, block save and show deterministic inline error.

### 4.3.4 Variation screen state hardening
In `mobile/src/modules/options/screens/ProductCreateVariationsScreen.tsx`:
- Add mandatory Loading / Error+Retry / Empty states for option-set dependency query.
- Keep same layout structure (`BAIScreen`, `BAISurface`), no layout redesign.

## 4.4 Governance conformance

### UI + Navigation
- Continue using `BAIScreen` + primary `BAISurface` on all option/variation screens.
- Keep deterministic process exits (`replace(returnTo)` fallback behavior).
- No dropdowns/drawers introduced.

### Loading Overlay
- All async writes remain wrapped with `withBusy(...)`:
  - create/update/archive/restore option set
  - add option value in values screen
  - create product

### UDQI / Units / Categories / POS
- No change to UDQI quantity behavior.
- Unit/category governance unchanged.
- POS behavior unchanged by this feature; data model extension is additive.

## 5) File-Level Change Plan

### API - add
- `api/src/modules/options/options.types.ts`
- `api/src/modules/options/options.validators.ts`
- `api/src/modules/options/options.repository.ts`
- `api/src/modules/options/options.service.ts`
- `api/src/modules/options/options.controller.ts`
- `api/src/modules/options/options.routes.ts`

### API - modify
- `api/src/modules/index.ts` (register route)
- `api/src/modules/catalog/catalog.types.ts` (payload extension)
- `api/src/modules/catalog/catalog.validators.ts` (new schema validation)
- `api/src/modules/catalog/catalog.service.ts` (validation + orchestration)
- `api/src/modules/catalog/catalog.repository.ts` (transactional insert helpers)
- `api/src/shared/catalogLimits.ts` (enforce existing variant cap constant)

### Mobile - modify
- `mobile/src/modules/options/options.api.ts` (HTTP-backed)
- `mobile/src/modules/options/options.types.ts` (align API payloads as needed)
- `mobile/src/modules/inventory/inventory.types.ts` (`CreateProductInput` extension)
- `mobile/src/modules/inventory/screens/InventoryProductCreateScreen.tsx` (send options/variations)
- `mobile/src/modules/options/screens/ProductCreateVariationsScreen.tsx` (query-state hardening)

### Mobile - remove (if unused after refactor)
- `mobile/src/modules/options/options.storage.ts`

## 6) Acceptance Criteria
1. Option sets are business-scoped and shared across devices (API source of truth).
2. Create Item persists selected option sets and selected variations in DB relation tables.
3. Option set lifecycle (create/edit/archive/restore) functions from both Settings and Inventory routes.
4. Select Options -> Values -> Create Variations flow is deterministic and survives navigation safely via draftId.
5. All async writes show global Loading Overlay and are double-tap safe.
6. No TypeScript errors in mobile and api builds.

## 7) Verification Plan

### Compile gates
- API: `cd /Users/gerardogaden/Desktop/bizassist/api && npm run build`
- Mobile: `cd /Users/gerardogaden/Desktop/bizassist/mobile && npx tsc --noEmit -p tsconfig.json`

### Functional checks
- Create option set -> edit -> archive -> restore (Settings route and Inventory route).
- Create Item with:
  - no options (baseline)
  - single option set, subset values
  - multiple option sets, generated variations subset
- Confirm DB rows for:
  - `ProductOptionSet`
  - `ProductOptionSetValue`
  - `ProductVariation`
  - `ProductVariationValue`
- Confirm Create Item cancel/exit behavior does not persist partial writes.

## 8) Out of Scope (explicit)
- POS rendering/selection of variations.
- Variation-level price/cost overrides.
- Inventory movement workflows at variation level.
- UI layout redesign.
