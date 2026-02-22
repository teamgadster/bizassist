# PR Checklist (Definition of Done)

This checklist is mandatory for every BizAssist change that touches UI, API, schema, or behavior.

---

## A) Governance

- [ ] No dropdowns/drawers added to operational flows (Inventory/POS).
- [ ] Tablet adds spatial persistence only (two‑pane/inspector), not hidden interactions.
- [ ] Navigation uses deterministic “hard transitions” for critical flows.

## A.1) Post-Action Navigation Flow Governance

- [ ] Save/Archive/Restore (and equivalent write/lifecycle actions) redirect to one intended destination only.
- [ ] Success path uses deterministic closure (`replace()` / governed back behavior), with explicit completion feedback.
- [ ] Failed actions stay on the current screen/context (no unintended redirect on error).
- [ ] Write/navigation actions are double-tap safe and Busy/Loading Overlay governed.

## B) UI Quality

- [ ] Screen uses `BAIScreen` + primary `BAISurface` container.
- [ ] Canonical chevrons used for drill-in rows: `MaterialCommunityIcons chevron-right size={30}`.
- [ ] Hidden status icon uses `MaterialCommunityIcons` with `name="eye-off"` across management surfaces.
- [ ] Buttons respect disabled/busy states and block double taps.
- [ ] Loading / Error+Retry / Empty+CTA states implemented where applicable.
- [ ] Inputs enforce `FIELD_LIMITS` (no ad-hoc maxLength values).

## B.1) Cognitive-Emotional UX Governance (Required for App + Website)

- [ ] Halo Effect check passed: first viewport communicates value + primary action clearly.
- [ ] Cognitive fluency check passed: one dominant task, reduced decision load, clear labels/copy.
- [ ] Micro-interactions check passed: immediate action feedback, inline validation, clear success/error states.
- [ ] Peak-End check passed: critical flows end with confirmation, closure, and next best action.
- [ ] Evidence attached for affected flows (screens/video of idle/loading/success/error/end states).

## C) Data & Correctness

- [ ] API contracts match mobile types (no drift).
- [ ] Inventory writes are ledger-first (append-only movements).
- [ ] Writes that can repeat are idempotent (idempotencyKey) or have an explicit, justified exception.
- [ ] Rate limiting middleware does not write audits to DB.

## D) Testing & Verification

- [ ] Smoke tested on phone (portrait) and tablet (portrait + landscape).
- [ ] Verified error recovery paths (offline / server error / validation error).
- [ ] Verified “happy path” completes with deterministic navigation result.
- [ ] For Service flow parity changes, attach QA evidence from [docs/SERVICE_FLOW_PARITY_QA_CHECKLIST_2026-02-22.md](docs/SERVICE_FLOW_PARITY_QA_CHECKLIST_2026-02-22.md).

## E) Docs

- [ ] Feature One‑Pager created/updated (if schema/screens/endpoints changed).
- [ ] Masterplan docs updated if behavior/governance changed (rare, requires explicit rationale).
- [ ] If service units/default/pinning changed, `docs/SERVICE_UNIT_CATALOG_SEED.md` is updated and matches mobile/API sources.
