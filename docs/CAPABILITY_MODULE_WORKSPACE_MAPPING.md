# BizAssist Capability to Module to Workspace Mapping

**Status:** Canonical (must be followed)  
**Scope:** BizAssist_mobile + BizAssist_api + domain ownership boundaries

This mapping defines where each feature belongs across capabilities, backend modules, mobile workspaces, and domain entities.

---

## Purpose

This mapping answers:
1. Which capability owns the feature?
2. Which backend module implements it?
3. Which mobile workspace exposes it?
4. Which domain entities and invariants it touches?

Every feature must map here before implementation.

---

## Workspace Model

BizAssist mobile workspaces:
- Home
- Inventory
- POS
- Settings

Tabs are workspace selectors, not screen navigators.

---

## Backend Module Baseline

Canonical modules:
- `auth`
- `business`
- `inventory`
- `catalog`
- `pos`
- `discounts`
- `categories`
- `units`
- `modifiers`
- `media`
- `reports`

Each module owns its business logic and API routes.

---

## Mapping

### Capability
Identity and Access

Sub Capability:
- Authentication
- Session Management

Owner Surface:
- System/Auth gateway (`mobile/app/(system)` + `mobile/app/(auth)`)

Backend Module:
- `auth`

Mobile Workspace:
- system/auth flow

Primary Screens:
- Login
- Register
- Verify Email

Domain Entities:
- `User`
- `RefreshToken`
- `EmailOtp`

System Invariants:
- authentication required for protected routes
- token validity and expiration enforcement

---

### Capability
Business Management

Sub Capability:
- Business Setup
- Active Business Selection

Owner Surface:
- Onboarding bootstrap + Settings business management

Backend Module:
- `business`

Mobile Workspace:
- Onboarding
- Settings

Primary Screens:
- Create Business
- Business Settings

Domain Entities:
- `Business`
- `StaffMembership`

System Invariants:
- single-business policy in v1
- authorization and membership checks

---

### Capability
Catalog Management

Sub Capability:
- Item Management
- Service Management

Owner Surface:
- Inventory workspace-owned operational lifecycle

Backend Module:
- `catalog`

Mobile Workspace:
- Inventory

Primary Screens:
- Item List
- Create Item
- Edit Item
- Item Detail

Domain Entities:
- `Product`
- `Category`
- `Unit`

System Invariants:
- archive-only lifecycle
- UDQI quantity compatibility

---

### Capability
Units Management

Sub Capability:
- Unit Creation
- Unit Precision Governance

Owner Surface:
- Settings-owned lifecycle (Inventory consumes via pickers)

Backend Module:
- `units`

Mobile Workspace:
- Settings

Primary Screens:
- Units List
- Create Unit
- Edit Unit

Domain Entities:
- `Unit`

System Invariants:
- UDQI precision rules
- fixed-point quantity representation compatibility

---

### Capability
Category Management

Sub Capability:
- Category Lifecycle

Owner Surface:
- Settings-owned lifecycle (Inventory/POS consume)

Backend Module:
- `categories`

Mobile Workspace:
- Settings

Primary Screens:
- Categories List
- Create Category
- Edit Category

Domain Entities:
- `Category`

System Invariants:
- archive-only lifecycle

---

### Capability
Inventory Management

Sub Capability:
- Stock Adjustment
- Inventory Activity

Owner Surface:
- Inventory workspace-owned ledger operations

Backend Module:
- `inventory`

Mobile Workspace:
- Inventory

Primary Screens:
- Inventory List
- Product Detail
- Adjust Stock

Domain Entities:
- `InventoryMovement`
- `Product`

System Invariants:
- append-only ledger
- movement immutability
- no direct stock mutation

---

### Capability
POS Checkout

Sub Capability:
- Cart
- Checkout
- Sales Recording

Owner Surface:
- POS workspace-owned transaction flow

Backend Module:
- `pos`

Mobile Workspace:
- POS

Primary Screens:
- POS Catalog
- Cart
- Checkout

Domain Entities:
- `Sale`
- `SaleLineItem`
- `Payment`
- `InventoryMovement`

System Invariants:
- sale finality
- inventory ledger integrity
- pricing integrity
- financial reconciliation

---

### Capability
Discounts

Sub Capability:
- Discount Management
- POS Discount Application

Owner Surface:
- Settings-owned definitions + POS runtime application

Backend Module:
- `discounts`

Mobile Workspace:
- Settings
- POS

Primary Screens:
- Discount List
- Create Discount

Domain Entities:
- `Discount`
- `SaleDiscount`

System Invariants:
- discount snapshot integrity at sale time
- financial total integrity

---

### Capability
Modifiers

Sub Capability:
- Modifier Sets
- Modifier Options

Owner Surface:
- Settings-owned definitions + Inventory/POS integration surfaces

Backend Module:
- `modifiers`

Mobile Workspace:
- Settings
- Inventory

Primary Screens:
- Modifier List
- Create Modifier Set

Domain Entities:
- `ModifierSet`
- `ModifierOption`

System Invariants:
- modifiers affect price only
- modifier selection constraints enforcement

---

### Capability
Media Management

Sub Capability:
- Product Image Pipeline

Owner Surface:
- Inventory-owned intake flow (media module-governed upload contract)

Backend Module:
- `media`

Mobile Workspace:
- Inventory

Primary Screens:
- Product Photo
- Crop Upload

Domain Entities:
- `ProductImage`

System Invariants:
- signed uploads only
- deterministic storage paths
- client cannot control raw bucket paths

---

### Capability
Reporting (v1)

Sub Capability:
- Sales Summary
- Low Stock Indicators

Owner Surface:
- Home workspace summary surfaces (read-only)

Backend Module:
- `reports`

Mobile Workspace:
- Home
- Inventory

Primary Screens:
- Dashboard Summary

Domain Entities:
- `Sale`
- `InventoryMovement`

System Invariants:
- read-only analytics
- ledger-derived inventory metrics
- sale finality preservation

---

## Mapping Rules

Every new feature ticket must define:
- capability
- sub capability
- owner surface
- backend module
- mobile workspace
- domain entities
- invariants

If a feature spans multiple modules, a primary owner module is mandatory.

---

## Architecture Safety Rules

- No new backend modules without architecture review.
- No duplicated domain logic across modules.
- No UI feature outside defined workspaces.

---

## Final Principle

If a feature cannot be clearly mapped to capability, module, workspace, entities, and invariants, the feature is not implementation-ready and requires architecture review.
