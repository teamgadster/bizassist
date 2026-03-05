# ADR-0006: Tablet-First Design

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

BizAssist is used in retail operational environments where tablet devices are primary workstations.
Phone support is required but should follow simplified adaptations.

---

## Decision

Adopt tablet-first product architecture.
Design for operational density and workspace efficiency on tablets, with phone-compatible vertical simplification.

---

## Consequences

Positive impacts
- faster operational workflows on primary devices
- better information visibility

Negative tradeoffs
- requires intentional responsive behavior across breakpoints

Operational implications
- all new screens must validate tablet and phone behavior before acceptance

---

## Alternatives Considered

- phone-first architecture: rejected as misaligned with primary operational usage.

---

## Related ADRs

- ADR-0007 POS Workspace Model
- ADR-0008 Inventory-First Strategy
