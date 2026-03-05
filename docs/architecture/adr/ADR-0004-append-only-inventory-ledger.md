# ADR-0004: Append-Only Inventory Ledger

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Inventory systems lose auditability when stock is edited directly.
BizAssist requires traceable stock history for operational and financial confidence.

---

## Decision

Inventory uses an append-only movement ledger.
Direct historical mutation of stock movements is prohibited.
Stock state is derived from movement records.

---

## Consequences

Positive impacts
- full auditability
- historical traceability
- lower silent corruption risk

Negative tradeoffs
- more complex aggregation and query logic

Operational implications
- inventory mutations must be represented as movement events

---

## Alternatives Considered

- mutable current-stock-only model: rejected due to audit and forensic limitations.

---

## Related ADRs

- ADR-0003 UDQI Quantity Model
- ADR-0005 Archive-Only Lifecycle
