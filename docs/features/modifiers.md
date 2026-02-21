# Modifiers Feature Flow Design

**Feature name:** Modifiers (Modifier Sets & Modifiers)
**Owner:** Lead Architect / Implementation Engineer
**Target phase:** 2
**Status:** Approved (Masterplan-Locked)

---

## 2. Problem Statement

Businesses need to flexibly manage add-ons (modifiers) for items/services (e.g., toppings, extras) with clear pricing and availability, governed by business scope and operational safety.

---

## 3. User Story

As a business owner, I want to create and manage modifier sets and modifiers, so that I can offer flexible add-ons to my products/services and control their availability in real time.

---

## 4. Scope

### In scope

- Create, edit, delete modifier sets (e.g., "Toppings")
- Add, edit, delete modifiers within sets (e.g., "Beef", "Pork", "Veggies")
- Set modifier prices and toggle availability (including "Sold out")
- Apply modifier sets to items/services
- API and mobile app implementation (feature-first, no new abstractions)
- React Query, Loading Overlay, and all governance constraints

### Out of scope

- UI layout changes
- New architectural abstractions
- Non-governed navigation or state

---

## 5. Success Criteria (measurable)

- Modifier sets and modifiers can be created, edited, deleted, and applied to items/services
- Modifier availability can be toggled (including "Sold out")
- All async actions use Loading Overlay
- All API and UI flows pass governance and compile with zero TypeScript errors
- No new abstractions or layout changes introduced

---

## 6. Architecture Fit

- **API:** Feature-first module under `api/src/modules/modifiers/` (routes, controller, service, repository, validators)
- **Mobile:** Screens under `mobile/app/(app)/modifiers/`, logic in `mobile/src/modules/modifiers/`, types in `mobile/src/shared/`
- **Data:** Models for ModifierSet, Modifier, ItemModifierSet in Prisma and shared types
- **Governance:** Tablet-first UI, React Query, Loading Overlay, error handling, navigation, and business scope

---

## 7. UX Governance

- Follows Halo Effect, Cognitive Fluency, and Peak-End Rule
- Immediate feedback for all actions (pressed/loading/success/error)
- One dominant job per screen, clear copy, and closure for all flows

---

## 8. Implementation Plan

- Add models to Prisma schema
- Implement API module (feature-first)
- Add mobile screens and logic (feature-first, React Query, Loading Overlay)
- Integrate with item/service create/edit flows
- Add shared types
- Test for zero TypeScript errors and governance compliance

---

## 9. References

- Masterplan Guide
- Cognitive-Emotional UX Masterplan
- Option + Variation Feature Flow Design

---
