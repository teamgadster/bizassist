# ADR-0015: Navigation Law (Back vs Exit)

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Mixed navigation semantics in process flows create user confusion and accidental workflow abandonment.

---

## Decision

Adopt the navigation law:
- Back is for screens.
- Exit is for processes.

Process screens use explicit Exit behavior and unsaved-change protections where applicable.

---

## Consequences

Positive impacts
- predictable navigation behavior
- safer process cancellation semantics

Negative tradeoffs
- requires consistent implementation across all process screens

Operational implications
- header and process routing behavior must enforce class-based navigation rules

---

## Alternatives Considered

- uniform Back behavior for all screens including processes: rejected due to ambiguity.

---

## Related ADRs

- ADR-0014 No Modal / Drawer UI Model
- ADR-0016 Global Busy Overlay
