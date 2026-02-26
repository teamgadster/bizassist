# Modifier Option Archive/Restore QA Checklist (2026-02-26)

## Scope

Validate the Edit Modifier screen behavior for modifier options with Active and Archived tabs.

Feature expectations covered:

- Active/Archived option tabs are present in Edit Modifier.
- Archived tab mirrors active option row layout.
- Archived swipe/reveal controls use primary tone (not danger tone).
- Archived reveal action is Restore (not Archive/Delete).
- Restore moves an option back to Active.

## Preconditions

- App runs on iOS simulator or device.
- User can access Settings > Modifiers or Inventory > Modifiers.
- Test modifier set exists with at least 2 active options.
- At least 1 option can be archived during test.

## Test Data

- Modifier Set Name: Toppings QA
- Option A: Beef (price 500.00)
- Option B: Egg (price 25.55)

## Test Cases

### 1) Tabs visibility and defaults

- Open an existing modifier set in Edit Modifier.
- Verify tabs are visible: Active and Archived.
- Verify Active is selected by default.
- Verify counts render and update after archive/restore actions.

Pass criteria:

- Both tabs render and can be switched.
- Active tab default is correct.

### 2) Active tab row behavior unchanged

- In Active tab, reveal an option row action via the round minus button.
- Verify minus control color uses danger tone (red) as before.
- Verify reveal action label is Archive for persisted option.
- For unsaved placeholder/draft row, verify label is Delete.

Pass criteria:

- Existing Active behavior is unchanged.

### 3) Archive option moves to Archived tab

- Archive one persisted option from Active tab.
- Switch to Archived tab.
- Verify archived option appears there.
- Return to Active tab and verify archived option is no longer listed.

Pass criteria:

- Option transitions Active -> Archived immediately in UI.

### 4) Archived tab mirrors row layout

- In Archived tab, inspect row structure.
- Verify same layout components as Active row:
  - Round minus reveal button on left
  - Option name field position
  - Price field position
  - Swipe/reveal action area on right

Pass criteria:

- Layout parity is preserved between Active and Archived rows.

### 5) Archived control/action styling and label

- Reveal action on an archived row.
- Verify minus button fill uses primary tone.
- Verify action background uses primary tone.
- Verify action text is Restore.

Pass criteria:

- Archived controls are primary-themed and action text is Restore.

### 6) Restore option behavior

- Tap Restore for an archived row.
- Verify busy/loading overlay appears during async operation.
- Verify row disappears from Archived tab and appears in Active tab.
- Verify no error message shown.

Pass criteria:

- Option transitions Archived -> Active successfully.
- Async UX uses loading overlay.

### 7) Save guard and compile safety sanity

- Make no additional edits after restore and observe Save button state.
- Make a small edit and verify Save enables appropriately.

Pass criteria:

- Save behavior remains consistent with existing edit flow.

## Regression Checks

- Apply Set row remains functional.
- Advanced rules expand/collapse remains functional.
- Archive Modifier Set CTA still appears in edit mode.
- No navigation regressions when entering/leaving edit screen.

## Result Log

- Tester:
- Date:
- Build/Commit:
- Result: Pass / Fail
- Notes:
