---
name: collision-mesh
description: Generate optimized collision proxies for RustGame assets — box, capsule, sphere, convex hull or simplified custom meshes named UCX_, sized for the game's AABB/raycast collision. Use when adding hit detection, blocking volumes, doors, stairs or interactable raycast targets, or when the user mentions collision, collider, UCX, hitbox, physics proxy, raycast target, blocking or capsule.
---

# collision-mesh

## Purpose
Author cheap, stable, predictable collision geometry that matches the visual silhouette closely enough that hits and blocks feel right, while staying far below the visual mesh in triangle count.

## When to use
- After `lod-generation`, before `export-pipeline`, for every asset the player can touch: walls, doors, crates, floors, stairs, ramps, vehicles, characters, animals.
- When raycasts miss or overshoot a prop, when projectiles pass through geometry, or when gameplay alignment (0.9 × 2.1 m doorways) must be enforced.

## Inputs
- Final visual mesh with applied scale and convention origin.
- Gameplay dimensions: 3.0 m grid, 0.2 m slab/wall thickness, 0.9 × 2.1 m door opening, 1.8 m player capsule.
- Choice from the primitive hierarchy below (box → capsule → sphere → convex hull → simplified custom mesh → triangle mesh last resort).

## Workflow
1. **Pick the primitive**: box for crates/furniture/props, capsule for characters/animals, sphere for round objects (grenades, barrels end-on), compound of boxes for irregular statics, convex hull for vehicles and large irregular props, simplified custom mesh only where boxes fail gameplay — stairs, ramps, doorways, terrain chunks.
2. **Create the proxy**: Shift+A → Cube (or Mesh → Convex Hull from selected verts), scale it to the gameplay dimension, position over the visual mesh. For a compound, duplicate boxes per major mass.
3. **Name it**: `UCX_<AssetName>` — e.g. `UCX_SM_Military_Crate_A`. Object, mesh datablock and GLB node name all agree (see `asset-naming`).
4. **House it**: move every proxy into a dedicated `COLLISION` collection in the Outliner; keep it separate from renderable geometry.
5. **Keep it tiny**: box ≈12 tris, convex hull ≤32–64 tris; delete hidden faces of the proxy (bottom of a floor box, back of a wall box) with Select All by Trait → Interior Faces / back-face selection.
6. **Align gameplay surfaces**: door proxies exactly 0.9 m wide × 2.1 m tall; wall proxies 3.0 × 3.0 × 0.2 m; one proxy per step tread/riser so the capsule climbs without catching. Measure with Sidebar (N) → Dimensions, never by eye.
7. **Mark for export**: enable `export_extras` so collision metadata rides in the GLB; also tag the proxy object custom property `collision` = `box|capsule|hull|mesh` for the importer.
8. **Tunneling guard**: colliders for surfaces hit by fast projectiles must be ≥0.1 m thick (walls 0.2 m) — a zero-thickness plane lets a ray skip between frames.
9. **Verify in engine**: spawn the asset in RustGame, walk into it, shoot it, place a building piece against it — contact must line up with the visual edge within ~2 cm.

## Rules
- Never use the visual mesh as collision unless it is genuinely simple (a plain box prop may share one mesh).
- Collision objects are excluded from rendering — they live in `COLLISION`, not in the renderable hierarchy, and never receive materials.
- No collision on decorative sub-meshes: handles, decals, hinges, foliage cards get none.
- Collision shape is a separate object from the visual mesh; the visual mesh never doubles as `UCX_`.
- Proxy world position and origin match the visual asset — otherwise hits drift after placement.
- Physics engine is behind an adapter; today the game reads AABB/raycast, so boxes and capsules are the primary deliverable.

## Quality standards
- Proxy silhouette hugs the visual within ~2 cm on gameplay-critical faces (door jambs, floor level, crate top for loot placement).
- Total collision tris per asset ≤64 (typical ≤12 for box props).
- Stable and predictable: no overlapping same-type proxies causing jitter, no zero-thickness faces, no negative scale.
- Collision proxies carry no materials, no UV and no texture requirement — geometry only.
- Raycast test from the player eye (1.8 m) hits the intended surface, not the background.

## Output
`UCX_` objects in a `COLLISION` collection, exported inside the GLB (via `export_extras`) or as documented metadata, plus the primitive type recorded in the asset QC sheet.

## Validation
Manual:
- [ ] Every visual asset that blocks/raycasts has a `UCX_` proxy with matching dimensions
- [ ] Door proxy measures 0.9 × 2.1 m; wall proxy 3.0 × 3.0 × 0.2 m
- [ ] Collision tris ≤64; box proxies ≈12 tris; hidden faces removed
- [ ] `COLLISION` collection contains all proxies and nothing renderable
- [ ] In-game walk/shoot/place test: contacts align with the visual surface

Runnable checks — must exit 0:
```
blender -b asset.blend --python .blender/scripts/validate_asset.py -- --check collision
```

## Common mistakes
- Using the high-poly visual mesh as collider → raycast cost explodes on mobile.
- Proxy measured by eye — doors that do not fit the player capsule, stairs that catch.
- Missing or misnamed `UCX_` object → importer silently finds no collision, players walk through walls.
- Zero-thickness plane colliders → projectile tunneling.
- Forgetting to align the proxy origin with the visual → collider drifts after the asset is placed or rotated.
- Decorative sub-meshes left with collision → invisible walls around handles and decals.

Cross-links: `asset-naming`, `game-ready-assets`, `export-pipeline`, `modular-building`, `combat-system`.
