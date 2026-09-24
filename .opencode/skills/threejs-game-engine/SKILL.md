---
name: threejs-game-engine
description: Three.js rendering for rustgame — scene, camera, renderer, lighting, materials, GLB models, animations, raycasting, shadows and render optimization. Use when touching rendering code in js/game.js, adding or debugging visuals, models, lights, materials, controls, WebGL errors, or when the user mentions Three.js, scene, camera, renderer, mesh, shadow or not rendering.
---

# threejs-game-engine

## Current setup (Phase 1)

- `three@0.160.0` installed locally (Vite resolves `import * as THREE from 'three'`;
  addons via `three/addons/...` — no CDN importmap)
- Entry: `js/game.js` — renderer, scene, camera, `PointerLockControls`
- Materials: `THREE.MeshStandardMaterial`; world is largely primitive
  box/cylinder geometry (placeholder art — see `asset-pipeline`)

## Renderer rules

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — cap DPR (mobile perf)
- `outputColorSpace = SRGBColorSpace` (three r152+ default, do not regress)
- Shadows: single directional light shadow map, keep `shadow.mapSize ≤ 2048`
  on mobile profiles
- Handle `resize` via one listener updating camera aspect + renderer size

## Scene conventions

1. **Reuse geometry/material instances** across meshes of the same kind
   (buildings, rocks) — never allocate per object per frame.
2. **Dispose on remove**: dispose geometry/material only when not shared.
   Pooled objects must NOT be disposed.
3. **Group by lifetime**: static world group, dynamic entities group,
   transient effects group (particles) — enables cheap visibility toggles.
4. **Raycasting**: maintain explicit `collidables`/`interactables` arrays; do
   not raycast the whole scene graph every frame.
5. **Frame loop hygiene**: zero allocations inside the animation loop
   (reuse scratch `Vector3`s; no `new` per frame).

## Adding a new object (checklist)

- [ ] Geometry + material reused from a cache where possible
- [ ] Object added to the correct group
- [ ] Registered in collision/interaction arrays only if needed
- [ ] Removed from those arrays + scene on despawn
- [ ] Within `game-performance` budget (draw calls, triangles)

## Debugging rendering issues

1. Console errors → usually module/import or shader errors
2. Black screen → camera inside geometry / light intensity (r155+ physical
   lights need higher intensity values)
3. Invisible object → `frustumCulled` / layer / NaN position — log world position
4. Verify visually with `browser-game-verification` (screenshots)

## Integration notes

- Gameplay math never lives here — read state from pure systems
  (`SurvivalSystem`, `InteractionSystem`) and only *present* it.
- Collision is simple AABB/raycast-based; if adding a real physics engine, keep
  the solver behind an adapter so core systems stay pure.
