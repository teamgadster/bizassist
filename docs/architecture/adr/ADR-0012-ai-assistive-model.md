# ADR-0012: AI Assistive Model

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

AI features can improve productivity but must not weaken deterministic operational correctness.

---

## Decision

AI in BizAssist is assistive-only.
AI may suggest or accelerate workflows, but deterministic system rules remain authoritative.

---

## Consequences

Positive impacts
- productivity gains without sacrificing core correctness

Negative tradeoffs
- requires explicit boundaries between suggestion and system-of-record logic

Operational implications
- AI output must be reviewable and non-authoritative for critical operations

---

## Alternatives Considered

- AI-autonomous decision execution: rejected due to reliability and auditability risks.

---

## Related ADRs

- ADR-0013 AI Excluded From Transactions
