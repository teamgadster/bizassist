# ADR-0011: AWS SES Email

Status: Accepted
Date: 2026-03-05
Author: BizAssist Architecture

---

## Context

BizAssist requires reliable transactional email delivery for authentication and operational communications.

---

## Decision

Use AWS SES as the transactional email provider for BizAssist.

---

## Consequences

Positive impacts
- reliable managed transactional delivery
- operationally scalable email channel

Negative tradeoffs
- provider-specific setup and compliance requirements

Operational implications
- API auth/email flows must preserve provider-agnostic error handling contracts

---

## Alternatives Considered

- self-managed SMTP delivery: rejected due to lower reliability and higher maintenance.

---

## Related ADRs

- ADR-0009 Render Hosting
