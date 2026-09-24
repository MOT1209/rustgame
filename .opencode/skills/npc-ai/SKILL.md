---
name: npc-ai
description: NPC behavior state machines for rustgame — Idle, Patrol, Detect, Investigate, Chase, Attack, Search, Return for wildlife, scientists and bandits. Use when adding NPCs, enemy behavior, AI states, perception or aggro, or when the user mentions NPC, AI, bandit, animal, scientist, wolf, patrol, chase or aggro.
---

# npc-ai

**Status: planned (Phase 2+).** This skill defines the architecture so NPC code
never leaks into `game.js` or the pure systems.

## State machine (canonical flow)

```
Idle → Patrol → Detect → Investigate → Chase → Attack → Search → Return → Idle
```

## Architecture (two-layer split)

| Layer | Location | Responsibility |
|---|---|---|
| **Brain (pure)** | `js/npc/ai.ts` | State transitions given perception + stats. No THREE, no DOM — fully unit-testable |
| **Body (adapter)** | `js/npc/npc-renderer.ts` or `game.js` wiring | Movement along path, animation, mesh, raycast queries for line-of-sight |

Data flow each frame: adapter collects perception (`playerDist`, `lineOfSight`,
`healthPct`) → calls `brain.update(perception, dt)` → receives
`{ state, target, action }` → adapter executes.

## Hard rules

1. **Transitions are a data table**, not nested ifs: map
   `(state, condition) → nextState` so behaviors are diffable and testable.
2. **Damage to/from NPCs uses `DamageSystem`** with existing `DamageTypes.ANIMAL`
   — never mutate `health` directly (player and NPCs share the contract).
3. **AI ticks are budgeted**: not every NPC runs at 60Hz — stagger updates
   (`game-performance`), full logic only when near the player.
4. **Persisted NPC state** (dead, loot, position) → SAVE_VERSION + migration.
5. RNG for patrol targets is injected/seeded for tests.

## Unit tests (minimum)

- Transition table: idle→detect when player enters perception radius
- Chase loses target after N seconds without LOS → Search → Return
- Attack respects cooldown; no damage when target dead

## Route

game-architecture → npc-ai → combat-system → loot-system (drops) →
save-load-persistence → game-performance → game-testing →
browser-game-verification
