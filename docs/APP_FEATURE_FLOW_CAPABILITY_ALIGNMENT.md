# App Feature Flow Capability Alignment

**Status:** Canonical app-flow mapping (implementation baseline)
**Scope:** `mobile/app` route flows aligned to capability governance

This document refactors feature-flow ownership into a single capability alignment matrix for the app layer.
Use this as the source of truth before changing any flow, route, or process behavior.

Reference:
- `docs/PRODUCT_CAPABILITY_MAP.md`
- `docs/CAPABILITY_MODULE_WORKSPACE_MAPPING.md`
- `docs/FEATURE_ONE_PAGER_TEMPLATE.md`

---

## System/Auth Flows

### Flow: Bootstrap + Auth Gate
Capability:
- Identity and Access

Sub Capability:
- Session Bootstrap
- Protected Route Gating

Owner Surface:
- `mobile/app/(system)/bootstrap.tsx`
- Root shell route eviction in `mobile/app/_layout.tsx`

Domain Entities:
- `User`
- `RefreshToken`
- `StaffMembership`
- `Business`

System Invariants:
- unauthenticated users cannot remain in `/(app)` routes
- active business context must be resolved before app workspace access
- auth/session errors use structured error code handling

### Flow: Register -> Verify Email -> Login
Capability:
- Identity and Access

Sub Capability:
- Authentication
- Email OTP Verification

Owner Surface:
- `mobile/app/(auth)/*`

Domain Entities:
- `User`
- `EmailOtp`
- `RefreshToken`
- `PasswordResetTicket`

System Invariants:
- protected routes require valid access token
- unverified users are blocked from authenticated entrypoints
- OTP expiry/attempt limits are enforced server-side

### Flow: Forgot Password + Reset Password
Capability:
- Identity and Access

Sub Capability:
- Password Recovery

Owner Surface:
- `mobile/app/(auth)/forgot-password.tsx`
- `mobile/app/(auth)/reset-password.tsx`

Domain Entities:
- `User`
- `EmailOtp`
- `PasswordResetTicket`

System Invariants:
- reset flow must require valid, unexpired ticket
- reset ticket is one-time use
- auth sessions are revoked after successful password reset

---

## Onboarding Flows

### Flow: Welcome -> Module Choice -> Business Create
Capability:
- Business and Org

Sub Capability:
- Business Creation (v1 single-business)

Owner Surface:
- `mobile/app/(onboarding)/*`

Domain Entities:
- `Business`
- `User`
- `StaffMembership`

System Invariants:
- v1 single-business policy
- membership/ownership checks required for business mutations
- onboarding completion required before entering full app workspace

---

## Home Flows

### Flow: Home Summary and Read Models
Capability:
- Reporting (v1)

Sub Capability:
- Sales Summary
- Low Stock Indicators

Owner Surface:
- `mobile/app/(app)/(tabs)/home/*`

Domain Entities:
- `Sale`
- `SaleLineItem`
- `InventoryMovement`
- `Product`

System Invariants:
- home analytics are read-only
- inventory metrics are ledger-derived
- summaries cannot mutate operational entities

---

## Inventory Flows

### Flow: Product Lifecycle (Create/Edit/Archive/Restore)
Capability:
- Catalog Management

Sub Capability:
- Item Management

Owner Surface:
- `mobile/app/(app)/(tabs)/inventory/products/*`
- mirrored settings owner surface: `mobile/app/(app)/(tabs)/settings/items-services/products/*`

Domain Entities:
- `Product`
- `Category`
- `Unit`

System Invariants:
- archive-only lifecycle (no hard delete)
- UDQI-compatible quantity/unit constraints
- business scoping required on all create/update actions

### Flow: Service Lifecycle (Create/Edit/Archive/Restore)
Capability:
- Catalog Management

Sub Capability:
- Service Management

Owner Surface:
- `mobile/app/(app)/(tabs)/inventory/services/*`
- mirrored settings owner surface: `mobile/app/(app)/(tabs)/settings/items-services/services/*`

Domain Entities:
- `Product` (service type)
- `Category`
- `Unit`

System Invariants:
- archive-only lifecycle
- no inventory-stock mutation for pure service items
- route-scope parity between Inventory and Settings surfaces

### Flow: Inventory Ledger Operations (Adjust/Receive/History)
Capability:
- Inventory Management

Sub Capability:
- Stock Adjustment
- Inventory Activity

Owner Surface:
- `mobile/app/(app)/(tabs)/inventory/products/[id]/adjust.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/stock-received.tsx`
- `mobile/app/(app)/(tabs)/inventory/products/[id]/activity/*`

Domain Entities:
- `InventoryMovement`
- `Product`
- `Unit`

System Invariants:
- append-only ledger
- no direct mutable stock source-of-truth writes
- movement history remains immutable

### Flow: Product Option + Variation Definition
Capability:
- Catalog Management

Sub Capability:
- Variation Definition
- Option Set Attachment

Owner Surface:
- `mobile/app/(app)/(tabs)/inventory/products/options/*`
- mirrored settings owner surface: `mobile/app/(app)/(tabs)/settings/items-services/products/options/*`

Domain Entities:
- `OptionSet`
- `OptionValue`
- `ProductOptionSet`
- `ProductVariation`

System Invariants:
- deterministic variation key generation and dedupe
- business-scoped option catalogs only
- variation definition does not directly mutate inventory quantities

### Flow: Media Intake (Product Image/Crop/Upload)
Capability:
- Media Management

Sub Capability:
- Product Image Pipeline

Owner Surface:
- inventory photo/tile routes under `mobile/app/(app)/(tabs)/inventory/products/*`
- mirrored settings routes under `mobile/app/(app)/(tabs)/settings/items-services/products/*`

Domain Entities:
- `Product`
- `ProductImage` (or media metadata entity)

System Invariants:
- signed uploads only
- deterministic storage path policy enforced by server
- clients do not choose storage buckets

---

## POS Flows

### Flow: POS Cart + Checkout + Discount Application
Capability:
- POS Checkout

Sub Capability:
- Cart
- Checkout
- Sales Recording

Owner Surface:
- `mobile/app/(app)/(tabs)/pos/*`
- `mobile/app/(app)/(tabs)/pos/discounts/*`
- `mobile/app/(app)/(tabs)/pos/cart/*`

Domain Entities:
- `Sale`
- `SaleLineItem`
- `Payment`
- `InventoryMovement`
- `Discount`

System Invariants:
- checkout finalization is atomic
- sale finality and financial reconciliation are preserved
- inventory movements are written as part of sale finalization
- discount totals remain deterministic and auditable

---

## Settings Flows

### Flow: Units Lifecycle
Capability:
- Units Management

Sub Capability:
- Unit Creation
- Unit Precision Governance

Owner Surface:
- `mobile/app/(app)/(tabs)/settings/units/*`

Domain Entities:
- `Unit`

System Invariants:
- UDQI precision rules are enforced
- archive-only lifecycle
- incompatible precision changes are blocked when referenced

### Flow: Categories Lifecycle
Capability:
- Category Management

Sub Capability:
- Category Lifecycle

Owner Surface:
- `mobile/app/(app)/(tabs)/settings/categories/*`

Domain Entities:
- `Category`

System Invariants:
- archive-only lifecycle
- business-scoped category ownership
- archived categories are ineligible for new assignments

### Flow: Discounts Lifecycle
Capability:
- Discounts

Sub Capability:
- Discount Management

Owner Surface:
- `mobile/app/(app)/(tabs)/settings/discounts/*`

Domain Entities:
- `Discount`

System Invariants:
- archive-only lifecycle
- discount configuration integrity
- runtime sale discounts snapshot values at checkout

### Flow: Modifiers Lifecycle
Capability:
- Modifiers

Sub Capability:
- Modifier Sets
- Modifier Options

Owner Surface:
- `mobile/app/(app)/(tabs)/settings/modifiers/*`

Domain Entities:
- `ModifierSet`
- `ModifierOption`

System Invariants:
- archive-only lifecycle
- modifier constraints (min/max selection rules) are enforced
- modifiers affect price only, not inventory quantity

### Flow: Sales Tax Settings
Capability:
- Settings Governance

Sub Capability:
- Checkout Policy Configuration

Owner Surface:
- `mobile/app/(app)/(tabs)/settings/checkout/sales-taxes/*`

Domain Entities:
- `SalesTaxConfig` (settings policy entity)
- `Business`

System Invariants:
- settings updates require authorized business context
- pricing/tax configuration changes are explicit and auditable
- operational modules consume settings, they do not own lifecycle

---

## Cross-Cutting Flow Governance

### Flow: Busy Overlay + Duplicate Submission Prevention
Capability:
- System Operations and Reliability

Sub Capability:
- Runtime Integrity

Owner Surface:
- Global provider + async write pathways across all app workspaces

Domain Entities:
- Cross-domain write entities (`Product`, `Sale`, `InventoryMovement`, settings entities)

System Invariants:
- async writes are busy-governed and double-tap safe
- critical writes preserve deterministic success/error routing
- invariant failures produce structured error handling paths

---

## Alignment Rules (Required)

- Every new or changed app flow must include:
  - Capability
  - Sub Capability
  - Owner Surface
  - Domain Entities
  - System Invariants
- If ownership is unclear, stop implementation and trigger architecture review.
- If a flow crosses surfaces, define one primary owner and explicit integration surfaces.
