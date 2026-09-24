---
name: loot-system
description: Loot tables, rarity, randomization, barrels, crates, world loot, rare drops and loot respawn for rustgame. Use when adding loot containers or drop tables, balancing drop rates, or when the user mentions loot, barrel, crate, chest, drop table, rarity or rare item.
---

# loot-system

**Status: planned (Phase 2+).** There is no loot module yet — this skill defines
how to build it so it fits the architecture from day one.

## Design (follow `resources.js` as the template)

The existing resource/respawn pattern is the model to copy:

- `js/world/resources.ts` → `NODE_TYPES` defs + `RespawnManager` with
  injectable clock + `toJSON/fromJSON` — loot uses the same shape.

New module: `js/loot/` (pure, no DOM/THREE):

| Piece | Responsibility |
|---|---|
| `tables.ts` | `LOOT_TABLES`: entries `{ itemId, weight, min, max }` per container |
| `roll.ts` | `rollLoot(table, rng)` → items array (pure, seeded RNG injected) |
| `containers.ts` | Container defs (barrel, crate, military box): health, respawn, table ref |
| `loot-manager.ts` | Spawns, opened state, respawn timers, `toJSON/fromJSON` |

## Hard rules

1. **RNG is injected** (`rng: () => number`) — tests use a seeded generator to
   assert exact drops (see `WeatherSystem` for the existing pattern).
2. **Odds live in data** (weights in tables), never in code branches — balancing
   must not require code changes.
3. Granted items go through `StorageInventory.add()` — stack limits and
   unknown-id rejection apply automatically.
4. Opened/respawning containers are persisted state → SAVE_VERSION bump +
   migration in `save-load-persistence`.
5. Container destruction uses `DamageSystem`-style HP on the container object —
   do not bypass damage centralization for anything with health.

## Delivery order (route via rustgame-orchestrator)

game-architecture → loot-system (tables + roll + tests) → inventory-system
(grants) → world/resources (spawn/respawn wiring) → save-load-persistence →
game-ui-ux (loot panel) → game-testing → browser-game-verification

## Balance testing

Always add a statistical test: run `rollLoot` 1000× with seeded rng, assert
rarity distribution within tolerance — prevents accidental table breakage.
