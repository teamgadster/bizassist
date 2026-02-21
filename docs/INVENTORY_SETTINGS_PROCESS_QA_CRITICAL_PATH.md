# Inventory + Settings Process QA (Critical Path, ~5 min)

Date: 2026-02-16
Goal: Fast pre-merge confidence on process governance + Service parity.

## 1) Inventory Service create and edit (must-pass)

- Open /(app)/(tabs)/inventory/services/create
  - Unit is required (no silent default).
  - Save blocked without unit.
  - Exit returns deterministically.
- Open an existing service /(app)/(tabs)/inventory/services/[id]/edit
  - Unit can be changed and saved.
  - Exit returns to detail route.

## 2) Inventory Service archive and restore (must-pass)

- Open /(app)/(tabs)/inventory/services/[id]/archive
  - No duplicate in-card process title.
  - Copy is sentence case (Loading..., Could not load..., ... not found).
  - Exit goes to service detail deterministically.
- Open /(app)/(tabs)/inventory/services/[id]/restore
  - Same checks as archive.

## 3) Inventory process parity quick spot-check

- Item archive: /(app)/(tabs)/inventory/products/[id]/archive
  - No duplicate in-card process title.
- Unit restore: /(app)/(tabs)/inventory/units/[id]/restore
  - "Loading unit..." + "Could not load unit." wording.
- Discount archive: /(app)/(tabs)/inventory/discounts/[id]/archive
  - Exit is deterministic to detail route.

## 4) Settings process parity quick spot-check

- Category archive: /(app)/(tabs)/settings/categories/[id]/archive
  - No duplicate in-card process title.
- Unit edit and detail: /(app)/(tabs)/settings/units/[id]/edit and /(app)/(tabs)/settings/units/[id]
  - Uses "Loading unit..." / "Could not load unit." wording.
- Discount archive: /(app)/(tabs)/settings/discounts/[id]/archive
  - Exit is deterministic to detail route.

## 5) Inventory list behavior sanity

- Open /(app)/(tabs)/inventory
  - Service row right-side shows service semantics (unit and status), not stock semantics.
  - Item rows still show stock semantics as before.

## 6) POS: Service UDQI Quantity Semantics (must-pass)

- Run the focused POS flow checks in [docs/POS_SERVICE_UDQI_QA_CHECKLIST.md](docs/POS_SERVICE_UDQI_QA_CHECKLIST.md).
- Verify COUNT or CUSTOM integer-only, TIME decimal precision, and TIME whole-only behavior on phone and tablet POS.

## Pass Criteria

- No process screen shows duplicated Archive or Restore title in card body.
- No process Exit uses unpredictable history behavior.
- No copy regressions in the touched process flows.
