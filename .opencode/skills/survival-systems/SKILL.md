---
name: survival-systems
description: Health, hunger, thirst, stamina, temperature, radiation, bleeding, death and respawn logic in rustgame. Use when changing balance values, survival tick logic, damage formulas, healing, death/respawn flow, or when the user mentions survival stats, starving, freezing, radiation, bleeding, StaminaSystem, DamageSystem or SurvivalSystem.
---

# survival-systems

## File map

| File | Ownership |
|---|---|
| `js/core/config.ts` | **Single source of truth** — `SURVIVAL_CONFIG` holds every tuning number |
| `js/player/damage.ts` | `DamageSystem` — the ONLY code allowed to change `stats.health` |
| `js/player/survival.ts` | `SurvivalSystem.tick()` — hunger, thirst, temp, radiation, bleeding, regen; returns events |
| `js/player/stamina.ts` | `StaminaSystem` — sprint/jump/gather drains + regen + sprint lockout |
| `js/types/game.ts` | `PlayerStats`, `SurvivalEnv`, `SurvivalTickResult` types |

All of these are **pure modules: no DOM, no THREE** — testable in Node.

## Hard rules

1. **Never touch `stats.health` directly.** Every HP change goes through
   `DamageSystem.applyDamage()` / `DamageSystem.heal()` so clamping, death and
   `lastDamageType` stay consistent.
2. **Never hardcode balance numbers.** Add fields to `SURVIVAL_CONFIG` and read
   `C.<field>` — config comments document units (per second vs flat).
3. **Never change a formula without a test** that fails before the change and
   passes after (or explicitly asserts the new intended behavior).
4. `tick()` returns events (`{type:'hunger', from, to}`) — systems must NOT call
   the UI; `game.js` maps events to notifications/sounds.

## tick() pipeline (do not reorder casually)

1. `normalize(stats)` (clamp/repair — save-migration friendly)
2. Hunger drain (walking / sprinting / freezing rates)
3. Thirst drain (faster than hunger)
4. Temperature (fire > rain > night > day, plus in-water extra drain)
5. Radiation gain/decay
6. Centralized damage: starvation, dehydration, radiation, freezing, bleeding
7. Natural regen only when `hunger ≥ regenHungerMin` and `thirst ≥ regenThirstMin`
8. State-change events (hunger/thirst band transitions)

## How to change balance safely

1. Edit the value in `SURVIVAL_CONFIG` only
2. Update/extend tests in `tests/survival.test.ts` (or `tests/phase1.test.mjs`)
3. `npm test` → green
4. Sanity-check in browser: set stat to edge value, watch one `tick`

## Death / respawn contract

- `DamageSystem.isDead(stats)` is the single death predicate (`health <= 0`)
- Respawn resets stats via `SurvivalSystem.normalize()` + config defaults;
  respawn penalties (base loss) are game-flow logic in `game.js`, not here.

## State bands

- Hunger: `>60` normal, `>30` hungry, `>0` starving, `0` critical
- Thirst: `>60` normal, `>30` thirsty, `>0` dehydrated, `0` critical
- `hungerState()` / `thirstState()` are the only band deciders — UI must reuse
  them, never re-derive bands.
