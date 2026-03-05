# ADR-0009: Render Hosting

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

BizAssist requires a managed hosting platform with predictable deployment workflows and operational simplicity.

---

## Decision

Use Render as the primary backend hosting platform for BizAssist API deployment.

---

## Consequences

Positive impacts
- simplified infrastructure operations
- straightforward service deployment model

Negative tradeoffs
- platform-specific operational constraints must be managed

Operational implications
- deployment and runtime configuration must remain Render-compatible

---

## Alternatives Considered

- unmanaged self-hosting stack: rejected due to higher operational burden.

---

## Related ADRs

- ADR-0010 Supabase Storage
- ADR-0011 AWS SES Email
