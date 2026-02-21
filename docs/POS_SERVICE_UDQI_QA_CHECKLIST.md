# POS: Service UDQI Quantity Semantics QA Checklist

Date: 2026-02-16
Goal: Validate service-unit quantity semantics and precision behavior in POS cart quantity editing (phone and tablet).

## Preconditions

- At least 3 active SERVICE products exist and are visible in POS catalog:
  1. COUNT or CUSTOM-like unit (integer-only)
  2. TIME unit with decimal precision (example: hour, precisionScale 2)
  3. TIME whole-only unit (shift or session)
- Product prices are set so line totals are visible.
- If any service has stock tracking enabled by legacy data, confirm behavior still blocks over-max quantities as usual.

## 1) COUNT or CUSTOM service (integer-only)

- Add the service to cart.
- Open quantity editor from cart row.
- Verify:
  - Keyboard is integer-oriented (`number-pad` behavior on supported devices).
  - Typing `1.5` does not persist decimal input.
  - Save accepts `1`, `2`, etc.
  - Saved quantity appears without decimal digits in cart row.

## 2) TIME decimal service (example: hour @ scale 2)

- Add the service to cart.
- Open quantity editor.
- Verify:
  - Keyboard is decimal-capable.
  - Typing `1.25` is accepted.
  - More than allowed decimals (example `1.234`) is constrained or rejected by input and validation.
  - On blur, value normalizes to configured scale for submit (example `1.2` -> `1.20`).
  - Save updates cart row and line total using normalized quantity.

## 3) TIME whole-only service (shift or session)

- Add the service to cart.
- Open quantity editor.
- Verify:
  - Keyboard behaves integer-only.
  - Decimal entry does not persist.
  - Save only allows whole numbers.

## 4) Stock-bound safety (if applicable)

- For any service line with stock cap data in POS payload:
  - Enter quantity above max.
  - Verify save is blocked and stock warning is shown.
  - Enter valid quantity at or below max and verify save succeeds.

## 5) Cross-surface consistency

- Repeat sections 1-3 on:
  - Phone POS (`pos.phone`)
  - Tablet POS (`pos.tablet`)
- Verify equivalent behavior in both surfaces.

## Pass Criteria

- Effective precision in POS is unit-semantic for services:
  - COUNT or CUSTOM => integer-only.
  - TIME decimal units => decimal up to allowed scale.
  - TIME whole-only units (shift or session) => integer-only.
- Quantity edit input, blur normalization, and save outcomes are consistent with selected unit semantics.
- No regressions in cart line update, totals, or stock constraint checks.
