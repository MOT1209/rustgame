---
name: game-performance
description: FPS, draw calls, memory, object pooling, instancing, frustum culling, LOD, chunk loading and mobile optimization for rustgame (targets PC + mobile). Use when the game is slow or stuttering, heating the device, or when the user mentions performance, FPS, lag, frame drops, draw calls, memory, optimize or slow.
---

# game-performance

## Targets

| Platform | Target |
|---|---|
| Desktop | 60 FPS, draw calls < 300 typical play |
| Mobile | ≥ 30 FPS stable, DPR capped, no thermal runaway |

## Measure first, optimize second

1. Enable FPS counter / `renderer.info` logging (draw calls, triangles, programs)
2. Chrome Performance tab → identify hot function before touching code
3. Record before/after numbers in the report — never claim "faster" without data

## Technique checklist (apply in this order)

1. **Zero per-frame allocations** — reuse scratch vectors; pooling for
   bullets/particles/notifications
2. **Share resources** — one geometry/material per mesh type; cache in a map
3. **InstancedMesh** for repeated objects (trees, rocks, grass, nails) —
   biggest win for draw calls
4. **Frustum culling** on by default; disable only for special cases
5. **Object pooling** for short-lived objects (projectiles, VFX, damage numbers)
6. **LOD** for far/complex models; simplify shadows (single shadow-casting
   light, small map size on mobile)
7. **Update budgets** — AI/logic at 10–20 Hz staggered; only full rate when
   near the player
8. **Mobile profiles** — cap DPR at 1.5–2, reduce shadow map, disable expensive
   post-effects on low-end devices (detect via `deviceMemory`/`hardwareConcurrency`)
9. **Heavy data off the main thread** only if measured necessary
   (worker for generation) — later phase

## Rules

- Optimization must **not change gameplay behavior** — run `npm test` after any
  refactor; pure systems stay untouched (optimize adapters only).
- Never remove culling/pooling "because it's simpler" — document the budget
  in the PR/summary.
- Asset size optimization belongs to `asset-pipeline`.

## Verification

`browser-game-verification`: measure FPS in-game on desktop and (if possible)
mobile emulation, screenshot `renderer.info` stats, console free of warnings
(e.g. "THREE.WebGLProgram: too many uniforms").
