# ADR-0008: Inventory-First Strategy

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

BizAssist core value depends on accurate sellable management and stock integrity.
Inventory definitions must remain authoritative for POS consumption.

---

## Decision

Adopt an inventory-first product strategy.
Inventory owns sellable lifecycle and stock state; POS consumes inventory-defined data.

---

## Consequences

Positive impacts
- consistent sellable definitions
- reduced cross-module mutation conflicts

Negative tradeoffs
- requires strict ownership boundaries in API and mobile flows

Operational implications
- POS must not directly own inventory definition mutations

---

## Alternatives Considered

- shared mutation ownership across POS and Inventory: rejected due to ownership ambiguity.

---

## Related ADRs

- ADR-0001 Modular Monolith Architecture
- ADR-0004 Append-Only Inventory Ledger
