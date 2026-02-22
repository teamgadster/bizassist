# Navigation Governance Matrix — 2026-02-22

## Scope

This matrix documents current mobile header-governance wiring after the Back vs Exit refactor and fallback hardening pass.

Audited areas:

- Header governance hooks (`useAppHeader`, `useInventoryHeader`)
- Back (`onBack`) vs Exit (`onExit`) semantics
- Process fallback route hardening (`exitFallbackRoute`)
- Save / Archive / Restore redirect behavior for key process flows

## Governance Rules (SSOT)

- `detail` / `picker` screens: **Back semantics**
  - Primary: explicit `onBack`
  - Shared fallback path available in `useAppHeader` (`runGovernedBack`)
- `process` screens: **Exit semantics**
  - Primary: explicit `onExit`
  - Deterministic fallback: explicit `exitFallbackRoute` on every process header hook call
- Shared header renderer: `src/modules/navigation/useAppHeader.ts`
- Shared navigation governance helpers: `src/modules/inventory/navigation.governance.ts`

## Header Hook Matrix (Current)

| File                                                                             | Line | Hook      | Class   | onBack | onExit | exitFallbackRoute |
| -------------------------------------------------------------------------------- | ---: | --------- | ------- | :----: | :----: | :---------------: |
| src/modules/categories/screens/InventoryCategoryCreateScreen.tsx                 |  135 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/categories/screens/InventoryCategoryDetailScreen.tsx                 |  229 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/categories/screens/InventoryCategoryPickerScreen.tsx                 |  228 | Inventory | picker  |   ✅   |   ❌   |        n/a        |
| src/modules/inventory/screens/InventoryProductActivityMovementScreen.tsx         |  232 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/inventory/screens/InventoryProductActivityScreen.tsx                 |  349 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/inventory/screens/InventoryProductAdjustScreen.tsx                   |  411 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductArchiveScreen.tsx                  |  114 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductCreateScreen.tsx                   | 1018 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductDetailScreen.tsx                   |  438 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/inventory/screens/InventoryProductEditScreen.tsx                     |  716 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductPhotoScreen.tsx                    |  105 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/inventory/screens/InventoryProductPosTilePhoneScreen.tsx             |  180 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductPosTilePhotoLibraryPhoneScreen.tsx |  194 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductPosTileRecentsPhoneScreen.tsx      |  154 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/screens/InventoryProductRestoreScreen.tsx                  |  115 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/inventory/services/screens/InventoryServiceDurationPickerScreen.tsx  |  157 | Inventory | picker  |   ✅   |   ❌   |        n/a        |
| src/modules/inventory/services/screens/InventoryServiceRestoreScreen.tsx         |  110 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/options/screens/OptionSetDetailScreen.tsx                            |  121 | App       | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/options/screens/OptionSetDetailScreen.tsx                            |  122 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/options/screens/OptionSetLedgerScreen.tsx                            |  195 | App       | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/options/screens/OptionSetLedgerScreen.tsx                            |  196 | Inventory | detail  |   ✅   |   ❌   |        n/a        |
| src/modules/options/screens/OptionSetLifecycleScreen.tsx                         |  132 | App       | process |   ❌   |   ✅   |        ✅         |
| src/modules/options/screens/OptionSetLifecycleScreen.tsx                         |  138 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/options/screens/OptionSetUpsertScreen.tsx                            |  423 | App       | process |   ❌   |   ✅   |        ✅         |
| src/modules/options/screens/OptionSetUpsertScreen.tsx                            |  429 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/options/screens/ProductOptionValuesScreen.tsx                        |  233 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/options/screens/ProductSelectOptionsScreen.tsx                       |  179 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitAddScreen.tsx                             |  153 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitArchiveScreen.tsx                         |  106 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitCreateScreen.tsx                          |  137 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitCustomCreateScreen.tsx                    |  207 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitPickerScreen.tsx                          |  470 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitRestoreScreen.tsx                         |  105 | Inventory | process |   ❌   |   ✅   |        ✅         |
| src/modules/units/screens/InventoryUnitSelectScreen.tsx                          |  334 | Inventory | process |   ❌   |   ✅   |        ✅         |

## Redirect Audit (Save / Archive / Restore)

### Product flows

- Create item (`InventoryProductCreateScreen`):
  - Save → product detail (`router.replace` with detail route + `DETAIL_FROM_SAVE_KEY`)
  - Save & add another → return to create flow state
  - Exit/Cancel → deterministic Add Items fallback (`exitFallbackRoute`)
- Edit item (`InventoryProductEditScreen`):
  - Save → product detail (`router.replace`)
  - Exit/Cancel → deterministic detail fallback (`exitFallbackRoute`)
- Archive / Restore item screens:
  - Confirm action → product detail (`router.replace(detailRoute)`)
  - Exit/Cancel → deterministic detail fallback (`exitFallbackRoute`)

### Service flows

- Service upsert (`ServiceUpsertScreen`):
  - Save detail → service detail (`router.replace`)
  - Save & add another → exit route (`router.replace(exitRoute)`)
  - Exit/Cancel → governed deterministic exit route
- Restore service (`InventoryServiceRestoreScreen`):
  - Confirm restore → service detail (`router.replace(detailRoute)`)
  - Exit/Cancel → deterministic detail fallback (`exitFallbackRoute`)

### Options / Units / Categories

- Option upsert + lifecycle + values screens:
  - Save/archive/restore redirects use deterministic `router.replace` flows to detail/ledger routes
  - Process headers now include explicit `exitFallbackRoute`
- Unit process screens (picker/select/create/custom/archive/restore):
  - Confirm actions route deterministically to configured flow routes
  - Process headers include explicit `exitFallbackRoute`
- Category create:
  - Save/exit paths are deterministic replace-based and process header includes `exitFallbackRoute`

## Verification Status

- Process header hardening audit script: `MISSING 0` (all process headers define `exitFallbackRoute`)
- Detail/picker audit script: `MISSING 0` (all detail/picker headers define explicit `onBack`)
- Typecheck: `TS_OK` (`npx tsc --noEmit -p mobile/tsconfig.json`)

## Settings Items-Services Unit Flow Matrix (Manual)

This matrix traces the settings wrappers to the shared units screens and records the expected Back/Exit target chain.

| Route entry                                                 | Wrapper scope             | Screen header intent           | Left action target (Cancel / Exit)                                                                                                                       | Notes                                                            |
| ----------------------------------------------------------- | ------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/(app)/(tabs)/settings/items-services/units/picker`        | `settings-items-services` | Process (`Select Unit Type`)   | `replace(returnTo)` where scoped fallback resolves to settings items-services add/create item routes                                                     | Deterministic exit via `onCancel` in `InventoryUnitPickerScreen` |
| `/(app)/(tabs)/settings/items-services/units/add`           | `settings-items-services` | Process (`Unit Category`)      | Standalone units: `replace(returnTo)` to settings units index; selection flow: `replace(scoped UNIT_PICKER_ROUTE)`                                       | Exit branch preserved; scope mapping now guaranteed              |
| `/(app)/(tabs)/settings/items-services/units/select`        | `settings-items-services` | Process (`Add Unit`)           | `replace(scoped UNIT_ADD_ROUTE)`                                                                                                                         | Cancel returns to previous unit step in same scoped flow         |
| `/(app)/(tabs)/settings/items-services/units/create`        | `settings-items-services` | Process (`Create Custom Unit`) | If category context exists: `replace(scoped UNIT_SELECT_ROUTE)`; else standalone units to settings units index; else `replace(scoped UNIT_PICKER_ROUTE)` | Exit chain remains deterministic                                 |
| `/(app)/(tabs)/settings/items-services/units/custom-create` | `settings-items-services` | Process (`Custom Unit`)        | `replace(scoped UNIT_SELECT_ROUTE)`                                                                                                                      | Cancel returns to custom-unit select step in scoped flow         |

### Scoped fallback hardening applied

- All settings unit wrappers now pass `routeScope='settings-items-services'`.
- Shared unit screens now derive fallback `returnTo` from `routeScope` when inbound `returnTo` is absent.
- `resolveReturnTo` in `units.navigation` supports an explicit scoped fallback.

Result: Back/Exit and cancel paths in settings unit feature flows stay within settings/items-services routes instead of drifting to inventory defaults when `returnTo` is missing.

## Settings Items-Services Product Photo Subflow Matrix (Manual)

This matrix covers the item-photo path launched from settings items-services product photo screens.

| Route entry                                                                   | Wrapper scope             | Header intent                   | Left action behavior                                                                                                          | Primary forward behavior                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/(app)/(tabs)/settings/items-services/products/[id]/photo`                   | `settings-items-services` | Detail (Back)                   | Back uses governed history-first behavior, fallback to product detail route                                                   | Photo Library button routes to scoped `pos-tile-photo-library.phone` with `mode=itemPhoto`, `productId`, and scoped `returnTo` |
| `/(app)/(tabs)/settings/items-services/products/pos-tile-photo-library.phone` | `settings-items-services` | Picker-style (Back)             | Back is history-first; if no history, deterministic replace to `returnTo` with `id` + `rootReturnTo`                          | Next routes to scoped crop route with `mode=itemPhoto`, `productId`, `localUri`, `returnTo`                                    |
| `/(app)/(tabs)/settings/items-services/products/pos-tile-recents.phone`       | `settings-items-services` | Picker-style (Back)             | Back is history-first; if no history, deterministic replace to `returnTo` with `id` + `rootReturnTo` (or root route if no id) | Next routes to scoped crop route with `mode=itemPhoto`, `productId`, `localUri`, `returnTo`                                    |
| `/(app)/(tabs)/settings/items-services/products/pos-tile-crop.phone`          | `settings-items-services` | Process (Exit) for this wrapper | Left action uses process exit: deterministic replace to `returnTo` with `id` when available; else root route                  | Save/upload returns to `returnTo` product photo route with `id`                                                                |

### Product photo flow governance notes

- Settings wrappers for photo library, recents, crop, and product photo all pass `routeScope='settings-items-services'`.
- Photo library and recents now use Back semantics (history first) with param-aware deterministic fallback when history is unavailable.
- Crop supports both variants correctly: Back uses back logic when configured as back; process wrapper here intentionally uses Exit semantics.
- End-to-end item-photo flow now returns to settings items-services product photo/detail targets without inventory-route drift.

## Signoff

This matrix reflects the codebase state as of 2026-02-22 after governance hardening and redirect normalization updates.
