# ADR-0010: Supabase Storage

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

BizAssist needs a managed media storage pipeline for product and business assets with controlled upload/serving behavior.

---

## Decision

Use Supabase Storage for BizAssist media pipeline.
Server-side media governance resolves bucket/path behavior and client upload contracts.

---

## Consequences

Positive impacts
- centralized media storage model
- consistent upload and retrieval handling

Negative tradeoffs
- requires explicit media governance and access policy discipline

Operational implications
- media API contracts and storage rules must remain centralized and version-safe

---

## Alternatives Considered

- ad hoc per-feature media storage providers: rejected due to inconsistency and operational drift.

---

## Related ADRs

- ADR-0009 Render Hosting
- ADR-0016 Global Busy Overlay
