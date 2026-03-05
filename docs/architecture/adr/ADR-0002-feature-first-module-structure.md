# ADR-0002: Feature-First Module Structure

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

Layer-based structures scatter ownership and make feature evolution difficult across API and mobile.
BizAssist requires clear ownership and navigable code boundaries.

---

## Decision

Use feature-first module structure:
- API: `src/modules/<feature>/`
- Mobile: `src/modules/<feature>/`

Canonical backend module internals:
- controller
- service
- repository
- routes
- validators
- types

---

## Consequences

Positive impacts
- clearer ownership
- easier onboarding
- reduced architectural drift

Negative tradeoffs
- refactoring legacy layer-based remnants requires coordinated cleanup

Operational implications
- PR review must reject cross-feature leakage and unclear ownership

---

## Alternatives Considered

- Layer-first primary structure: rejected for ownership ambiguity and coupling risk.

---

## Related ADRs

- ADR-0001 Modular Monolith Architecture
