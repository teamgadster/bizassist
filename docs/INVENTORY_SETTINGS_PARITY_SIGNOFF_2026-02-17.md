# Inventory ↔ Settings Parity Sign-off (Categories, Discounts, Units)

Date: 2026-02-17
Scope: Mobile app parity alignment between Inventory and Settings flows, with Settings-only visibility controls preserved.

## What was consolidated

- Shared mode-aware ledgers for Units, Categories, and Discounts (`mode: settings | inventory`).
- Inventory ledger routes converted to thin wrappers that call shared Settings ledger screens.
- Category process screens (`edit`, `archive`, `restore`) consolidated into shared Settings implementations; Inventory routes now wrappers.
- Discount process screens (`edit`, `archive`, `restore`) consolidated into shared Settings implementations; Inventory routes now wrappers.
- Inventory discount detail route actions now use centralized discount navigation builders.

## Validation run

- Mobile lint: pass (`npm run -s lint`).
- Mobile TypeScript full sweep: pass (`npx tsc --noEmit`).
- Targeted diagnostics on wrapper/process files: no errors.

## Governance / UX parity status

- Process screens use deterministic exit behavior in both modes.
- Detail/ledger headers remain mode-correct (Settings vs Inventory header primitives).
- Settings-only visibility management remains limited to Settings ledgers.
- Inventory behavior mirrors Settings where intended, without exposing visibility management controls.

## Manual smoke checklist (recommended before release)

1. Categories: Settings + Inventory detail → edit/archive/restore.
2. Discounts: Settings + Inventory detail → edit/archive/restore (including `returnTo` flows).
3. Ledgers: confirm Inventory wrappers open shared ledger behavior and route back correctly.
4. Visibility: confirm controls appear in Settings ledgers only.

## Sign-off

Status: **Engineering QA pass (static + compile/lint)**
Release readiness: **Ready for device smoke/UAT**
