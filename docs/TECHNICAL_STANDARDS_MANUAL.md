# BizAssist Technical Standards Manual

Status: Canonical (must be followed)
Scope: BizAssist_mobile + BizAssist_api + platform integrations
Date: 2026-03-05
Owner: BizAssist Engineering Standards Agent

---

## Purpose

The Technical Standards Manual defines how engineers build software in BizAssist.

It exists to:
- standardize engineering practices
- reduce architectural drift
- maintain code consistency
- improve maintainability
- prevent engineering shortcuts
- ensure production stability

---

## 1. Code Style Standards

- TypeScript strict mode must be enabled.
- No implicit `any`.
- Explicit return types are required for exported functions.
- Named exports are preferred over default exports.
- Global constants use uppercase naming.
- Files must use consistent naming conventions.

Naming rules:
- `kebab-case` for files
- `camelCase` for variables/functions
- `PascalCase` for components/classes/types

---

## 2. Project Structure Standards

Backend must follow feature-first module structure:
- `src/modules/<feature>/`

Each backend module must contain:
- routes
- service
- repository
- validators
- types

Shared backend utilities must live in:
- `src/lib`
- `src/utils`

Mobile must follow feature-first module structure:
- `src/modules/<feature>/`

---

## 3. API Design Standards

- Versioned routes are mandatory (`/api/v1`).
- Resource naming must be RESTful and ownership-aligned.
- Business-scoped access must be enforced.
- JSON request/response format is required.
- Structured error responses are required.

Canonical error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

HTTP status codes must be semantically correct.

---

## 4. Database Standards

- Prisma schema conventions must be followed.
- UUID primary keys are required for domain entities.
- `createdAt` and `updatedAt` timestamps are required.
- Soft delete/archive patterns are preferred over hard delete for critical entities.
- Business data must be business-scoped.
- Model naming should be singular (`User`, `Business`, `Product`, `Sale`).

Indexes are required for:
- foreign keys
- lookup fields
- frequently filtered columns

---

## 5. Data Integrity Standards

Critical domain rules must be enforced:

Inventory:
- append-only inventory ledger
- no direct stock edits

Units:
- UDQI `precisionScale` governs quantity behavior
- quantity representation must follow fixed-point governance

Lifecycle:
- archive-first lifecycle policy for critical entities

---

## 6. Mobile Application Standards

- `BAIScreen` must wrap screens.
- `BAISurface` must be used for section surfaces.
- No modal/drawer/dropdown-first operational patterns.
- Tablet-first layouts must be respected.
- Global Busy Overlay governs async write operations.

Phone and tablet behavior must remain deterministic.

---

## 7. Navigation Standards

Navigation law is mandatory:
- Back = history navigation
- Exit = abandon process

Tabs represent workspaces.

Tabs must not use unpredictable root-pop behavior in core flows.

---

## 8. Performance Standards

Guidelines:
- avoid unnecessary re-renders
- use memoization when needed
- minimize oversized payloads
- paginate large datasets

Target:
- normal API endpoints should target `< 200ms` under expected operational load.

---

## 9. Security Standards

- Authentication is required for protected routes.
- Active business validation is required for business-scoped operations.
- Input validation is mandatory.
- Rate limiting must be applied where appropriate.
- Sensitive data must never be logged.

---

## 10. Media Pipeline Standards

Image/media handling must follow BizAssist media pipeline:
- in-app image cropping
- normalization before upload
- signed upload URL flow
- deterministic storage paths
- AI background removal optional and preview-assistive only

---

## 11. Logging Standards

Server logging must be structured:
- request logger enabled
- correlation ID attached to requests
- errors logged with stack trace in controlled environments
- no sensitive data in logs

---

## 12. Testing Standards

Critical domain logic must be tested, including:
- POS checkout logic
- inventory adjustments
- price calculations
- discount calculations
- authentication flows

---

## 13. Error Handling Standards

- Centralized error handling is required.
- Use `AppError` conventions for domain and API errors.
- Avoid throwing raw unstructured errors in application flows.
- Error codes and response shapes must be predictable.

---

## 14. Documentation Standards

Major modules/features must be documented for maintainability.

Documentation should cover:
- architecture decisions (ADR)
- major feature flows
- API endpoints
- domain rules

---

## 15. Governance Enforcement

All PRs must satisfy technical standards checks:
- architecture compliance
- naming conventions
- domain-rule enforcement
- ADR alignment
- performance considerations

Code that violates standards must not be merged.

---

## Final Principle

BizAssist engineering is disciplined by default.
Speed without standards creates technical debt.
Standards preserve maintainability, scalability, and predictability as the platform grows.
