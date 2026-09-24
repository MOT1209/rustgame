---
name: building-system
description: Building placement, foundations, walls, floors, roofs, doors, upgrades, repair, stability and tool cupboard privilege for rustgame. Use when modifying build pieces, placement validation, building tiers, upgrade/repair costs, or when the user mentions building, foundation, wall, roof, doorway, upgrade, repair, stability, building privilege or tool cupboard.
---

# building-system

## Current state (Phase 1)

- `js/game.js`: `BUILDING_TYPES` (foundation, wall, doorway, ceiling, tool
  cupboard, door...), `BUILDING_TIERS` (twig → wood → stone/metal...), placement
  ghost, upgrade/repair flow
- `index.html`: blueprint selector (Q) + radial piece selector (Rust-style)
- `css/building.css`: building UI styling
- Save shape: `buildings.structures[] = { type, pos, rot, tier, health,
  maxHealth, isTC }` + derived `toolCupboards[]` with radius

## Hard rules

1. **Placement validation must be pure** (given candidate transform + existing
   structures → boolean/reason). Scene raycasts are gathered by glue code and
   *passed in* — never keep validation logic inside THREE callbacks.
2. **Tier changes are data**: `BUILDING_TIERS[tier]` holds cost, health, color,
   mesh scale. Upgrades never mutate hardcoded numbers.
3. **HP flows through DamageSystem-style clamping**: structure damage sets
   `userData.health` with min 0 and removal at 0 — mirror the player pattern.
4. **Tool Cupboard = building privilege**: any placement/upgrade inside another
   player's TC radius is rejected (pure function: `pos + tcList → allowed`).
5. Structure changes are persisted → SAVE_VERSION + migration discipline.

## Refactor priority (anti-monolith)

Placement logic, upgrade logic and TC privilege checks are candidates to extract
from `game.js` into `js/building/` as **pure modules** (per `game-architecture`):
`placement.ts` (validation), `tiers.ts` (data), `privilege.ts` (TC checks).

## Phase 2 roadmap

- [ ] Stability/support (piece falls without foundation under it)
- [ ] Upgrade costs deducted via inventory adapter (same pattern as crafting)
- [ ] Decay over time (persisted per-structure timer)
- [ ] Multi-story building rules (foundation stacking limits)
- [ ] Placement ghost performance (reuse single ghost mesh — `game-performance`)

## Route

game-architecture → building-system → inventory-system (costs) →
save-load-persistence → game-ui-ux → game-testing → browser-game-verification
