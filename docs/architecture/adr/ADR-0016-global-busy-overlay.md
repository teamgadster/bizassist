# ADR-0016: Global Busy Overlay

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Async writes across forms and process screens can produce duplicate actions and unclear system feedback without a standard processing model.

---

## Decision

Use a global busy/loading overlay model for async write operations.
CTAs must be disabled while busy to prevent duplicate submissions.

---

## Consequences

Positive impacts
- consistent feedback
- improved submission reliability
- reduced duplicate write risk

Negative tradeoffs
- requires discipline to wire all write flows through governed busy paths

Operational implications
- process and mutation flows must integrate busy-state governance by default

---

## Alternatives Considered

- per-screen ad hoc loading behavior: rejected due to inconsistency and duplicate-action risk.

---

## Related ADRs

- ADR-0015 Navigation Law (Back vs Exit)
- ADR-0007 POS Workspace Model
