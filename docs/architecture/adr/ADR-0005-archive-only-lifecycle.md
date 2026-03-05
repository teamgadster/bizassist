# ADR-0005: Archive-Only Lifecycle

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Critical operational entities are referenced by transactions and history.
Hard deletion can break historical consistency and auditability.

---

## Decision

Critical entities follow lifecycle states (for example ACTIVE/ARCHIVED) rather than destructive deletion.
Archive/restore is the default lifecycle policy.

---

## Consequences

Positive impacts
- preserves historical integrity
- supports safer operational recovery

Negative tradeoffs
- requires lifecycle-aware query filters

Operational implications
- UI and API flows must implement archive/restore semantics consistently

---

## Alternatives Considered

- hard delete as default behavior: rejected due to data integrity and audit risks.

---

## Related ADRs

- ADR-0004 Append-Only Inventory Ledger
- ADR-0015 Navigation Law (Back vs Exit)
