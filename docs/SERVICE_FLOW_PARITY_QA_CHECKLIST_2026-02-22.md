# Service Flow Parity QA Checklist (Inventory + Settings)

Date: 2026-02-22  
Scope: BizAssist mobile Service flows parity to Item flows (excluding barcode button)

## Pass Criteria
- [ ] All checks below pass in both Inventory and Settings scopes.
- [ ] No navigation dead-ends, duplicate pushes, or unexpected back behavior.
- [ ] No TypeScript/runtime regressions observed during execution.

## 1) Create Service flow parity

### Inventory route
Route: `/(app)/(tabs)/inventory/services/create`

- [ ] Header uses process-style Exit behavior.
- [ ] Enter any field, tap header Exit -> Unsaved changes modal appears.
- [ ] Unsaved modal buttons:
  - [ ] Resume keeps user on create screen.
  - [ ] Discard exits to service list route.
- [ ] Enter any field, tap **Cancel** -> same Unsaved changes modal behavior as header Exit.
- [ ] Camera edit button is present for tile/image editing.
- [ ] Barcode button is **not** present.
- [ ] Save works and routes to created service details.
- [ ] Save & Add Another resets form and stays on create flow.

### Settings route
Route: `/(app)/(tabs)/settings/items-services/services/create`

- [ ] Same behavior as Inventory create for all checks above.

## 2) Service Details overview parity

### Inventory route
Route: `/(app)/(tabs)/inventory/services/[id]`

For active service:
- [ ] Edit action button style matches Item detail parity pattern (pill outline primary).
- [ ] Bottom actions show **Archive** + **Cancel** with pill outline styles.
- [ ] Camera edit-image affordance present and navigates to photo screen.

For archived service:
- [ ] Bottom actions show **Cancel** + **Restore**.
- [ ] Archive action not shown.

### Settings route
Route: `/(app)/(tabs)/settings/items-services/services/[id]`

- [ ] Same behavior as Inventory details for all checks above.

## 3) Edit Service image process parity

### Inventory route
Route: `/(app)/(tabs)/inventory/services/[id]/photo`

- [ ] Uses detail-style back header behavior.
- [ ] Displays preview state correctly (photo or empty state).
- [ ] Primary actions: **Photo Library**, **Take a Photo**.
- [ ] Secondary actions: **Cancel**, **Remove Photo**.
- [ ] Remove Photo opens confirmation modal.
- [ ] Confirm remove invalidates and refreshes detail/list image state.
- [ ] Cancel returns to service details deterministically.

### Settings route
Route: `/(app)/(tabs)/settings/items-services/services/[id]/photo`

- [ ] Same behavior as Inventory photo flow for all checks above.

## 4) Navigation governance checks

- [ ] Rapid taps do not trigger duplicate navigations on create/detail/photo screens.
- [ ] Back/Exit behavior remains deterministic in both route scopes.
- [ ] Route scope mapping is preserved (Inventory stays in Inventory, Settings stays in Settings).

## 5) Signoff

Tester: ____________________  
Environment: ____________________  
Build/Commit: ____________________  

- [ ] PASS
- [ ] FAIL

Notes:

- 
- 
- 
