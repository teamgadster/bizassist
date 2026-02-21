# Cognitive-Emotional UX Governance Masterplan (App + Website)

**Status:** Canonical (must be followed)  
**Effective date:** 2026-02-21  
**Scope:** Mobile app + website experiences (new features and modified flows)

## 1. Objective

Apply premium-psychology UX governance as a release standard:

1. Halo Effect
2. Cognitive Load + Cognitive Fluency
3. Micro-Interactions + Peak-End Rule

## 2. Non-Negotiable Rules

### 2.1 Halo Effect
- First viewport must communicate value and primary action in under 5 seconds.
- Visual polish is mandatory (type hierarchy, spacing, alignment, motion quality).
- Perceived performance must be intentional (`skeletons` preferred over indefinite spinners).

### 2.2 Cognitive Load + Cognitive Fluency
- Each screen has one dominant job and one dominant CTA.
- Reduce decision count and use progressive disclosure for advanced controls.
- Microcopy must be concrete, predictable, and outcome-oriented.
- Favor familiar interaction patterns over novelty in operational flows.

### 2.3 Micro-Interactions + Peak-End Rule
- Every interaction gets immediate, meaningful feedback (pressed/loading/success/error).
- Key value moments must be explicitly designed, not incidental.
- Flow endings must provide closure: confirmation, short summary, and next best action.

## 3. Implementation Plan

### Phase 1 - Governance Wiring (Immediate)
- Add this framework to project memory, masterplan, UI governance, and PR checklist.
- Require explicit UX gate sign-off in PR reviews.
- Define baseline KPI targets for top 3 flows in app and website.

**Exit criteria**
- Governance docs merged and referenced in review workflow.
- PR template/checklist includes all three principles.

### Phase 2 - App Core Flows (Next)
- Audit onboarding, auth, inventory create/edit, POS add-to-cart/checkout.
- Remove avoidable cognitive friction (extra steps, unclear labels, ambiguous actions).
- Add missing micro-feedback and closure states in all critical write flows.

**Exit criteria**
- No critical flow fails any principle.
- Completion rate/time and error rate improve versus baseline.

### Phase 3 - Website Core Flows (Next)
- Audit landing, signup, pricing/contact, and key conversion paths.
- Strengthen first-impression quality and CTA clarity above the fold.
- Simplify information architecture and reinforce ending states after conversion events.

**Exit criteria**
- First-screen conversion and drop-off trend improve.
- 5-second comprehension checks pass for priority pages.

### Phase 4 - Instrumentation + Continuous Governance (Ongoing)
- Track one KPI per principle:
  - Halo Effect: first-screen conversion or bounce.
  - Cognitive Fluency: key task completion rate/time.
  - Peak-End: post-flow satisfaction and return rate.
- Run monthly premium UX audit on top journeys.
- Block releases on critical UX gate failures.

**Exit criteria**
- Monthly trendline is visible and reviewed.
- Regression policy enforced in release decisions.

## 4. PR/Release Gates

- A change cannot ship if any critical principle item is missing in affected flows.
- A change cannot ship if UX evidence is absent (screens/video for key states).
- A change cannot ship if KPI regression exceeds agreed threshold without explicit waiver.

## 5. Definition of Done (UX Governance)

- Halo check passed.
- Cognitive fluency check passed.
- Micro-interaction and end-state check passed.
- Loading, error, empty, and success states verified.
- Mobile and website behavior validated for changed surfaces.
