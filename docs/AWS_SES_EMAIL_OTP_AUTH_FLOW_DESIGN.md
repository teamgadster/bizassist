# BizAssist AWS SES Email OTP Flow Design (Auth)

## 1. Summary
- Feature: AWS SES Email OTP flow for authentication.
- Scope: OTP-first registration, verification, resend, login gate for unverified users, forgot-password OTP, and reset-password ticket handoff.
- Status: Implemented in existing feature-first architecture; documented and validated.

## 2. Architecture Fit (Feature-First)

### API (authoritative)
- Auth module: `/Users/gerardogaden/Desktop/bizassist/api/src/modules/auth`
- SES provider: `/Users/gerardogaden/Desktop/bizassist/api/src/lib/email/mailer.ts`
- OTP email composition: `/Users/gerardogaden/Desktop/bizassist/api/src/modules/auth/emailOtp.mailer.ts`
- Env/config governance: `/Users/gerardogaden/Desktop/bizassist/api/src/core/config/env.ts`
- Data model: `/Users/gerardogaden/Desktop/bizassist/api/prisma/schema.prisma`

### Mobile
- Auth API contracts: `/Users/gerardogaden/Desktop/bizassist/mobile/src/modules/auth/auth.api.ts`
- Auth session flow: `/Users/gerardogaden/Desktop/bizassist/mobile/src/modules/auth/AuthContext.tsx`
- Auth screens:
  - `/Users/gerardogaden/Desktop/bizassist/mobile/app/(auth)/register.tsx`
  - `/Users/gerardogaden/Desktop/bizassist/mobile/app/(auth)/verify-email.tsx`
  - `/Users/gerardogaden/Desktop/bizassist/mobile/app/(auth)/login.tsx`
  - `/Users/gerardogaden/Desktop/bizassist/mobile/app/(auth)/forgot-password.tsx`
  - `/Users/gerardogaden/Desktop/bizassist/mobile/app/(auth)/reset-password.tsx`
- Global loading overlay path: `/Users/gerardogaden/Desktop/bizassist/mobile/src/providers/AppBusyProvider.tsx`

## 3. End-to-End Flow

### A. Registration OTP (OTP-first)
1. Client posts `POST /auth/register` with name/email/password.
2. API normalizes email, creates or resumes unverified user.
3. API generates numeric OTP, hashes OTP, persists in `EmailOtp` (`REGISTER` purpose).
4. API sends OTP via SES (`sendRegisterOtpEmail` -> SES `SendEmailCommand`).
5. API returns `requiresEmailVerification=true` with cooldown/expiry metadata.
6. Mobile routes to verify screen.

### B. Verify Email OTP
1. Client posts `POST /auth/verify-email` with `email`, `code`, `purpose`.
2. API validates OTP hash, attempts, TTL.
3. API marks user verified (if needed), deletes OTP record.
4. API issues access+refresh tokens.
5. Mobile applies auth session and proceeds to bootstrap.

### C. Resend OTP
1. Client posts `POST /auth/resend-otp`.
2. API enforces cooldown + hourly cap.
3. API sends new OTP via SES for same purpose.
4. API returns resend metadata (`sent`, cooldown remaining, cap state).

### D. Login Gate for Unverified Accounts
1. Client posts `POST /auth/login`.
2. If credentials are valid but email is unverified, API blocks login with `EMAIL_VERIFICATION_REQUIRED`.
3. API triggers OTP dispatch with guards.
4. Mobile redirects to verify-email with returned metadata.

### E. Forgot Password OTP
1. Client posts `POST /auth/forgot-password`.
2. API returns anti-enumeration-safe success response.
3. If verified account exists, API sends `PASSWORD_RESET` OTP via SES.
4. Client verifies OTP at `POST /auth/verify-password-reset-otp`.
5. API issues short-lived reset ticket.
6. Client posts `POST /auth/reset-password` with ticket + new password.
7. API updates password, revokes refresh sessions, bumps token version.

## 4. API Contract (Current)

### Public endpoints
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-otp`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/verify-password-reset-otp`
- `POST /auth/reset-password`
- `POST /auth/refresh`

### Protected endpoints
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/logout-all`

### Explicit OTP/domain errors
- `INVALID_OR_EXPIRED_OTP`
- `OTP_TOO_MANY_ATTEMPTS`
- `EMAIL_VERIFICATION_REQUIRED`
- `RATE_LIMITED`
- `EMAIL_PROVIDER_ERROR` (service unavailable class)
- `RESET_TICKET_INVALID_OR_EXPIRED`

## 5. Data Model

### `EmailOtp`
- Keyed by `(userId, purpose)`
- Stores `codeHash`, `expiresAt`, `attempts`, `lastSentAt`
- Purposes: `REGISTER`, `PASSWORD_RESET`, `CHANGE_EMAIL`

### `PasswordResetTicket`
- Stores hashed ticket (`tokenHash`), expiry, and usage state
- One-time use enforced

## 6. SES Integration Design
- SDK: `@aws-sdk/client-sesv2`
- API: SES v2 `SendEmailCommand`
- Configured via:
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (optional if runtime role credentials are used)
  - `SES_FROM_EMAIL`
  - `SES_CONFIGURATION_SET` (optional)
  - `EMAIL_REPLY_TO` (optional)
- Failure behavior:
  - Provider failures are mapped to service-unavailable class to avoid leaking provider internals.

## 7. Governance Compliance
- No UI layout rewrite performed; existing auth screens stay on BAI primitives (`BAIScreen`, `BAISurface`, `BAITextInput`, `BAIButton/BAICTAButton`).
- Async operations use global Loading Overlay via `withBusy(...)`.
- Feature-first structure preserved: auth logic remains in auth module; no cross-cutting abstractions introduced.
- UDQI/Units/Categories/POS/navigation governance untouched by this auth email OTP flow.
- Existing React Query patterns preserved for data modules; auth continues using established `AuthContext` session orchestration pattern.

## 8. Minimal Implementation Delta Applied
- No OTP architecture rewrite was needed; flow already matched masterplan constraints.
- To satisfy repo-wide TypeScript compile constraints, only minimal compile-fix edits were applied:
  - Added missing import in `/Users/gerardogaden/Desktop/bizassist/mobile/src/modules/options/screens/OptionSetUpsertScreen.tsx`
  - Tightened type annotation in `/Users/gerardogaden/Desktop/bizassist/mobile/src/modules/options/screens/ProductCreateVariationsScreen.tsx`

## 9. Validation
- API compile: `npm run build` passed in `/Users/gerardogaden/Desktop/bizassist/api`
- Mobile compile: `npx tsc --noEmit` passed in `/Users/gerardogaden/Desktop/bizassist/mobile`
- Result: zero TypeScript errors in current workspace state.

