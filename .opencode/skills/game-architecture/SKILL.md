---
name: game-architecture
description: Architecture rules for rustgame — module boundaries, layering, separation of concerns, dependency direction, event flow, and keeping js/game.js from becoming a monolith. Use when creating or refactoring any module, deciding where new logic belongs, reviewing structure, or when the user mentions architecture, module, separation of concerns, refactor, or "game.js is too big".
---

# game-architecture

## Layer model (dependency direction: top depends on bottom, never reverse)

```
L4  Rendering / DOM glue     js/game.js, js/ui/hud.js, index.html
L3  Adapters (THREE/DOM)     rendering helpers, input providers, notifications
L2  Pure game systems        js/player, js/save, js/inventory, js/crafting,
                             js/world, js/interaction, js/input (logic part)
L1  Core data & config       js/core/config.ts, js/types/game.ts
```

**Rule: L1–L2 must never import L3–L4** (no `THREE`, no `document`,
no `localStorage` inside pure systems). Storage backends and clocks are
*injected* (see `SaveSystem.read(storage, key)` and `RespawnManager(clock)`).

## Where does new code go? (decision tree)

1. Is it a number/balance value? → `js/core/config.ts` (`SURVIVAL_CONFIG` etc.)
2. Is it a data shape shared across modules? → `js/types/game.ts`
3. Is it game rules with math? → own module in `js/<system>/` (pure, testable)
4. Is it Three.js scene work? → adapter module in `js/<system>/` or a section in
   `js/game.js` **only if** it is pure wiring (≤30 lines)
5. Is it DOM/HUD? → `js/ui/`, using pure formatters that are unit-tested
6. Is it a new subsystem? → create `js/<system>/` with a header comment
   describing ownership

## Anti-monolith rules for `js/game.js`

- `game.js` is the composition root: wiring, render loop, scene setup. Target:
  **no new business logic** added to it.
- If you need more than ~30 lines of logic in `game.js`, extract a module.
- When extracting: move logic first, keep call sites identical, run tests.

## Event flow convention

Systems **return data**, they never call the UI:

```js
const { events, hungerState, freezing } = SurvivalSystem.tick(stats, dt, env);
// game.js maps events → showNotification / sound hooks
```

This keeps systems testable and the UI replaceable.

## Module template (header convention)

Every system file starts with a block comment stating: purpose, purity
("Pure module: no DOM, no THREE"), and its public API.

## Checklist before adding a module

- [ ] Pure logic separated from adapter/visual code
- [ ] Imports only point downward in the layer model
- [ ] Public API documented in the file header
- [ ] Unit tests added under `tests/`
- [ ] `game.js` diff is wiring-only
