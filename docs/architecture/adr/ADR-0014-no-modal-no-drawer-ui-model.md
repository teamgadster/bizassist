# ADR-0014: No Modal / Drawer UI Model

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Operational catalog and inventory workflows become fragmented when overusing modals and drawers.
BizAssist requires clear, deterministic drill-in flows.

---

## Decision

Use full-screen drill-in patterns as default for operational configuration flows.
Avoid modal/drawer dependency for core operational authoring.

---

## Consequences

Positive impacts
- clearer navigation context
- reduced interaction ambiguity

Negative tradeoffs
- may require additional navigation steps for some actions

Operational implications
- screen architecture must prioritize deterministic process transitions

---

## Alternatives Considered

- modal/drawer-heavy operational UI: rejected for context fragmentation and complexity.

---

## Related ADRs

- ADR-0015 Navigation Law (Back vs Exit)
- ADR-0006 Tablet-First Design
