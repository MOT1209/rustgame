---
name: weather-daynight
description: Day/night cycle, weather states (clear, rain, storm, fog), lighting transitions and environmental effects for rustgame. Use when changing time cycle, weather logic, lighting by time of day, or when the user mentions weather, rain, storm, fog, day/night, clock, night darkness or season.
---

# weather-daynight

## File map

| File | Ownership |
|---|---|
| `js/world/day-night.ts` | `DayNight.advance()`, `isNight()`, `daylightFactor()` — pure math on time |
| `js/world/weather.ts` | `WeatherSystem` — weighted state transitions, seeded RNG, `toJSON/fromJSON` |
| `js/game.js` | Applies lighting/sky/fog from those values (adapter) |
| `js/player/survival.ts` | Consumes env flags `isNight`, `isRaining` in `tick()` |

## Data flow

```
DayNight/Weather (pure)  →  env flags {isNight, isRaining}  →  SurvivalSystem.tick
                       ↘  lighting/fog/humidity values  →  renderer (adapter)
```

Systems **produce values**; only `game.js` touches `THREE.Light` / `scene.fog`.

## Hard rules

1. **Weather RNG is injected** — tests construct `WeatherSystem` with a seeded
   generator and assert exact transitions (see existing test in
   `tests/phase1.test.mjs`). Never call `Math.random()` directly in the system.
2. **Day length and rates live in config** (`SURVIVAL_CONFIG.dayLength`,
   `tempNightDrain`, `tempRainDrain`...) — balance changes go there.
3. Weather persists via `toJSON/fromJSON` and is stored in
   `save.world.weather` — changing the shape requires a SAVE_VERSION migration.
4. Time math must wrap correctly (`advance` crossing day boundaries) — always
   keep the wrap test green.

## Adding a weather state (checklist)

1. Add state name + weights to the config/table (e.g. `storm`, `fog`)
2. Effects split: survival effects → flags consumed in `survival.ts`;
   visual effects → adapter in `game.js` (`threejs-game-engine`)
3. Transition test with seeded RNG (state reachable, durations respected)
4. Verify visually at multiple times of day (`browser-game-verification`)

## Performance note

Lighting/fog updates should be driven by cached time values, not by string
comparisons every frame — see `game-performance`.
