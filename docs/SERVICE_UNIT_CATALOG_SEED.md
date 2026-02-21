# Service Unit Catalog (Canonical)

Date: 2026-02-16  
Purpose: Single approved source for Service units across Product, Mobile, and API seed/runtime behavior.

## Source of Truth

- Mobile runtime catalog: `mobile/src/features/units/serviceUnitCatalog.ts`
- API seed catalog: `api/src/modules/units/serviceUnitCatalog.seed.ts`
- Picker preset + pinning behavior: `mobile/app/(app)/(tabs)/inventory/units/picker.tsx`
- Create Service default behavior: `mobile/app/(app)/(tabs)/inventory/services/create.tsx`

## Governance (Current)

- Default Service unit: **Service (svc)**.
- Pinned in unit picker (service context): **Service (svc)** only.
- `Per Piece (pc)` remains the existing global count pinned row.
- TIME units use configured precision; `Session (sess)` is whole-only (precision 0).

## Approved Service Units (v1)

| name    | abbreviation | category | precisionScale |
| ------- | ------------ | -------- | -------------: |
| Minute  | min          | TIME     |              2 |
| Hour    | hr           | TIME     |              2 |
| Day     | day          | TIME     |              2 |
| Shift   | shift        | TIME     |              0 |
| Session | sess         | TIME     |              0 |
| Service | svc          | COUNT    |              0 |
| Job     | job          | COUNT    |              0 |
| Visit   | visit        | COUNT    |              0 |
| Booking | booking      | COUNT    |              0 |
| Project | project      | COUNT    |              0 |
| Package | pkg          | COUNT    |              0 |
| Trip    | trip         | COUNT    |              0 |
| Class   | class        | COUNT    |              0 |
| Room    | room         | COUNT    |              0 |
| Vehicle | veh          | COUNT    |              0 |
| Page    | page         | COUNT    |              0 |
| Seat    | seat         | COUNT    |              0 |
| Head    | head         | COUNT    |              0 |
| Ticket  | ticket       | COUNT    |              0 |
| Item    | item         | COUNT    |              0 |

## Seed and Migration Sync Note

- If a workspace already contains old service units (for example `session` abbreviation or legacy extras), keep existing rows for history, but seed/enable this approved set going forward.
- Do not remove legacy units automatically in production; deactivation/cleanup should be a controlled data operation.
- Any future unit additions or removals must be applied in both source files above in the same change.

## Service Category Mapping (UI)

- Time-Based: `Minute`, `Hour`, `Day` (decimal allowed)
- Scheduled Blocks: `Shift`, `Session` (integer only)
- Engagement / Outcome: `Service`, `Job`, `Visit`, `Booking`, `Project`, `Package`, `Trip` (integer only)
- Target-Based: `Class`, `Room`, `Vehicle`, `Page`, `Seat`, `Head`, `Ticket`, `Item` (integer only)
