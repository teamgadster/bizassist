# Feature One‑Pager Template

Copy this file into `docs/features/<feature-name>.md` before building any feature that adds screens, changes schema, or adds API endpoints.

---

## 1. Summary
**Feature name:**  
**Owner:**  
**Target phase:** (0/1/2/3/4)  
**Status:** Draft / Approved / In Progress / Shipped  

---

## 2. Problem Statement
1–2 sentences describing the user problem and why it matters.

---

## 3. User Story
As a <role>, I want <capability>, so that <outcome>.

---

## 4. Scope

### In scope
- …

### Out of scope
- …

---

## 5. Success Criteria (measurable)
- …
- …

---

## 6. Risks & Guardrails
- Data integrity risks:
- Offline/replay risks:
- Security/privacy risks:
- UX risks:

---

## 7. UX Flow
### Entry points
- …

### Screens involved
- …

### States
- Loading:
- Error + Retry:
- Empty + CTA:
- Partial failure tolerance:

### Irreversible actions
- Confirmations and recovery paths:

---

## 8. Data Model Changes (if any)
- Prisma models/enums impacted:
- Migration notes:
- Backfill strategy (if required):

---

## 9. API Contract
### Endpoints
- Method + path:
- Auth requirements:
- Rate limits:
- Idempotency strategy (if write):

### Request/response shapes
- Request:
- Response:

### Error codes (explicit)
- …

---

## 10. Telemetry & Audit
- Audit events (if applicable):
- Client analytics events:

---

## 11. Rollout Plan
- Feature flag? (yes/no)
- Rollout steps:
- Backout plan:

---

## 12. Definition of Done
Reference `docs/PR_CHECKLIST.md` and add feature-specific items:
- …
