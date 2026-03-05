# ADR-0013: AI Excluded From Transactions

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Transactional and inventory operations require strict determinism, auditability, and idempotent behavior.

---

## Decision

AI is excluded from transactional write authority.
AI must not execute autonomous inventory, checkout, or financial mutations.

---

## Consequences

Positive impacts
- protects transaction integrity
- maintains predictable audit trails

Negative tradeoffs
- limits automation in critical paths

Operational implications
- transactional workflows must remain deterministic and rule-driven

---

## Alternatives Considered

- AI-authorized transaction writes: rejected due to correctness and compliance risk.

---

## Related ADRs

- ADR-0012 AI Assistive Model
- ADR-0004 Append-Only Inventory Ledger
