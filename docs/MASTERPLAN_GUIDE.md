# BizAssist Masterplan Guide

**Status:** Canonical (must be followed)  
**Scope:** BizAssist_mobile + BizAssist_api  
**Audience:** You (lead architect), implementation engineers, and future contributors

This document is the **north star** for how BizAssist is designed, built, and shipped. If code conflicts with this guide, the code is wrong and must be refactored.

---

## 0. CODEX Agent Governance (Patch-Only Mode) — Locked

1. **Mission:** implement requested change exactly as specified, with minimal diffs, no architectural drift, and zero TypeScript errors.
2. **Token governance:** return patch-style unified diffs only; do not return full files; do not repeat unchanged code; keep explanations concise and technical.
3. **Global constraints:** enforce tablet-first governance, Back vs Exit Navigation Law, Busy/Loading Overlay governance, UDQI precision rules, Money 2-decimal input enforcement, and archive-only lifecycle governance where applicable.
4. **Execution framework:**
  - Step 1: repo scan for relevant components/modules/navigation/API/state/cross-module impacts.
  - Step 2: implement minimal diffs only, preserve existing patterns and business logic.
5. **No drift rules:** no unrelated edits, no naming drift, no new abstractions unless explicitly requested.
6. **Required delivery format:**
  - Files Updated (path + one-line reason)
  - Unified patch diffs only

## 1. Non‑Negotiable Product Principles

1. **Correctness over cleverness.** Inventory and POS must be deterministic, auditable, and replay‑safe.
2. **Offline‑safe writes where applicable.** Inventory writes must be idempotent and transactionally safe.
3. **Tablet-first layouts, not tablet-only interactions.** Tablets get persistent spatial UI (two‑pane), not hidden controls.
4. **No dropdowns, no drawers** in operational flows (Inventory/POS). Use drill‑in screens and full‑screen pickers.
5. **Hard screen transition** for navigation stability. Critical flows use deterministic `replace()`/controlled back behavior.
6. **Double‑tap prevention is mandatory.** Any action that navigates or writes must be guarded (disabled/busy).
7. **AI is optional and assistive-only.** AI can suggest; deterministic systems must remain authoritative.
8. **Cognitive-Emotional UX governance is mandatory.** App and website flows must pass Halo Effect, Cognitive Fluency, and Peak-End checks before release.

### 1.1 Cognitive-Emotional UX Governance (Locked)

All new or modified UX for app and website must follow:

1. **Halo Effect:** first viewport clarity, premium visual polish, and strong perceived performance.
2. **Cognitive Load + Cognitive Fluency:** one dominant job per screen, reduced decisions, familiar patterns, clear copy.
3. **Micro-Interactions + Peak-End Rule:** immediate feedback for each action, intentional value moments, and clear end-state closure.

Implementation details and release gates are canonical in `docs/COGNITIVE_EMOTIONAL_UX_MASTERPLAN.md`.

### 1.2 Post-Action Navigation Flow Governance (Locked)

Canonical term: **Post-Action Navigation Flow**.

This governs screen redirection after completion actions including Save, Archive, Restore, and equivalent write/lifecycle actions.

Rules:

1. **Deterministic closure only.** Use controlled navigation outcomes (`replace()` and governed back behavior) for stable end states.
2. **No ambiguous destinations.** Each action must resolve to one intended screen based on ownership context (operational vs management surface).
3. **Safety before transition.** Write/navigation actions must be double-tap safe and Busy/Loading Overlay governed.
4. **Clear completion signal.** Successful transitions must provide explicit closure feedback (toast/snackbar or equivalent pattern).
5. **Error path stays local.** Failed actions must not redirect away from the current context; preserve correction flow in-place.

### 1.3 Process Form and Lifecycle UX Governance (Locked)

1. **Form draft persistence is required** for multi-field process forms (also called draft state persistence). In-progress form input must survive transient navigation interruptions until explicit save/discard.
2. **Keyboard governance is required** on process forms with text input:
  - Use keyboard avoidance behavior.
  - Tapping outside inputs must dismiss keyboard.
3. **Lifecycle process separation is required.** Archive and Restore must be handled on dedicated process screens (not inline in detail/edit cards).
4. **Count formatting governance.** Compact numeric counts must use business-locale formatting utilities (not device-locale defaults or ad-hoc formatting).

---

## 2. Locked Development Order (Phased Roadmap)

### Phase 0 — Foundation (stability first)

**Goal:** stable runtime + navigation + API connectivity + UI primitives.

Must be stable before feature expansion:

- App providers: Paper theme, React Query, safe areas, display mode, busy overlay
- Networking: environment-driven baseURL selection (simulator/emulator/device)
- Auth: OTP-first registration + verify-email issuing tokens; refresh token rotation (atomic DB + reuse detection); single-flight mobile refresh + 401 retry; resend cooldown
- Onboarding: business creation and selection; **currency derived from country and immutable**
- UI primitives must be established and used everywhere:
  - `BAIScreen`, `BAISurface`, `BAIText`, `BAIButton`, `BAITextInput`, `BAISwitchRow`, `BAIPressableRow`

**Exit criteria**

- Login → Home tab route is deterministic.
- Tabs are stable: **Home | Inventory | POS | Settings**
- Phone orientation: portrait-only; tablet supports landscape.
- Global busy overlay works and is theme-aware.

### Phase 1 — Inventory Items + Ledger (core value)

**Goal:** inventory correctness and daily operational usability.

Deliverables:

- Item list (phone) + two‑pane list/detail (tablet)
- Item detail + activity audit view
- Adjust stock (ledger write) with **idempotencyKey replay safety**
- Watermark + ETag caching strategy
- Barcode scanning: camera-only + manual fallback
- Product images: unified media pipeline (Supabase signed upload)
- Photo selection must use **two distinct pre-crop selector screens**:
  - **Photo library (OS picker)** for deep media discovery across albums/folders.
  - **Recent photos (BizAssist grid)** for instant access to the latest captures.
    Both selectors **only return an asset URI** and must **not** preview, edit, or upload. They feed into the mandatory pipeline:
    **Pick → 1:1 crop → Normalize (1200×1200 JPEG) → Upload → Commit**.
- POS Tile editor (Create Item flow): tile label + Image/Color tabs, deterministic navigation,
  pre-create local crop → post-create upload, and tile fields owned by Catalog (posTileMode/posTileColor[/posTileLabel]).
  After crop, return to **Edit POS Tile** and require explicit **Save** before returning to Create Item.
- Custom in-app cropper (Expo 54): 1:1 POS tile default with future aspect-ratio parameter,
  no rotation in Phase 1, output cap target ≤6 MB (hard cap ≤8 MB) and max dimension 2048 px.

**Exit criteria**

- Create item, adjust stock, and verify the resulting movement is append-only and replay-safe.
- OnHand is correct after offline/duplicate submission simulation.

### Phase 2 — Categories (organization layer)

Settings-owned category lifecycle under `Settings → Categories`:

- Business-scoped category Create/Edit/Archive/Restore, optional color, sort order, active flag.
- User-scoped visibility under `Settings → Categories → Category visibility` (Hide/Restore, non-destructive).
- Category Visibility list filtering must use a **Switch** (`Show hidden categories`) because this is a boolean include/exclude filter on the current dataset.
- Do **not** use `GroupTabs` for hidden visibility filtering; tabs are reserved for peer view modes (e.g., Active/Archived lifecycle browsing).
- Inventory/POS operational flows expose only category pickers plus `+ Add Category` shortcut to Settings create flow.

### Phase 3 — Services (ProductType=SERVICE)

Unified Product model; services share categories and units; inventory tracking disabled.

#### Phase 3 — Services Governance (Locked)

- **Reference name:** Service Unit Semantics (v1)
- **Canonical source:** Service unit approved list/default/pinning must be maintained in `docs/SERVICE_UNIT_CATALOG_SEED.md` and kept in sync with both mobile runtime and API seed catalogs.
- **Unit selection is required** for Services. Do **NOT** silently default to `Hour`.
  - UI may _visibly_ preselect a suggested unit (e.g., `Service` or `Session` if available), but it must be shown and changeable.
- **Service Cost is optional** and used only for reporting:
  - Cost is interpreted as **cost per selected unit** for margin reporting.
  - Cost must never drive inventory behavior.
- **POS quantity semantics (Services)**:
  - Default quantity when added to cart: `1`.
  - Time-based units allow decimals per `Unit.precisionScale`.
  - Engagement/target units are integer-only.
  - Changing unit resets quantity to `1` (no auto-conversion).
- **Lifecycle (Services)**:
  - States: `Active` / `Archived` only.
  - Archived services are excluded from POS and cannot be added to cart.
  - Services have **no stock UI**, **no Adjust Stock**, and **no InventoryMovement activity** surfaces.
  - Visibility toggles (if used) are Settings-owned only (not Inventory-owned).

### Phase 4 — Discounts (POS-only pricing modifiers)

Discounts affect pricing only; **never** alter inventory ledger.

Discounts follow **ledger-definition governance** (same class as Units, Categories, Taxes, Payment Methods):

- **Never deletable.** Deletion is prohibited to preserve audit integrity.
- Allowed lifecycle actions only: **Create**, **Edit metadata**, **Archive** (`isActive=false`, `archivedAt`), **Restore**.
- **Archived discounts remain visible in historical sales records** (show as “(Archived)” when referenced).
- **Pickers show only active discounts** by default; management surfaces show **Active + Archived** via a filter.
- Add **Discount Visibility** as a user-scoped preference surface (mirrors Unit Visibility / Category Visibility):

> **Critical rule:** Discounts are ledger definitions. They must NEVER be deleted under any circumstance once referenced by a sale. Only Archive/Restore is allowed.

- Visibility is **non-destructive** and reversible: **Hide** / **Restore**.
- Visibility is **separate** from Archive/Restore lifecycle governance.
- **Pickers show only active + not hidden** discounts, plus the **currently selected** discount even if hidden.
- Selecting a hidden discount from a historical context auto-restores visibility.
- Management surface: `Settings → Discounts → Discount visibility` screen with explicit Hide/Restore actions (no switches).

### Phase 5 — Modifiers (Set Governance + Item/Service Attach)

Modifier behavior is locked to a reusable-set model aligned to the approved UX reference.

#### Phase 5 — Modifiers Governance (Locked)

- **Canonical owner split:**
  - Modifiers module owns modifier sets/options, set rules, and availability operations.
  - Catalog module owns attaching selected modifier sets during Item/Service create/edit save.
  - POS module owns checkout-time modifier selection validation and line-price application.
- **Attach parity rule:** Create Item and Create Service must use the same modifier attach pattern and semantics.
- **Operational status rule:** `Sold out` is an availability state for modifier options (not delete/archive).
  - Sold-out options remain visible in modifier management screens.
  - Sold-out options are excluded from POS selection but remain displayable with sold-out labeling.
- **Ledger clarity rule:** Modifier set ledger rows must expose summary state (`x available`, `y sold out`) where sold-out options exist.
- **Process UX rule (upsert/detail):**
  - Deterministic process navigation (`Exit` with explicit fallback, `Save` explicit).
  - Inline option name/price editing with reorder and remove affordances.
  - Set-level destructive actions require explicit, globally-scoped warning language.
- **Async safety rule:** bulk availability updates must use blocking Loading Overlay and completion toast/snackbar closure.
- **Governance non-regression:** UDQI precision/quantity behavior, tablet-first parity, Back vs Exit law, and POS structural architecture must remain unchanged.

---

## Sellable Lifecycle Governance (Locked — Option A)

### Canonical Rule

Inventory owns lifecycle for all sellable entities.  
Settings owns configuration only.

This governance applies to:

- `ProductType = PHYSICAL` (Items)
- `ProductType = SERVICE` (Services)

### Lifecycle Ownership

**Inventory tab must own:**

- Create
- Edit
- Archive
- Restore
- Operational detail hubs

**Settings tab must NOT provide:**

- Archive for Items
- Restore for Items
- Archive for Services
- Restore for Services

Unless a future explicit architectural decision centralizes all master data governance inside Settings.

### Lifecycle Model (Uniform)

Sellables support only:

- `ACTIVE`
- `ARCHIVED`

Rules:

- Archived sellables are excluded from POS.
- Archived sellables remain visible in historical records.
- Hard delete is prohibited.
- Lifecycle controls must not be duplicated across tabs.

### Architectural Rationale

- Preserves the mental model: Inventory = what I sell; Settings = how the system behaves.
- Prevents asymmetric behavior between Items and Services.
- Aligns with tablet-first operational workspace design.
- Avoids lifecycle drift across modules.

---


## 3. Architecture Decisions (Locked)

### 3.0 GTIN Governance (Global Trade Item Number)

GTIN (Global Trade Item Number) is the global barcode identifier standard covering UPC, EAN, ISBN, and related formats.

#### Canonical Rules

- GTIN is **optional** for Products.
- If provided, GTIN must be **unique per business scope**.
- GTIN must support barcode scanning and fast POS lookup.
- GTIN must **not** be required for Services (`ProductType = SERVICE`).
- The GTIN field must be **hidden or disabled** for Services.

#### UI Standard

- Label must be: `GTIN (Barcode)`
- Placeholder must be: `Scan or enter UPC / EAN / ISBN`

#### Rationale

- Ensures retail-grade interoperability.
- Prevents duplicate catalog entries.
- Enables future barcode-based auto-create workflows.
- Maintains clear separation between physical products and services.

### 3.1 Feature-first architecture

BizAssist follows a feature-first modular monolith structure. Do not introduce “misc” dumping grounds.

### 3.2 Unified Product model

Items and Services use a single Product model with `ProductType` driving behavior. Do not fork schemas.

### 3.3 Inventory = ledger-first

Inventory is an **append-only** movement ledger. Never “edit” historical movements in-place.

### 3.4 Media governance

Clients never choose buckets. Clients send a `MediaKind` (product-image/avatar/cover/etc). Server resolves:

- bucket allowlist
- business-scoped storage path
- signed upload mint + commit

AI background removal is allowed **only** for product images, not avatars/covers/logos.

#### 3.4.1 Media delivery governance (public vs private) — locked

BizAssist must use a tiered delivery policy by `MediaKind` to balance POS-grade performance with privacy.

**Public delivery (stable URLs; cache-friendly; recommended for speed):**

- `product-image` → bucket `product-media` **PUBLIC**
- `business-logo`, `business-cover` → bucket `business-assets` **PUBLIC** (default)

**Private delivery (signed URLs; used only when privacy is required):**

- `user-avatar`, `user-cover` → bucket `user-media` **PRIVATE** by default

**Rules (non-negotiable):**

1. **Never sign what you do not need to protect.** Signed URLs introduce cache misses and list/tile latency in mobile and web.
2. **Public buckets must return stable public URLs** via `getPublicUrl(path)` (no token query params). These URLs are the canonical delivery format for product and business branding images.
3. **Private buckets may return signed URLs**, but the API must not rotate URL identities on every read:
   - Cache `{bucket, path} → {signedUrl, expiresAt}` and reuse until near expiry (refresh only within a short grace window).
4. **Cache headers for public images must be aggressive** for immutable assets (e.g., `public, max-age=31536000, immutable`) to maximize CDN + client cache hit rate.
5. **Mobile must use `expo-image` with disk cache** for list/tile surfaces.
6. **Web must consume the same delivery URLs** (public URLs for product/branding; signed URLs only for user-private media when required).

**Objective:** Product and POS tile imagery must be instant after first load; privacy controls apply only to user identity media.

### 3.5 Tablet interaction standard

Tablets follow the same “no dropdowns, no drawers” rule as phones. Tablets gain:

- persistent panes
- inline inspectors
- always-visible toolbars

### 3.6 Abuse caps (business-scoped)

The API must enforce business-scoped caps to prevent abuse, with defaults:

- Categories: 200
- Custom units: 100

Limits are env-configurable and must return explicit error codes so mobile can surface friendly messages.

### 3.7 React Query freshness governance (staleTime tiers)

`staleTime` controls cache freshness and must be set by feature volatility. It is **not** a polling mechanism.

Use these canonical tiers:

- **Operational (Inventory/POS stock- and movement-critical screens):** `30_000`
- **Shared/default reference reads:** `120_000`
- **Settings/admin management screens (low churn):** `300_000`
- **Long-lived metadata:** `24 * 60 * 60 * 1000`

If a flow requires true near-real-time multi-device convergence, prefer event-driven invalidation (or websockets) over lowering staleTime globally.

---

## 4. Navigation Governance (Hard Screen Transition)

### 4.1 Tabs are canonical

- Home
- Inventory
- POS
- Settings

### 4.2 Route determinism

Critical flows must use deterministic transitions:

- After login/onboarding: `replace("/(app)/(tabs)/home")`
- Pickers must return to the correct parent route (use returnTo params)
- Back behavior must be deterministic (provide fallback routes)
- Discounts edit-save flows must `replace()` to their ledger route (Inventory and Settings) and must not be intercepted by process back/pop guards.

### 4.3 Phone/tablet splits

Every “real” screen must support:

- `screen.phone.tsx`
- `screen.tablet.tsx`
- `screen.tsx` as the router entry that selects the variant

Rule: if a refactor touches phone or tablet, the counterpart must be updated in the same PR.

---

## 5. UX Governance (Operational Screens)

### 5.1 No dropdowns, no drawers

Use:

- full-screen pickers
- drill-in editors
- list rows with chevrons

### 5.2 Action gating (anti-double-tap)

- All write actions use the global Busy Overlay (`useAppBusy`).
- All navigation actions must be disabled/guarded while in-flight.

### 5.3 States are mandatory

Every screen must define:

- Loading
- Error + Retry
- Empty + Guidance CTA
- Partial failure tolerance when safe (non-blocking refresh)

### 5.4 Search affordances (Operational)

- If the search field includes an inline clear affordance ("x"), do not add a separate "Search Results For" label row or a dedicated "Clear Search" button.

### 5.4 Input validation (Inventory/POS)

- Only apply strict regex validation to format-specific fields (e.g., POS tile label, SKU, barcode).
- Product name/description must allow broad characters; do not over-restrict.
- POS tile label: max 6 characters, letters/numbers/spaces only.
- Short Note must be capped at 200 characters.
- Short Note UI must render 2 visible lines and auto-grow to about 4 lines before inner scrolling.
- Short Note must not use regex-rejection validation beyond hygiene transforms (trim, whitespace normalization, control-character filtering).

### 5.5 Copy casing (UI text)

- **Subtitles and helper text must be sentence case.** Do not title-case these lines.

### 5.5 Text Input Hygiene (Global)

- All text inputs across the app must apply silent sanitation and field-specific validation.
- Control-character filtering is mandatory for all user-editable text fields.
  Strip non-printable ASCII control characters; allow newline/tab only where the field supports multiline/tab semantics.
- Allow normal text, punctuation, and emoji in general-purpose text fields (names, descriptions, notes, labels).
- Sanitize in Mobile (while typing and/or before submit) and in API (Zod preprocess) so hygiene is enforced server-side.
- Hygiene transforms must be invisible to the user and must not surface as regex-format errors.
- Validators must be field-specific and documented; avoid blanket regexes on general-purpose text.

### 5.6 Copy Casing (UI)

- **Subtitles, helper text, and hints use sentence case**, not Title Case.
- **Body copy should not be Title Case**.

### 5.7 Status icon defaults (archived/hidden)

- For Categories and Discounts management surfaces, status icons are locked to the following defaults:
  - **Category default:** `Ionicons` with `name="layers-outline"`
  - **Discount default:** `Ionicons` with `name="pricetag-outline"`
  - **Archived:** `MaterialCommunityIcons` with `name="archive-outline"`
  - **Hidden:** `MaterialCommunityIcons` with `name="eye-off"`
- Moving forward, Archive icon implementations must use this same archived default (`MaterialCommunityIcons` + `archive-outline`) on management surfaces.
- For Discounts Visibility action controls, restore icon is locked to:
  - **Restore action:** `MaterialCommunityIcons` with `name="eye"`
- Canonical snippets:
  - `import Ionicons from '@expo/vector-icons/Ionicons';`
  - `<Ionicons name="layers-outline" size={24} color="black" />`
  - `<Ionicons name="pricetag-outline" size={24} color="black" />`
  - `import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';`
  - `<MaterialCommunityIcons name="archive-outline" size={24} color="black" />`
  - `<MaterialCommunityIcons name="eye-off" size={24} color="black" />`
  - `<MaterialCommunityIcons name="eye" size={24} color="black" />`
- When both states can apply, archived takes precedence for status representation.

### 5.8 Count label pluralization (dynamic titles)

- Any UI count label/title must be dynamically pluralized based on the numeric value.
- Use singular for `1` and plural for all other values (`0`, `2+`, compact forms).
- Applies to badges, pills, headers, and inline count labels.
- Example pattern: `1 ITEM` vs `2 ITEMS` (or `1.2K ITEMS`).

### 5.9 Process wording convention (Close vs Cancel vs Back)

- Process screens must use **Close/Exit** semantics in the header-left control.
- Process-screen in-content secondary actions must be labeled **Cancel**.
- **Back** is reserved for history/navigation contexts (detail/picker/list drill-in), not process cancellation.

### 5.10 Badge token consistency (count chips/pills)

- Badge text color must use `theme.colors.onSurfaceVariant ?? theme.colors.onSurface`.
- Use compact counts for badge values.
- For visibility scopes, prefer consistent scope labels: `ALL`, `VISIBLE`, `HIDDEN`.
- Avoid mixed wording variants (`TOTAL` or noun-heavy badge text) when sibling surfaces use scope-only labels.

### 5.11 Color swatch accessibility (selection controls)

- Color swatches must expose human-readable accessibility labels (e.g., `Blue`, `No Color`).
- Swatches must expose selected/disabled state through accessibility state.
- Swatches must provide a short accessibility hint for selection action.

### 5.12 Cancel action behavior (deterministic safety contract)

- `Cancel` must never persist writes (no create/update/archive/restore side effects).
- `Cancel` discards unsaved local state for the current process session.
- `Cancel` navigation must be deterministic:
  - `replace(returnTo)` when `returnTo` is valid and non-self.
  - Otherwise `replace(fixedFallbackRoute)` for the owning flow.
- Do not use arbitrary history pop as cancel behavior.
- If unsaved changes exist, `Cancel` must show a discard guard (`Keep editing` / `Discard changes`).
- `Cancel` must be idempotent and navigation-locked to prevent double-tap race conditions.
- Semantics remain strict:
  - Header-left process control = `Close/Exit`
  - In-content secondary action = `Cancel`
  - `Back` = history/drill-in navigation only

## Button Shape Governance (Locked)

**STATUS:** LOCKED  
**CHANGE LEVEL:** Requires Architecture Review

### Canonical Rules

1. **Full-width buttons are rounded only.**
   - Full-width CTAs must use the current rounded rectangle radius token.
   - Full-width buttons must never render as pill.
2. **Compact/short-width buttons may be pill only by explicit opt-in.**
   - Pill shape is allowed only for compact utility controls (filters, segmented actions, inline contextual actions, tag-like controls).
   - Pill is never inferred automatically.
3. **Primary destructive and transactional actions are never pill when full-width.**
   - Includes Save, Create, Confirm, Checkout, Archive, Restore, and equivalent full-width primary CTAs.
4. **Enforcement is centralized in canonical `BAIButton`.**
   - If `shape="pill"` is requested on a full-width button, it must auto-fallback to `shape="default"` and warn in DEV only.
5. **Geometry communicates hierarchy.**
   - Rounded full-width CTAs represent decisive primary flow actions.
   - Compact pill controls represent secondary contextual actions.
6. **Enterprise-grade structure over trendy softness.**
   - Shape consistency is a governance contract, not a per-screen styling preference.

### Masterplan UX Principles Evaluation (Button Shape Governance)

- **Halo Effect:** consistent CTA geometry increases perceived quality, coherence, and trust.
- **Cognitive Load & Fluency:** shape hierarchy keeps primary decisions obvious and reduces interpretation cost.
- **Micro-Interactions & Peak-End Rule:** full-width primary actions feel decisive at interaction peak; flow endings feel stable and intentional.

---

## 6. Quality Gates (Definition of Done)

A feature is not “done” until:

- Busy/disabled guards are implemented
- Empty/error/loading states exist
- Phone + tablet behavior validated
- No hidden interaction controls added
- API contracts match mobile types
- Inventory writes are idempotent and ledger-correct

See: `docs/PR_CHECKLIST.md`

---

## 7. Theme Governance (Background)

**Canonical app background colors (use everywhere):**

- Light: `#F1F5F9` (`baiSemanticColors.surfaces.background`)
- Dark: `#202124` (`baiSemanticColors.surfacesDark.background`)

**Usage rules:**

- All screens must use `BAIScreen` (it consumes `useAppBackground`).
- Do not hardcode screen background colors in feature code.
