---
name: vfx-system
description: Visual effects for rustgame — fire, smoke, dust, sparks, blood, explosions, muzzle flash and weather VFX using particles, sprites and shaders. Use when adding particles or effects, custom shaders, hit feedback visuals, or when the user mentions VFX, particle, smoke, fire, sparks, blood, flash, explosion or glow. Priority: later phase.
---

# vfx-system

**Status: later phase.** Structure below keeps effects cheap enough for mobile
and clean enough for the architecture.

## Architecture

| Layer | Location | Responsibility |
|---|---|---|
| Effect definitions (data) | `js/vfx/effects.ts` (new) | `{ id, spawnRate, lifetime, color, texture, gravity... }` — pure data |
| VFX adapter | `js/vfx/vfx-engine.ts` (new) | THREE particles/sprites/shader materials; the ONLY file touching particle internals |
| Triggers | glue | `game.js` calls `vfx.spawn(id, position)` on hits, gathering, weather, fire |

Core systems stay pure — they emit events; glue spawns visuals.

## Hard rules

1. **Pooling is mandatory**: particle buffers pre-allocated and reused; zero
   per-effect `new BufferGeometry()` at runtime (`game-performance`).
2. **Budget**: total live particles capped by device profile (desktop/mobile);
   effects degrade (fewer particles) rather than drop frames.
3. **Effect tuning is data** — designers adjust numbers without touching code.
4. **Dispose discipline**: textures/materials loaded per-effect are cached and
   disposed only on scene teardown, never per spawn.
5. **Damage numbers / blood** must not leak into core systems — spawn is a
   presentation-side call fed by `DamageSystem` return values (it already
   returns actual damage dealt — use that).

## Effect catalog (priority)

1. Campfire flame/smoke (exists visually — formalize under this system)
2. Gathering hits (wood chips / dust puff per resource type)
3. Build placement ghost + upgrade flash
4. Hit feedback (spark for metal, dust for stone; blood when combat lands)
5. Weather overlays (rain splash, fog handled by scene fog)
6. Explosions / muzzle flash (with `combat-system`)

## Route

vfx-system → game-performance (budget check) → browser-game-verification
(screenshots at target FPS)
