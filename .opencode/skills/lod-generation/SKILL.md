---
name: lod-generation
description: Build LOD0-LOD3 chains for RustGame assets with matched pivots, silhouettes, materials and per-category trigger distances so distance transitions never pop. Use when assets need distance variants, far objects cost FPS, or the user mentions LOD, level of detail, lod chain, lod0, lod1, billboard, impostor, pop-in, distant meshes or mesh simplification.
---

# lod-generation

## Purpose
Produce a LOD chain per asset that halves triangles at each step while holding silhouette, pivot, world position and materials steady, so Three.js can swap levels without a visible pop.

## When to use
- After `low-poly-optimization` and before `export-pipeline`, for anything seen beyond 15 m: hero props, characters, animals, trees, vehicles, building modules.
- When draw calls/triangles blow the budget (`game-performance`), when distant meshes pop or shimmer, or when a new asset class gets its LOD policy defined.

## Inputs
- Approved LOD0 low poly (clean normals, final UV, applied scale, origin at convention point).
- Category → trigger-distance table below; texture budget (1024 typical / 2048 hero only).
- Materials/atlas plan: all LODs share the same materials where possible.

## Workflow
1. **Duplicate the base**: Shift+D the LOD0 object, keep the exact same location — never re-center or the object jumps on swap. Set Origin to the same point on every level (Object → Set Origin → Origin to 3D Cursor).
2. **Name it**: `SM_Pine_Tree_A_LOD1` (see `asset-naming`); mesh datablock gets the same name; put LODs in a `LOD` collection.
3. **Reduce**: Decimate → Collapse, ratio 0.5 for LOD1, 0.25 for LOD2, 0.1 for LOD3 (start points only — then hand-clean: dissolve flat areas at 5°, collapse support loops, remove buried geometry). Vegetation/far clutter instead gets alpha-card conversion: delete interior geometry, replace leaf clusters with alpha-tested planes sharing the leaf atlas.
4. **Silhouette check**: front/side/three-quarter renders of LOD0 and LOD1 at trigger distance flicked together — outer profile must match; cut bulk from the interior first, silhouette edges last.
5. **Bake support**: LODs below LOD1 usually drop normal/AO maps (vertex-colored or single base color) — reuse the same base-color atlas to avoid extra materials.
6. **Texture step-down**: 2048 → 1024 → 512 px per level for hero assets; keep ORM packing (see `pbr-materials`).
7. **Material match**: identical material slots and names across levels — swapping materials on a distance change causes a visible flash.
8. **Billboard/impostor (LOD3)**: render the asset from the gameplay camera angle (Blender: camera aligned to player eye 1.8 m, orthographic) onto a plane; use as a cross-plane or single card for far trees/clutter.
9. **Verify distances**: in-game (or a Three.js test scene) confirm each level swaps at its trigger distance with no jump, no scale change, no material flash.

## Rules
- Pivot, world position and origin identical across all LODs — never re-center per LOD.
- Each step roughly halves triangles (LOD0 100% → LOD1 ~50% → LOD2 ~25% → LOD3 ~10%/card).
- Matched materials/textures across levels; share the atlas.
- Suffix convention `_LOD0/_LOD1/_LOD2` (also valid as glTF node names `_lod0`); LOD0 is always present.
- LOD1+ may drop bevels, small tertiary detail and interior faces; never drop gameplay-readable features within its trigger range.

### Trigger distance table
| Category | LOD0 | LOD1 | LOD2 | LOD3 |
|---|---|---|---|---|
| Hero prop / character | 0–15 m | 15–40 m | 40–80 m | 80 m+ (billboard) |
| Building module | 0–25 m | 25–60 m | 60 m+ | — |
| Tree | 0–20 m | 20–50 m | 50 m+ (impostor) | — |

## Quality standards
- No visible pop at the swap point under normal camera motion (test at the trigger distance, strafing).
- LOD chain tri counts monotonic: each level strictly lighter than the previous.
- Same materials, same textures, same origin, same world position on every level.
- LOD3/impactors still legible as the object at 80 m against the sky/ground.

## Output
A `LOD` collection per asset with named levels, plus trigger distances recorded for the renderer so RustGame can swap levels (frustum culling + distance check).

## Validation
Manual:
- [ ] All levels share identical object location/origin (compare coordinates, not eyeballs)
- [ ] Tri counts halve per level and are strictly decreasing
- [ ] Flick-test renders at trigger distance: silhouette unchanged
- [ ] Materials/textures identical across levels
- [ ] In-browser swap test: no jump, no flash, mobile FPS improves (`game-performance`)

Runnable checks — must exit 0:
```
blender -b asset.blend --python .blender/scripts/validate_asset.py -- --check lods
```

## Common mistakes
- Re-centering the origin per LOD → object teleports when the level swaps.
- LOD1 heavier than LOD0 because bevels were kept and detail was added instead of removed.
- Different materials per level → color/lighting flash at the transition.
- Skipping the silhouette check → thin objects (branches, antennas) vanish early.
- Forgetting LOD on a 500-tri clutter prop that never needs one — wasted pipeline time.
- Exporting only LOD0 and assuming Three.js will simplify at runtime (it does not).

Cross-links: `low-poly-optimization`, `game-ready-assets`, `export-pipeline`, `game-performance`, `vegetation`.
