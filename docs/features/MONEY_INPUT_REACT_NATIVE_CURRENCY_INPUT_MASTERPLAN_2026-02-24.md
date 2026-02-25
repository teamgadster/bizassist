# Money Input Migration Masterplan (react-native-currency-input)

**Date:** 2026-02-24  
**Scope:** Mobile app (`mobile/`) currency/price inputs  
**Status:** Approved for implementation planning (not yet migrated)

---

## 1) Package Scan Summary

**Package:** `react-native-currency-input` (`^1.1.1`)  
**NPM:** https://www.npmjs.com/package/react-native-currency-input  
**License:** MIT  
**TypeScript declarations:** Included  
**Publish recency:** ~2 years since last publish (stability positive, maintenance recency risk)

### Relevant capabilities

- Controlled currency input with formatting options (`prefix`, `delimiter`, `separator`, `precision`)
- Numeric callback (`onChangeValue`) + formatted text callback (`onChangeText`)
- `minValue`/`maxValue` support for numeric constraints
- `renderTextInput` hook for custom TextInput integration
- `formatNumber` utility for deterministic formatting helpers
- `FakeCurrencyInput` variant to avoid controlled-input flicker (with UX tradeoffs)

---

## 2) Fit Analysis for BizAssist

### Strong fit

- Replaces hand-rolled comma/decimal formatting paths and reduces formatter drift across screens.
- Native support for thousands delimiter and fixed decimal precision aligns with BizAssist money policy.
- Works with custom input rendering, enabling compatibility with `BAITextInput` visual system.

### Risks / caveats

- Package is controlled-input; cursor/selection behaviors must be validated on iOS and Android.
- `FakeCurrencyInput` removes normal selection UX and locks cursor; not appropriate for current BizAssist form UX.
- Existing BizAssist money flows are string-based (`priceText`), while package is number-based; migration requires strict adapter logic.
- Last publish is not recent; keep migration behind `BAIMoneyInput` wrapper to preserve swap-out option.

### Decision

- **Adopt package behind `BAIMoneyInput` wrapper** (do not expose library directly in feature screens).
- **Do not use `FakeCurrencyInput`** for current forms.
- **Preserve existing app contract:** feature screens continue to use string `value`/`onChangeText` from `BAIMoneyInput`.

---

## 3) Implementation Architecture (Locked)

### 3.1 Adapter strategy

Keep `BAIMoneyInput` as the single UI primitive and internally switch implementation to `CurrencyInput`.

- Input contract outward remains:
  - `value: string`
  - `onChangeText(value: string)`
  - existing props (`currencyCode`, `maxLength`, etc.)
- Internal conversion:
  - parse incoming string -> numeric (`number | null`) for `CurrencyInput`
  - map `onChangeValue(number | null)` back to canonical string representation used by existing forms
- Keep blur-normalization semantics consistent with current behavior unless explicitly revised.

### 3.2 Formatting defaults

- `delimiter=","`
- `separator="."`
- `precision=2`
- Currency symbol via existing business currency code mapping and current affix behavior parity.

### 3.3 Character budget governance

- Continue enforcing **Purpose-Aligned Character Limit** through shared `FIELD_LIMITS`.
- Input mask/formatting must not bypass whole-digit caps in business flows.
- Where UI requires formatted-length allowance (comma + `.00`), enforce via adapter-level utility, not per-screen ad hoc code.

### 3.4 Cap behavior governance (Silent Growth Lock)

- Canonical behavior term: **Silent Growth Lock**.
- Implementation term: **Backspace-Safe Cap Guard**.
- Once max minor-digit budget is reached, numeric growth taps are ignored silently to prevent jitter/flicker loops.
- Backspace/delete and non-growth replacements must remain functional at cap.
- Enforcement should be dual-layer:
  - formatted `maxLength` guard (UI/native layer)
  - `onChangeText` growth guard against minor-digit budget (logic layer).
- Apply this rule consistently to all number-pad money inputs, not only modifier rows.

---

## 4) Rollout Plan

### Phase A — Foundation (single primitive)

1. Refactor `BAIMoneyInput` to use `react-native-currency-input` internally.
2. Preserve all external props and avoid breaking callers.
3. Add unitized helper functions for parse/format conversion in shared money utility layer.

### Phase B — High-impact flows

1. Validate modifiers upsert amount rows (`ModifierGroupUpsertScreen`).
2. Validate inventory product create/edit price fields.
3. Validate service upsert price fields.

### Phase C — Hardening

1. Verify keyboard/cursor behavior on iOS and Android.
2. Verify copy/paste, delete, decimal typing, and leading zero handling.
3. Validate that API payload minor-unit conversion remains unchanged.

---

## 5) Acceptance Criteria

- Commas render consistently while typing and after blur.
- Decimal precision is exactly 2 for money fields where required.
- No regression in save payloads (`minor units`) across modifiers, inventory products, and services.
- `BAIMoneyInput` remains the sole abstraction used by screens (no direct package usage in feature screens).
- Zero TypeScript errors in `mobile/` after migration.

---

## 6) Validation Checklist (Implementation QA)

- iOS + Android manual checks:
  - Type `1`, `12`, `1234`, `12345`
  - Type decimals: `1.2`, `1.23`, `1.234` (last digit capped)
  - At max cap, repeatedly tap digits and verify no visual jitter/value churn
  - Delete back to empty and retype
  - At max cap, verify backspace and overwrite edits still work
  - Paste formatted/unformatted values
- Screen checks:
  - Modifiers create/edit
  - Inventory item create/edit
  - Service create/edit
- Contract checks:
  - UI string value remains parseable by existing `toMinorUnits`/submission paths
  - no API validation regressions

---

## 7) Rollback Strategy

- Because package is wrapped by `BAIMoneyInput`, rollback is low risk:
  - revert `BAIMoneyInput` internals to previous implementation
  - no feature-screen API changes required

---

## 8) Final Recommendation

Proceed with migration behind `BAIMoneyInput` wrapper only. This provides consistent formatting and less ad hoc per-screen money logic while preserving BizAssist governance and minimizing blast radius.
