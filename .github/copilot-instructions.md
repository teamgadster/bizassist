# Copilot Instructions

## Repo layout

- api/ is an Express + Prisma API. Routes are composed in src/modules/index.ts and mounted under /api/v1 in src/app.ts.
- mobile/ is an Expo Router app. File-based routes live under app/, shared logic under src/.
- Both apps use a @/ path alias (api tsconfig baseUrl=src, mobile tsconfig baseUrl=.).

## API patterns (api/)

- Modules follow routes/controller/service/repository/validators; see src/modules/auth and src/modules/catalog for examples.
- Standard success envelope is { success: true, data }. Errors should flow through AppError + errorHandler so clients get { success:false, error:{code,message} } (mobile expects error.code).
- Auth uses Bearer tokens via authMiddleware in src/core/middleware/auth.ts. Business-scoped routes require X-Active-Business-Id and often add requireActiveBusiness.
- Supabase media is server-governed: buckets are resolved on the server (SUPABASE*STORAGE*\* in src/core/config/env.ts). Clients must not choose buckets; use media service patterns in src/modules/media.
- Prisma uses the Pg adapter + pooled client in src/lib/prisma.ts; server startup/shutdown is in src/server.ts.

## Mobile patterns (mobile/)

- Expo Router groups: app/(system)/bootstrap.tsx is the auth/business gate; routes live in (auth), (onboarding), (app)/(tabs).
- Auth session is single-flight refresh with MMKV token storage (src/modules/auth/auth.session.ts, src/lib/storage/mmkv.ts). Avoid clearAll on logout; use the helpers.
- HTTP client attaches Authorization and X-Active-Business-Id headers and retries on 401 for non-auth routes (src/lib/api/httpClient.ts).
- API base URL resolution uses EXPO_PUBLIC_API_BASE_URL, otherwise derives from Expo host IP; Android emulator uses 10.0.2.2 (src/lib/api/baseUrl.ts).

## Developer workflows

- API: npm run dev | test | build | prisma:generate | prisma:deploy (api/package.json).
- Mobile: npm run start | start:dev | start:android | android (mobile/package.json). Android reverse port helpers exist in scripts.
