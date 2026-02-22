# Inventory + Settings Process QA Checklist (iOS)

Date: 2026-02-16
Scope: Process-screen parity and governance for archive, restore, create, and edit flows.

## Focused Addendum

- Service create/details/photo parity signoff: [docs/SERVICE_FLOW_PARITY_QA_CHECKLIST_2026-02-22.md](docs/SERVICE_FLOW_PARITY_QA_CHECKLIST_2026-02-22.md)

## Preconditions

- App builds and opens on iOS simulator or device.
- Test account can access Inventory and Settings.
- Seed data exists for:
  - 1 active and 1 archived Item
  - 1 active and 1 archived Service
  - 1 active and 1 archived Category
  - 1 active and 1 archived custom Unit
  - 1 active and 1 archived Discount

## Global Governance Checks (every process screen)

- Header uses process mode with Exit behavior (cancel intent).
- Exit always returns to deterministic detail or list route (no unpredictable history jump).
- No duplicate in-card title that repeats the Archive or Restore header title.
- Status copy is sentence case (examples: "Loading ...", "Could not load ...", "... not found.").
- Primary action is disabled while busy or nav-locked.
- Cancel and confirm buttons are visible and consistent (pill actions).

## Inventory: Services

### Create Service

Route: /(app)/(tabs)/inventory/services/create

- Unit is required before save.
- No implicit default time unit appears.
- Unit placeholder reads as service-specific selection intent.
- Save with missing unit shows service-unit required validation.
- Keyboard avoidance and tap-outside dismiss work.

### Edit Service

Route: /(app)/(tabs)/inventory/services/[id]/edit

- Existing service loads with selected unit shown.
- Unit can be changed via picker and persists after save.
- Save blocked when unit is missing.
- Exit returns to service detail deterministically.

### Service Detail

Route: /(app)/(tabs)/inventory/services/[id]

- Shows Price, Cost, and Unit rows.
- Archived state uses interactive-styled surface card.
- Restore or Archive action card reflects lifecycle state.

### Archive Service

Route: /(app)/(tabs)/inventory/services/[id]/archive

- Exit returns to service detail deterministically.
- Copy is sentence case; no duplicate in-card process title.
- Confirm archive transitions service to archived state.

### Restore Service

Route: /(app)/(tabs)/inventory/services/[id]/restore

- Exit returns to service detail deterministically.
- Copy is sentence case; no duplicate in-card process title.
- Confirm restore transitions service to active state.

## Inventory: Items, Categories, Units, Discounts (process screens)

### Item Archive and Restore

Routes:

- /(app)/(tabs)/inventory/products/[id]/archive
- /(app)/(tabs)/inventory/products/[id]/restore
  Checks:
- No duplicate in-card Archive title.
- Archive and restore action sentence uses smart quotes around name.
- Exit behavior is deterministic.

### Category Archive and Restore

Routes:

- /(app)/(tabs)/inventory/categories/[id]/archive
- /(app)/(tabs)/inventory/categories/[id]/restore
  Checks:
- No duplicate in-card Archive title.
- Sentence-case loading, error, and not-found copy.

### Unit Archive and Restore

Routes:

- /(app)/(tabs)/inventory/units/[id]/archive
- /(app)/(tabs)/inventory/units/[id]/restore
  Checks:
- No duplicate in-card process titles.
- "Loading unit..." and "Could not load unit." wording.
- Archive and restore action sentence uses smart quotes around name.

### Discount Archive and Restore

Routes:

- /(app)/(tabs)/inventory/discounts/[id]/archive
- /(app)/(tabs)/inventory/discounts/[id]/restore
  Checks:
- Archive Exit is deterministic to detail route.
- Sentence-case loading, error, and not-found copy.

## Settings: Categories, Units, Discounts (process screens)

### Category Archive and Restore

Routes:

- /(app)/(tabs)/settings/categories/[id]/archive
- /(app)/(tabs)/settings/categories/[id]/restore
  Checks:
- No duplicate in-card Archive title.
- Sentence-case loading, error, and not-found copy.
- Archive and restore sentence uses smart quotes around name.

### Unit Archive, Restore, Edit, and Detail copy parity

Routes:

- /(app)/(tabs)/settings/units/[id]/archive
- /(app)/(tabs)/settings/units/[id]/restore
- /(app)/(tabs)/settings/units/[id]/edit
- /(app)/(tabs)/settings/units/[id]
  Checks:
- Archive and restore wording matches Inventory style:
  - "Loading unit..."
  - "Could not load unit."
- Archive and restore sentence uses smart quotes around name.
- Edit screen Save is enabled only when valid changes exist.

### Discount Archive and Restore

Routes:

- /(app)/(tabs)/settings/discounts/[id]/archive
- /(app)/(tabs)/settings/discounts/[id]/restore
  Checks:
- Archive Exit is deterministic to detail route.
- Sentence-case loading, error, and not-found copy.
- Archive and restore sentence uses smart quotes around name.

## Inventory List Rendering: Service Semantics

Route: /(app)/(tabs)/inventory

- Service rows show service-aware right column (unit metadata + service status), not stock semantics.
- Item rows continue showing stock and on-hand semantics unchanged.

## POS: Service UDQI Quantity Semantics

- Run focused POS checks in [docs/POS_SERVICE_UDQI_QA_CHECKLIST.md](docs/POS_SERVICE_UDQI_QA_CHECKLIST.md).
- Validate effective precision behavior for service units:
  - COUNT or CUSTOM: integer-only.
  - TIME decimal units: decimal input up to configured precision.
  - TIME whole-only units (shift or session): integer-only.

## Regression Sanity

- Inventory create and edit item still save normally.
- Unit picker still opens and returns selection to caller routes.
- No crashes when opening archive or restore routes from deep links.

## Pass and Fail Notes

- Record screenshots for any failed case.
- For failures, capture route, lifecycle state, and exact copy mismatch.
