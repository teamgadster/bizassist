## 2026-02-22 — Modifiers Feature Flow Design (Masterplan + Memory)

### Memory Lock

- Modifiers feature flow is finalized and locked to the masterplan.
- Feature enables creation, editing, deletion of modifier sets and modifiers, price and availability toggling (including "Sold out"), and application to items/services.
- API and mobile implementation must be feature-first, with no new abstractions or UI layout changes.
- All async actions must use Loading Overlay; all data via React Query; all navigation and state must respect governance (UDQI, Units, Categories, POS, Navigation).
- Tablet-first UI codex (BAISurface, BAIScreen, etc.) is mandatory.
- All flows must compile with zero TypeScript errors.
- UX governance: Halo Effect, Cognitive Fluency, Peak-End Rule, immediate feedback, one dominant job per screen, clear closure.
- See `docs/features/modifiers.md` for full design and implementation plan.

## 2026-02-21 — Button Shape Governance Locked (Masterplan + Implementation)

### Memory Lock

Button Shape Governance locked: full-width CTAs must use rounded rectangle radius; pill shape allowed only for compact/short-width buttons via explicit opt-in prop; full-width pill attempts auto-fallback to rounded with DEV warning. This rule is non-negotiable and masterplan-locked.

## 2026-02-19 — AWS SES Install/Setup/Implementation Docs Refresh (Welcome + Developer Guide)

### Summary

Refresh AWS SES memory from current docs for installation prerequisites, account setup, and implementation paths.

### Locked Rules (AWS SES)

- **Install prerequisites**
  - Start with an AWS account, then configure programmatic access before coding against SES.
  - Preferred auth path is IAM/IAM Identity Center temporary credentials for CLI/SDK usage; long-term IAM user keys remain not recommended.
  - Install and configure AWS CLI for account/bootstrap automation and install an AWS SDK for application integration.

- **Initial SES setup**
  - Use the SES **Get started** account setup wizard when no SES identities exist yet (wizard is shown only before first identity creation).
  - First setup flow should verify at least one sender identity (email or domain) and then request production access.
  - New SES accounts begin in the sandbox per Region.

- **Sandbox and production access**
  - Sandbox limits remain: send only to verified identities or mailbox simulator, `200` recipients/24h, `1` recipient/sec.
  - Request production access in SES console (`Account dashboard` -> `View Get set up page` -> `Request production access`) or via CLI `sesv2 put-account-details`.
  - AWS Support states an initial response target within 24 hours after submission.

- **Identity strategy**
  - Domain identity is preferred for production; email identity is fastest for initial validation/testing.
  - Advanced sending use cases (configuration sets, delegate policies, per-address overrides) require explicit email-address verification even when domain inheritance exists.
  - Identity verification is Region-scoped; verify separately per Region.
  - Identity quota remains up to `10,000` verified identities per Region.

- **Implementation path (sending email)**
  - Console sending is best for testing/manual checks; production/bulk flows should use SMTP interface or SES API.
  - Quotas are recipient-based (not message-based); prefer one recipient per send call to avoid all-recipient rejection on API failure.
  - Max recipients per message: `50`.
  - Message size limits: SES v1 API `10 MB`; SES v2 API and SMTP `40 MB` (including attachments, after base64).
  - SMTP requirements: Regional SMTP endpoint + port, Region-specific SMTP credentials (not AWS access keys), TLS-capable client, verified sender identity.
  - API integration options: direct HTTPS (manual signing), AWS SDK (recommended for auth/retry/error handling), or AWS CLI/PowerShell.
  - API composition modes: formatted email (SES builds MIME), raw email (caller provides full MIME), and templated sends.

### BizAssist Implementation Notes (SES)

- Keep SES integration server-side in `/Users/gerardogaden/Desktop/bizassist/api` only; no direct send path from mobile clients.
- Continue using SES API v2 for new sending code and enforce app-level throttling by recipient count.
- Treat each deployment Region as its own SES setup checklist (identities, sandbox/production state, quotas, SMTP creds).

### Source Snapshot (Reviewed 2026-02-19)

- `https://docs.aws.amazon.com/ses/latest/dg/Welcome.html`
- `https://docs.aws.amazon.com/ses/latest/dg/setting-up.html`
- `https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html`
- `https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html`
- `https://docs.aws.amazon.com/ses/latest/dg/send-email.html`
- `https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html`
- `https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html`
- `https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html`
- `https://docs.aws.amazon.com/ses/latest/dg/quotas.html`

## 2026-02-17 — AWS Backend + SES Setup Governance (Docs Refresh)

### Summary

Lock current AWS implementation guidance for BizAssist backend hosting and SES transactional email so setup remains region-correct, production-safe, and least-privilege.

### Locked Rules (AWS)

- **Region + scope**
  - Keep API runtime, PostgreSQL, and SES in the same primary region when possible.
  - Default region for this workspace remains `ap-southeast-1` unless architecture explicitly changes it.
  - SES identities, sending quotas, and service quotas are region-scoped; setup is repeated per region.

- **SES account bootstrap and production gate**
  - Use SES account setup wizard for first-time setup (only shown before any identities exist).
  - Treat sandbox state as non-production: can send only to verified identities/mailbox simulator, max `200` messages/24h, max `1` message/sec, suppression-list bulk/API controls limited in sandbox.
  - Production email go-live is blocked until production access request is approved and required sender identities are verified.
  - Keep rollout policy that email features are feature-flagged off in production until SES production access + auth records are complete.

- **SES identity and auth posture**
  - Prefer domain identity over single-address identity for production.
  - Domain verification supports Easy DKIM (default, 2048-bit by default), BYODKIM, and DEED for global replica identities.
  - DNS verification can take up to 72 hours to propagate; plan rollout timing accordingly.
  - Configure SPF + DKIM + DMARC alignment before live traffic.
  - If using custom MAIL FROM, define explicit MX failure behavior (`fallback to amazonses.com` vs `reject`).
  - Each region supports up to `10,000` verified identities (domain + address mix).

- **SES sending and observability implementation**
  - Enforce app-level send throttling by recipient count (SES quotas are recipient-based, not message-based).
  - Single send request must stay within current documented SES constraints (verified sender, max 50 recipients, size cap: SES v1 API 10 MB, SES v2 API/SMTP 40 MB).
  - Wire event publishing through configuration sets, with explicit event destination(s) (CloudWatch, Firehose, EventBridge, Pinpoint, or SNS), and always pass configuration set on send path.
  - Use mailbox simulator for deterministic bounce/complaint/delivery testing during integration; simulator uses sending rate limits but does not consume daily quota.

- **Backend hosting default path (AWS)**
  - Default managed path: **App Runner** for HTTP API.
  - Control path when deeper runtime/network control is required: **ECS + Fargate**.
  - Database: **RDS PostgreSQL**, private by default (`Public access = No` unless explicitly required for a controlled admin path).

- **App Runner network/runtime rules**
  - Use private subnets for VPC connector egress; selecting public subnets for connector causes errors.
  - When attaching VPC connector, account for one-time cold startup latency (2-5 minutes on first connector setup).
  - Select subnets across at least 3 AZs where available for HA.
  - App Runner VPC egress removes direct internet/AWS API access unless NAT gateway or VPC endpoints are configured.
  - Configure health checks explicitly (defaults are TCP, interval 5s, timeout 2s).

- **App Runner IAM and secrets**
  - For ECR private image sources, require App Runner access role; ECR Public does not require access role.
  - Access role trust principal: `build.apprunner.amazonaws.com`.
  - Application AWS API calls require App Runner instance role with least privilege.
  - Instance role trust principal: `tasks.apprunner.amazonaws.com`.
  - Manage runtime secrets via Secrets Manager or SSM references; do not store raw secrets in repo.
  - `PORT` is reserved in App Runner and cannot be used as an env var name.
  - Secret/parameter value changes are not auto-refreshed; redeploy required to pull new values.

- **App Runner deployment behavior**
  - `apprunner.yaml` config file applies only to source-code services, not image-based services.
  - After service creation, source type cannot be switched between code and image.
  - `ServiceName` and `EncryptionConfiguration` are immutable after create.

- **ECS + Fargate control-path rules (when used)**
  - Separate IAM task role (app AWS API calls) from task execution role (agent operations like pulling ECR, pushing logs, fetching secret refs).
  - Prefer `awsvpc` mode for task-level SG control.
  - With `awsvpc`, ALB/NLB target groups must use target type `ip`.
  - `awsVpcConfiguration` limits: up to 16 subnets and 5 security groups.

### BizAssist Implementation Notes (AWS Path)

- API (`/Users/gerardogaden/Desktop/bizassist/api`) can be deployed to App Runner first; server must bind `0.0.0.0:${PORT}`.
- PostgreSQL migrations should remain release/deploy-step controlled; DB access should stay private by default.
- Implement SES provider in backend only (mobile never sends directly).
- For Node implementation, prefer SES API v2 send path (`SendEmail`) with explicit `ConfigurationSetName` + message tags.
- Preserve existing API contract and auth/business scoping behavior (`X-Active-Business-Id`) during infra migration.

### Source Snapshot (Reviewed 2026-02-17)

- SES setup and production access:
  - `https://docs.aws.amazon.com/ses/latest/dg/setting-up.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/quotas.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-using-event-publishing-setup.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/event-publishing-add-event-destination.html`
  - `https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html`
  - `https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html`
- AWS SDK/implementation constraints:
  - `https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/ses-examples-sending-email.html`
- App Runner:
  - `https://docs.aws.amazon.com/apprunner/latest/dg/manage-create.html`
  - `https://docs.aws.amazon.com/apprunner/latest/dg/manage-configure.html`
  - `https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html`
  - `https://docs.aws.amazon.com/apprunner/latest/dg/manage-configure-healthcheck.html`
  - `https://docs.aws.amazon.com/apprunner/latest/dg/env-variable.html`
  - `https://docs.aws.amazon.com/apprunner/latest/dg/config-file.html`
  - `https://docs.aws.amazon.com/apprunner/latest/dg/security_iam_service-with-iam.html`
- ECS:
  - `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html`
  - `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html`
  - `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-network.html`
  - `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html`
- RDS PostgreSQL:
  - `https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html`
  - `https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.Settings.html`

## 2026-02-17 — Render Backend Setup Governance (Latest Docs Snapshot)

### Summary

Lock current Render platform guidance for deploying and operating backend services (API + Postgres + workers) so BizAssist setup remains correct over time.

### Locked Rules (Render)

- **Service type selection**
  - Use **Web Service** for publicly reachable API endpoints.
  - Use **Private Service** for internal-only services that must receive network traffic over Render private network.
  - Use **Background Worker** for async processors that do not receive inbound network traffic.

- **Web service binding and startup**
  - Web services must bind on host `0.0.0.0`.
  - Bind HTTP server to `PORT` env var (default expected `10000`).
  - Health endpoint should be configured via `healthCheckPath` (Dashboard or `render.yaml`).

- **Health check behavior**
  - Render health checks are HTTP `GET`; `2xx/3xx` is healthy.
  - Non-`2xx/3xx` or timeout (~5s) is failed.
  - During deploys, prolonged failed health checks can cancel deploy and keep prior version serving.
  - For running services, sustained failures can remove instance from routing and trigger restart.

- **Deploy pipeline and commands**
  - Deploy order is: `buildCommand` -> optional `preDeployCommand` -> `startCommand`.
  - Use `preDeployCommand` for DB migrations and other release tasks.
  - For this repo’s API, migration step belongs in pre-deploy (e.g., Prisma deploy migration command), not in runtime request path.

- **Filesystem and persistence**
  - Service filesystem is ephemeral by default; do not store durable app data locally.
  - Durable state belongs in managed datastores (Postgres/Key Value) or explicit persistent disks.

- **Postgres connectivity and regioning**
  - Prefer **internal database URL** for Render-to-Render traffic in same account+region.
  - Keep API and Postgres in the same region to reduce latency and use private networking.
  - External DB URL is for off-platform/admin access and is slower over public internet.

- **Postgres access and capacity notes**
  - External DB access can be restricted with CIDR allowlists; internal same-region connectivity remains available via internal URL.
  - Track connection limits by instance memory tier; use pooling or larger instance when approaching limits.
  - Storage can be increased (not decreased); autoscaling increases at high utilization.

- **Environment variables and secrets**
  - Never hardcode secrets in code or committed infra config.
  - Use service env vars and/or environment groups for shared config.
  - Service-level env vars override group values when key collisions occur.
  - In Blueprints, use `sync: false` placeholders for secrets and populate in Dashboard.
  - Secret files are supported and mounted at runtime (and should be treated as sensitive plaintext).

- **Blueprint (`render.yaml`) governance**
  - Prefer Blueprint IaC for reproducible multi-service setup.
  - Use `services`, `databases`, and `envVarGroups` with explicit runtime/build/start commands.
  - Use `fromDatabase.property: connectionString` and `fromService` references instead of duplicating connection secrets.
  - Use `autoDeployTrigger` (`commit`, `checksPass`, `off`) explicitly per service.

### BizAssist Implementation Notes

- API (`api/`) should run as a Render **Web Service** with explicit health check path and deterministic pre-deploy migration command.
- Managed PostgreSQL should be Render Postgres in same region; app should consume internal connection string via env var.
- Any asynchronous heavy processing should be split into a **Background Worker** service.

### Source Snapshot

- Reviewed Render docs sections: web services, deploys, health checks, private services, background workers, environment variables/secrets, Postgres create/connect, and Blueprint spec.
- Primary refs:
  - `https://render.com/docs/web-services`
  - `https://render.com/docs/deploys`
  - `https://render.com/docs/health-checks`
  - `https://render.com/docs/configure-environment-variables`
  - `https://render.com/docs/postgresql-creating-connecting`
  - `https://render.com/docs/blueprint-spec`

## 2026-02-17 — Inventory/Settings Parity Sign-off Linked

- Reference sign-off: [docs/INVENTORY_SETTINGS_PARITY_SIGNOFF_2026-02-17.md](docs/INVENTORY_SETTINGS_PARITY_SIGNOFF_2026-02-17.md)
- Related PR/commit: _TBD_

## 2026-02-16 — Archive Default Icon Locked

### Summary

Lock the default Archive icon for management surfaces moving forward.

### Locked Rule

- Archive default icon must be `MaterialCommunityIcons` with `name="archive-outline"`.

Canonical snippet:

- `import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';`
- `<MaterialCommunityIcons name="archive-outline" size={24} color="black" />`

## 2026-02-16 — Canonical Service Unit Catalog Reference Locked

### Summary

Lock a single reviewer-facing reference for approved service units, default behavior, and seed/runtime sync rules.

### Locked Rule

- Service unit behavior and approved list must be reviewed against:
  - `docs/SERVICE_UNIT_CATALOG_SEED.md`
- Any service-unit change must stay synchronized across:
  - `mobile/src/features/units/serviceUnitCatalog.ts`
  - `api/src/modules/units/serviceUnitCatalog.seed.ts`
  - `mobile/app/(app)/(tabs)/inventory/units/picker.tsx`
  - `mobile/app/(app)/(tabs)/inventory/services/create.tsx`

## 2026-02-13 — React Query StaleTime Tiering Governance Locked

### Summary

Lock query freshness policy by feature intent so operational flows stay responsive while settings/admin flows reduce unnecessary refetch load.

### Locked Rule

- `staleTime` is a cache-freshness control, not a polling interval.
- Use tiered defaults:
  - **Operational screens (near-real-time inventory/POS/unit stock movement):** `30_000`
  - **Shared/default reference data (general read models):** `120_000`
  - **Settings/admin management flows (low-churn configs):** `300_000`
  - **Long-lived metadata:** `24 * 60 * 60 * 1000`
- If true near-real-time is required across devices, prefer event-driven invalidation (or websockets). Only keep `30_000` where operational correctness/latency needs justify it.

## 2026-02-13 — Process Wording + Badge Token + Swatch A11y Governance Locked

### Summary

Lock wording and visual consistency across Category/Discount process surfaces, and enforce accessible color swatch labels.

### Locked Rules

- Process-screen wording convention:
  - Header-left for process screens uses **Close** semantics (X / Exit).
  - In-card secondary action uses **Cancel**.
  - **Back** is reserved for detail/picker/history navigation, not process cancel intent.
- Badge text token consistency:
  - Badge text color uses `theme.colors.onSurfaceVariant ?? theme.colors.onSurface`.
  - Visibility badge wording uses compact count with scope labels:
    - `ALL`, `VISIBLE`, `HIDDEN`
  - Avoid mixing `TOTAL`/noun-heavy variants when the sibling surfaces use scope-only labels.
- Category color swatch accessibility:
  - Swatches must expose human-readable accessibility labels (e.g., `Blue`, `No Color`).
  - Swatches must announce selected state and disabled state.
  - Swatches should provide a short action hint (e.g., double tap to select).

## 2026-02-13 — Count Label Pluralization Locked

### Summary

Lock count label/title behavior across the app so singular and plural text always match the numeric count.

### Locked Rule

- Any count label/title must be dynamic:
  - `1` uses singular
  - `0` and values greater than `1` use plural
- Applies to badges, pills, headers, and inline count text.
- Compact number formats must still follow correct label plurality.

Canonical examples:

- `1 ITEM`
- `2 ITEMS`
- `1.2K ITEMS`

## 2026-02-12 — Discount Default Icon Locked

### Summary

Lock the default Discount icon for management surfaces moving forward.

### Locked Rule

- Discount default icon must be `Ionicons` with `name="pricetag-outline"`.

Canonical snippet:

- `import Ionicons from '@expo/vector-icons/Ionicons';`
- `<Ionicons name="pricetag-outline" size={24} color="black" />`

## 2026-02-12 — Category Default Icon Locked

### Summary

Lock the default Category icon for management surfaces moving forward.

### Locked Rule

- Category default icon must be `Ionicons` with `name="layers-outline"`.

Canonical snippet:

- `import Ionicons from '@expo/vector-icons/Ionicons';`
- `<Ionicons name="layers-outline" size={24} color="black" />`

## 2026-02-12 — Discounts Visibility Restore Icon Locked

### Summary

Lock the restore action icon in Discounts Visibility for all future implementation.

### Locked Rule

- Restore action icon must be `MaterialCommunityIcons` with `name="eye"`.

Canonical snippet:

- `import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';`
- `<MaterialCommunityIcons name="eye" size={24} color="black" />`

## 2026-02-12 — Icon Governance Locked: Archived + Hidden Defaults

### Summary

Lock default status icons for Categories and Discounts management surfaces.

### Locked Defaults

- Archived uses `MaterialCommunityIcons` with `name="archive-outline"`.
- Hidden uses `MaterialCommunityIcons` with `name="eye-off"`.

Canonical snippets:

- `import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';`
- `<MaterialCommunityIcons name="archive-outline" size={24} color="black" />`
- `<MaterialCommunityIcons name="eye-off" size={24} color="black" />`

### Precedence Rule

- If an item is both archived and hidden, archived icon/state representation takes precedence.

## 2026-02-11 — Discounts Navigation Governance Locked: Settings Edit Save Redirect

### Summary

Fix and lock post-save navigation behavior for **Settings → Discounts → Edit**.

### Locked Rule

- After successful save in `mobile/app/(app)/(tabs)/settings/discounts/[id]/edit.tsx`, navigation must redirect to the settings discounts ledger route:
  - `/(app)/(tabs)/settings/discounts`
- This behavior must mirror the inventory discount edit-save flow: deterministic post-save replace to ledger.

### Implementation Governance

- Use nav-lock-safe replace for save redirects (`safeReplace`) to prevent duplicate navigation and race conditions.
- Process-screen back interception must only guard back/pop actions and must not block successful save redirect replaces.

## 2026-02-11 — Governance Locked: Short Note + Global Text Hygiene

### Summary

Lock Short Note behavior and global text-input hygiene across Mobile + API.

### Short Note Rules (Locked)

- Max length: **200** characters.
- UI behavior: show **2 visible lines**, auto-grow to approximately **4 lines**, then scroll inside the field.
- Validation: no regex rejection beyond hygiene transforms.

### Required Hygiene Pipeline (Global)

- Apply to all user-editable text fields: names, descriptions, notes, labels, and similar text inputs.
- Strip non-printable ASCII control characters as a silent hygiene step.
- Permit newline/tab only where the field supports it (e.g., multiline notes).
- Allow normal text, punctuation, and emoji.
- Run hygiene on Mobile (while typing and/or at submit) and in API (Zod preprocess).
- Do not expose control-character filtering as a regex/user-facing format error.

## 2026-02-10 — Media Delivery Governance Locked: Public vs Private (Supabase)

### Decision

Adopt **Option 1** for Supabase delivery: make `product-media` bucket **PUBLIC** and deliver product images via stable public URLs (no signed tokens) to enable CDN + `expo-image` disk caching and eliminate tile/list rendering delays.

### Tiered Delivery Policy (by MediaKind)

- **Public:**
  - `product-image` → `product-media` (PUBLIC)
  - `business-logo`, `business-cover` → `business-assets` (PUBLIC by default)
- **Private (signed URLs only when needed):**
  - `user-avatar`, `user-cover` → `user-media` (PRIVATE by default)

### Non-negotiable Rules

1. Never sign what you do not need to protect.
2. Public buckets must return stable `getPublicUrl(path)` URLs.
3. If private signed URLs are used, the API must cache and reuse signed URLs per `{bucket,path}` until near expiry (do not rotate per read).
4. Public image cache headers must be aggressive for immutable assets.
5. Mobile uses `expo-image` with disk cache for list/tile surfaces; web consumes the same delivery URLs.

## 2026-02-05 — Feature Design Locked: Edit POS Tile (Create Item Flow)

### Summary

Create an **Edit POS Tile** process screen within the Inventory → Create Item flow. This screen allows the user to set the POS tile label, select either a tile image or a tile color, and return to the Create Item screen with the updated preview. The design is locked and must be implemented as approved.

### Canonical User Flow

1. Create Item screen → tap **Edit POS tile**.
2. Edit POS Tile screen (process):
   - Title: “Edit POS tile”
   - Field: Tile label
   - Tabs: **Image** | **Color**
3. Image tab:
   - **Choose from library** → Photo Library screen
   - **Take photo** → Camera → Crop screen
   - **Remove image** enabled only when an image exists
4. Photo library selector (OS):
   - Deep discovery across albums/folders.
   - Select an asset (returns asset URI).
   - Continue → Crop screen.
   - No preview, no editing, no upload here.
5. Recent photos selector (BizAssist):
   - Fast grid for the latest captures.
   - Select an asset (returns asset URI).
   - Continue → Crop screen.
   - No preview, no editing, no upload here.
6. Crop screen:
   - Crop, **Use photo**
   - Return to **Edit POS Tile** (not Create Item); user must tap **Save**, then return to Create Item
7. Create Item shows image preview; remove image disabled when no image is set.

### Ownership (API + Modules)

**Catalog module owns POS tile fields**:

- `posTileMode` ("COLOR" | "IMAGE")
- `posTileColor` (hex or null)
- Optional `posTileLabel` (if separate from product name)

**Media module owns image upload/commit**:

- Existing product image pipeline applies after product creation.

**Inventory module remains ledger-only**:

- Do not add tile fields or behavior to inventory ledger logic.

### Mobile Screens Required/Affected

Required new screens:

- `mobile/app/(app)/(tabs)/inventory/products/pos-tile.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile.phone.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile.tablet.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-photo-library.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-recents.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-crop.tsx`

Affected:

- `mobile/app/(app)/(tabs)/inventory/products/create.tsx`
- `mobile/src/modules/inventory/drafts/productCreateDraft.ts` (store tile mode/color/label/image uri)
- `mobile/src/modules/inventory/inventory.types.ts` + `mobile/src/modules/catalog/catalog.types.ts`

### Governance/Constraints

- **Tablet-first**: Must add `screen.tsx`, `screen.phone.tsx`, `screen.tablet.tsx` variants.
- **No dropdowns/drawers** in operational flows.
- **Deterministic navigation**: use `replace()`/returnTo params; no ambiguous back behavior.
- **Busy overlay + double-tap prevention**: apply for Save/upload actions.
- **Media governance**: use product image pipeline; client does not choose buckets.
- **Input validation**: apply strict regex only to format-specific fields (POS tile label, SKU/barcode).
  Product name/description should not be over-restricted. POS tile label is limited to 6 chars, letters/numbers/spaces only.
- **Text input hygiene**: always apply appropriate sanitation (trim, normalize), regex, and validators for text inputs across all components.

### Do Not Touch

- Inventory ledger logic and UDQI quantity behavior.
- POS layout lock and POS UI structure.
- Media governance rules and upload pipeline constraints.

---

## 2026-02-05 — Feature Design Locked: Custom Expo Cropper (Inventory Image Upload)

### Summary

Build a **custom in‑app cropper** for Expo 54 (no third‑party cropper). It is used in the **Inventory → Create Item → POS Tile** image flow. The cropper generates a **local cropped image** that is later uploaded via the existing Media module pipeline. This is a design‑locked feature.

### Canonical User Flow

1. Create Item → Edit POS tile → Choose from library / Take photo.
2. Crop screen (process):
   - Fixed **1:1** crop frame (POS tile requirement).
   - Pinch to zoom, drag to pan image under a static mask.
   - Actions: **Reset** (secondary) and **Use photo** (primary).
3. On **Use photo**:
   - Busy overlay while cropping.
   - Local crop output created (JPEG).
   - Return via `replace()` to **Edit POS Tile** (not Create Item) with new `localUri`.
4. User taps **Save** on Edit POS Tile; Create Item preview updates from local draft.

### Ownership (API + Modules)

- **Media module** owns signed upload + commit (post‑create).
- **Catalog module** owns POS tile fields (`posTileMode`, `posTileColor`).
- **Inventory module** remains ledger-only (no image logic).

### Technical Design Decisions

- **Aspect ratio param**: cropper supports a configurable ratio; default **1:1** for POS tile.
- **Rotation**: **not supported** in Phase 1.
- **Tablet**: reuse phone layout with **larger crop frame** (tablet‑first parity still required).

### Output Constraints (API Safety)

- Server max upload size: **10 MB**.
- **Target size**: ≤ **6 MB** to leave headroom.
- **Hard cap**: ≤ **8 MB** (reject or downscale further if exceeded).
- **Max dimension**: **2048 px** (long edge) for higher detail.
- Output format: **JPEG** (quality ~0.85) for predictable size.

### Mobile Screens Required/Affected

- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-crop.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-crop.phone.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-crop.tablet.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-photo-library.phone.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile-recents.phone.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/pos-tile.phone.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/create.tsx`

### Governance/Constraints

- **Deterministic navigation**: `replace()` + returnTo/rootReturnTo.
- **Double‑tap prevention** + Busy overlay during crop.
- **No dropdowns/drawers**, visible actions only.
- **Media governance**: client never chooses bucket/path; only `MediaKind` is sent.

### Do Not Touch

- UDQI inventory quantities.
- POS layout/navigation rules.
- Media security rules + bucket governance.

---

## 2026-02-06 — Copy Casing Governance Update

### Summary

- **Subtitles, helper text, and hints must use sentence case** (not Title Case) for consistency in BizAssist UI copy.
- **Body copy should not be Title Case**.

---

## 2026-02-07 — Feature Design Locked: Auth Refresh Token Rotation Hardening

### Summary

Harden refresh token rotation to prevent dev-time disconnects while preserving strict security. This design keeps rotation + reuse detection but avoids false-positive mass logout and ensures mobile refresh is single-flight with safe retry.

### Canonical Behavior (API)

1. **Refresh** validates JWT and finds the refresh token by hash.
2. If **revoked**: treat as reuse, revoke all sessions for the user, bump `tokenVersion`, return `REFRESH_TOKEN_REUSE_DETECTED`.
3. If **expired**: revoke only that token, return `REFRESH_TOKEN_EXPIRED`.
4. If **not found**: return `REFRESH_TOKEN_NOT_FOUND` (no mass logout).
5. If **valid**: in a single DB transaction:
   - Create new refresh token row.
   - Mark old token `revokedAt` (do not delete).
   - Issue new access + refresh tokens.

### Token Version Rules (API)

- **Only** bump `tokenVersion` on **logout all**, **password reset**, or explicit admin action.
- **Single-session logout** revokes just the current refresh token (no version bump).

### Mobile Requirements

- **Single-flight refresh**: only one refresh call at a time; others wait for the same promise.
- **401 retry**: on 401 from non-auth routes, refresh once then retry the original request once.
- **Atomic token update**: update access + refresh together; prevent stale overwrites.
- **Failure handling**: if refresh fails with reuse/expired/not-found → clear tokens and route to auth.

### Error Envelope Codes (Stable)

`REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REVOKED`, `REFRESH_TOKEN_REUSE_DETECTED`, `REFRESH_TOKEN_NOT_FOUND`, `INVALID_REFRESH_TOKEN`.

### Constraints

- **No cookies** (token-based mobile auth only).
- **Standard error envelope** preserved.
- **Feature-first structure** preserved.
- **No UI layout changes**.

---

## 2026-02-08 — Abuse Cap Governance: Categories + Custom Units

### Summary

To prevent abuse, the API enforces business-scoped caps on:

- Categories: **200**
- Custom units: **100**

These limits are configurable via env and surfaced to mobile with explicit error codes and friendly UI copy.

### Server Details

Env vars:

- `MAX_CATEGORIES_PER_BUSINESS` (default 200)
- `MAX_CUSTOM_UNITS_PER_BUSINESS` (default 100)

Error codes:

- `CATEGORY_LIMIT_REACHED`
- `CUSTOM_UNIT_LIMIT_REACHED`

### Mobile Behavior

- Category create screen shows: "You've reached the maximum of X categories."
- Custom unit create screen shows: "You've reached the maximum of X custom units."

---

## 2026-02-08 — Feature Design Locked: Discounts (Create + Edit Flow, V1)

### Summary

Lock the Inventory-driven **Create Discount** and **Edit Discount** flows for V1. Discounts remain POS-only pricing modifiers and **never** touch the inventory ledger.

### Canonical User Flow

1. Inventory tab → **Discounts** list.
2. Tap **Create** → Create Discount screen.
3. Tap a **discount row** → Edit Discount screen.
4. Save on Create/Edit → `replace()` back to Discounts list, or `returnTo` if launched from POS.
5. Cancel/back on Create/Edit → deterministic `replace()` to list or `returnTo`.

### V1 Decisions (Locked)

- **Types:** fixed only (`PERCENT`, `FIXED`).
- **Scope:** defined at application time only (`SaleDiscount` snapshot), not on `Discount` definitions.
- **Stackable default:** **false** (align API + mobile for conservative behavior).
- **Discount Visibility (user-scoped):** add a separate visibility preference layer (Hide/Restore) that controls what appears in Discount pickers. This is non-destructive and reversible, and is **separate** from Archive/Restore lifecycle governance.

### Governance/Constraints

- **No dropdowns/drawers** in operational flows. Use full-screen pickers or segmented controls.
- **Deterministic navigation** with `replace()` and `returnTo`.
- **Busy overlay + double-tap prevention** for Create/Save actions.
- **Tablet-first parity**: phone/tablet variants must be updated together.
- **Visibility governance:** pickers show active + not hidden discounts; archived never selectable; currently selected discount remains visible read-only even if hidden.
- **Copy casing**: helper text and hints in sentence case.

### Do Not Touch

- Inventory ledger logic and UDQI quantity behavior.
- POS layout/navigation structure.
- Media governance rules and upload pipeline constraints.

---

## 10. Ledger‑Referenced Configuration Governance

Certain configuration entities in BizAssist are **ledger‑referenced**. If a POS Sale or Inventory record can reference the entity, it must follow archive‑only lifecycle rules.

This applies to:

- Units
- Categories
- Discounts
- (future) Taxes
- (future) Payment Methods

### Rules

- These entities must **never be hard deleted**.
- Allowed lifecycle actions only: **Create, Edit metadata, Archive, Restore**.
- Archived entities must remain visible in historical records for audit integrity.
- Picker screens must show **active only**; management screens may show **active + archived** via filters.
- Visibility (Hide/Restore) is a **separate user‑scoped preference** and must not be conflated with archive.

---

## 2026-02-15 — Services Governance Locked: Units + Cost + POS Quantity + Lifecycle

**Reference name:** Service Unit Semantics (v1)

### Summary

Lock Service (ProductType=SERVICE) behavior for creation, POS selling, and lifecycle so unit semantics are explicit, reporting is credible, and inventory logic never leaks into Services.

### Locked Rules

#### 1) Unit selection (no silent defaults)

- Services must require explicit unit selection (required field).
- Do NOT silently default to `Hour`.
- UI may visibly preselect a suggested unit, but it must be shown and changeable (i.e., the user is still making an explicit selection).

#### 2) Recommended unit options for Services

- Time units: `Minute`, `Hour`, `Day`, `Shift`, `Session`
- Engagement units: `Service`, `Job`, `Visit`, `Booking`, `Project`, `Package`, `Trip`
- Target-based units (conditional): `Vehicle`, `Room`, `Page`, `Seat`, `Head`, `Ticket`, `Item`

#### 3) Service Cost (optional)

- Service creation may include optional `cost` for margin reporting.
- Cost is interpreted as **cost per selected unit**.
- Cost must never drive inventory behavior.

#### 4) POS quantity rules for Services

- When adding a Service to cart: default quantity = `1`.
- Quantity entry:
  - Time-based units: allow decimals per `Unit.precisionScale`.
  - Engagement/target units: integer-only.
- Changing unit must reset quantity to `1` (no auto-conversion).

#### 5) Lifecycle governance

- Services follow `Active` / `Archived` only.
- Archived Services are excluded from POS and cannot be added to cart.
- Services have **no stock UI**, **no Adjust Stock**, and **no Recent Activity / InventoryMovement** surfaces.
- Visibility toggles (if used) are Settings-owned only, not Inventory-owned.

### Rationale

Avoid hidden assumptions (silent Hour default), preserve auditability, and keep reporting semantics consistent across multi-unit service businesses.

## 2026-02-19 — GTIN Governance Locked

### Summary

Lock GTIN (Global Trade Item Number) behavior across BizAssist to standardize barcode handling and ensure retail-grade correctness.

### Locked Rules

- GTIN is optional.
- Unique per business if present.
- Used for barcode scanning and fast POS lookup.
- Hidden/disabled for Services.
- UI label standardized as `GTIN (Barcode)`.
- Placeholder standardized as `Scan or enter UPC / EAN / ISBN`.

## 2026-02-21 — Cognitive-Emotional UX Governance Locked (App + Website)

### Summary

Persist a mandatory UX governance framework for all app and website development:

1. Halo Effect
2. Cognitive Load + Cognitive Fluency
3. Micro-Interactions + Peak-End Rule

### Locked Rules

- This framework is a default release requirement for new or modified user flows.
- First-view clarity and perceived quality are mandatory (Halo Effect).
- Decision friction must be minimized and copy must stay clear/predictable (Cognitive Fluency).
- Critical interactions must provide immediate feedback and clear end-state closure (Peak-End).

### Implementation Masterplan (Canonical)

- `docs/COGNITIVE_EMOTIONAL_UX_MASTERPLAN.md`
- `docs/MASTERPLAN_GUIDE.md`
- `docs/UI_GOVERNANCE.md`
- `docs/PR_CHECKLIST.md`

## 2026-02-21 — Cancel Button Behavior Governance Locked

### Summary

Lock canonical cancel behavior across process flows so cancellation is safe, deterministic, and semantically distinct from back navigation.

### Locked Rules

- `Cancel` must never commit writes (`create`, `update`, `archive`, `restore`).
- `Cancel` discards unsaved local state for the active process session.
- Cancel navigation must use deterministic `replace()`:
  - use `returnTo` when valid and non-self;
  - otherwise use a fixed flow fallback route.
- Do not rely on arbitrary history pop for cancel behavior.
- If unsaved changes exist, show discard confirmation (`Keep editing` / `Discard changes`) before exiting.
- Cancel actions must be navigation-locked/idempotent to prevent double-tap races.
- Semantics contract:
  - header-left on process screens uses `Close/Exit`;
  - in-content secondary action uses `Cancel`;
  - `Back` is reserved for detail/picker/history navigation.
