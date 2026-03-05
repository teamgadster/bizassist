# ADR-0003: UDQI Quantity Model

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Inventory and POS quantities require precise, unit-aware handling across items and services.
Floating-point quantity handling creates precision and consistency risks.

---

## Decision

Adopt UDQI quantity governance for quantity input, transport, storage semantics, and normalization.
Quantity handling must be precision-scale aware per unit definition.

---

## Consequences

Positive impacts
- consistent quantity behavior across modules
- reduced rounding/precision defects

Negative tradeoffs
- additional validation and normalization complexity

Operational implications
- APIs and mobile flows must respect precision scale rules end-to-end

---

## Alternatives Considered

- unrestricted decimal handling without domain governance: rejected due to precision inconsistency risk.

---

## Related ADRs

- ADR-0004 Append-Only Inventory Ledger
- ADR-0008 Inventory-First Strategy
