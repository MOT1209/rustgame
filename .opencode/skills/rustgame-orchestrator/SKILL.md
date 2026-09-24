---
name: rustgame-orchestrator
description: Main routing skill for the rustgame (Rust Survival 3D) project. Use when the user requests a new game feature or system (e.g. "add loot boxes", "add AK-47", "add NPCs", "add a new building") and the request may span multiple subsystems. Decides which domain skills to activate and in what order, and enforces the delivery pipeline ending in game-testing and browser-game-verification.
---

# rustgame-orchestrator

You act as a full Game Development team, not a single skill. Your job is to
**route the request to the correct domain skills, in the correct order**, and make
sure every feature ends with tests and browser verification.

## Project context

- Repository: rustgame — open-source 3D survival game (Three.js + TypeScript + Capacitor)
- Web root: repository root (`index.html`, `js/`, `css/`)
- Pure game logic lives in `js/core`, `js/player`, `js/save`, `js/inventory`,
  `js/crafting`, `js/world` — **no DOM, no THREE imports allowed there**
- Rendering / input / UI glue lives in `js/game.js`, `js/ui`, `js/input`
- Existing test suite: `tests/` (migrating to Vitest)

## Routing rules

1. Analyze the request and list the subsystems it touches.
2. Activate the matching skills from the table below **in the listed order**
   (use the `skill` tool; load them before writing code).
3. Always append the pipeline tail: `game-testing` → `browser-game-verification`.
4. If the change alters persisted data, include `save-load-persistence`
   (schema version bump + migration) **before** testing.
5. If the change is UI-facing, include `game-ui-ux` before testing.
6. If the change affects frame time or memory, include `game-performance`.

## Routing table

| User request (examples) | Skill chain |
|---|---|
| "Add a military loot crate" | game-architecture → loot-system → inventory-system → game-ui-ux → save-load-persistence → game-testing → browser-game-verification |
| "Add an AK-47 weapon" | game-architecture → combat-system → inventory-system → save-load-persistence → game-testing → browser-game-verification |
| "Add an NPC bandit" | game-architecture → npc-ai → combat-system → save-load-persistence → game-testing → browser-game-verification |
| "Change hunger/damage balance" | survival-systems → game-testing (never change formulas without tests) |
| "Improve FPS on mobile" | game-performance → threejs-game-engine → mobile-game-controls → browser-game-verification |
| "New building piece" | building-system → inventory-system (costs) → save-load-persistence → game-testing |
| "New biome / terrain" | world-generation → threejs-game-engine → game-performance → browser-game-verification |
| "New recipe" | crafting-system → inventory-system → game-testing |
| "Save file not loading" | save-load-persistence → game-testing |
| "Add sound to X" | audio-system → game-ui-ux → game-testing |
| "Add muzzle flash / hit particles" | vfx-system → combat-system → game-performance → browser-game-verification |

## Hard rules (apply to every route)

1. **Separation of concerns is inviolable**: core systems stay pure — no `THREE`,
   no `document`, no `localStorage` inside `js/core`, `js/player`, `js/save`,
   `js/inventory`, `js/crafting`, `js/world`.
2. **Never change gameplay math** (damage, survival, crafting costs, loot odds)
   without a matching unit test that documents old vs new behavior.
3. **Never claim "done"** without: `npm test` green + `npm run build` green +
   browser verification (game opens, feature exercised, console clean).
4. **Keep `js/game.js` from growing**: new logic goes into its own module under
   `js/<system>/`; `game.js` only wires it up.
5. Any persisted-state change → bump `SAVE_VERSION` in `js/core/config.ts` and add
   a migration branch in `js/save/save-system.ts`.
6. Balance/tuning values belong in `SURVIVAL_CONFIG` (or the relevant config
   module) — never hardcode numbers in gameplay code.

## Delivery checklist (report to the user)

- [ ] Skills activated (list them)
- [ ] Files created/modified (list them)
- [ ] Unit tests added and passing (`npm test`)
- [ ] Build passes (`npm run build`)
- [ ] Browser verification performed (screenshots, console clean)
