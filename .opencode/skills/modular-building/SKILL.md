---
name: modular-building
description: Builds the reusable RustGame building kit — foundation, wall, half wall, floor/ceiling, roof, door and window frames, door, window, stairs, pillar, beam — locked to the 3.0 m grid, 0.2 m thickness, one origin convention and one shared UV atlas so pieces tile without gaps or z-fighting. Use when creating, fixing or snapping a build piece, module, grid, foundation, wall, roof, doorway, window, stairs, pillar or beam.
---

# modular-building

## Purpose
Produce interchangeable building modules that snap, rotate and tile perfectly on RustGame's construction grid, so the game can place them procedurally (and eventually generate structures) without gaps, z-fighting or per-piece special cases.

## When to use
- Any new or edited build piece: foundation, wall, half wall, floor/ceiling, roof, door frame, window frame, door, window, stairs, pillar, beam.
- When a piece does not snap, does not tile, z-fights its neighbour, or breaks when rotated 90 degrees.
- Before the building system wires a piece into placement data — art first, then gameplay.

## Inputs
- Module spec (type, tier twig/wood/stone/metal, variant) and target bounds.
- Grid contract: 3.0 m x 3.0 m cells, 0.2 m slab/wall thickness, door opening 0.9 x 2.1 m, eye height 1.8 m standing / 1.2 m crouched.
- Existing game-data sizes to match exactly: foundation [3, 0.2, 3], wall [3, 3, 0.2], doorway [3, 3, 0.2], ceiling [3, 0.2, 3], tool_cupboard [1, 1.8, 0.8], wooden_door [0.9, 2.1, 0.1].
- Shared UV atlas layout and material set of the kit (one `M_` per tier family).

## Workflow
1. **Spec sheet**: write the module's exact bounds in meters before touching geometry; every number must be a multiple of 0.1 and fit the 3.0 m lattice.
2. **Grid setup**: Scene units metric, scale 1.0; enable snapping (Shift+Tab) with Element = Increment and Absolute Grid Snap; add a reference Grid floor object of 3.0 m to build against.
3. **Blockout**: Add Cube, then in the Sidebar (N) type exact Dimensions (3.0 / 0.2 / 3.0) — never eyeball with the Scale tool. Mesh sits with bottom face at Y = 0, X and Z centered on the origin.
4. **Origin convention**: place the 3D cursor at the footprint center on the ground plane, then Object -> Set Origin -> Origin to 3D Cursor. Every module uses this one rule, so a snapped pivot always lands on the lattice (cell center or edge midpoint) and 90-degree rotations keep it on grid.
5. **Openings**: Boolean modifier (solver Exact) with a cutter cube sized 0.9 x 2.1 for doorways / 1.2 x 0.9 for windows; Apply, then Merge by Distance (M -> By Distance) and Recalculate Normals Outside (Shift+N). Keep cutters in hidden `CUTTERS`.
6. **Frame thickness discipline**: the reveal around an opening keeps the nominal 0.2 m — do not thin the jamb "to save tris"; adjacent pieces must never produce two faces in the same plane (that is z-fighting, not tolerance).
7. **Tiling test**: Shift+D the piece, snap it to the next cell in X and Z, and rotate 90/180/270 degrees. Check with N-panel world bounds that edges butt exactly (no gap > 0.001 m, no overlap, no coplanar faces).
8. **Variants A/B/C**: duplicate the approved module and vary only tertiary detail (plank layout, bolt pattern, chips) while bounds, origin and openings stay identical — variants swap freely at runtime.
9. **Detail strategy**: no baked-in unique geometry that breaks tiling (no asymmetric dirt lump, no extruded graffiti crossing a tile edge); wear belongs in the shared atlas/normal map (`high-to-low-baking`), so run bakes on the variant, not on the base tile.
10. **Shared UV atlas**: UV -> Cube Projection with cube size = 1.0 m for consistent texel density, then UV -> Pack Islands (margin 0.004) into the kit's single atlas; all tiers of a module family share one material so instances merge.
11. **LOD**: LOD0 200-800 tris; Decimate -> Collapse ratio 0.4 for LOD1 and 0.15 for LOD2, same origin and bounds (`lod-generation`).
12. **Collision**: duplicate the blockout shell as `UCX_<module>`, a box exactly matching visual bounds (foundation 3 x 0.2 x 3, wall 3 x 3 x 0.2, door 0.9 x 2.1 x 0.1) — collider must never be smaller than the visual or players clip through (`collision-mesh`).
13. **Export**: name `SM_B_<Module>_<Tier>_<Variant>`, apply transforms, export GLB via `export-pipeline`.

## Rules
1. Grid snap: 3.0 x 3.0 m footprint, origins identical (footprint center, bottom face Y = 0, X/Z centered), rotation only in 90 degree increments.
2. Thickness: 0.2 m nominal everywhere; one wall face per side per piece; never two coplanar faces between neighbours.
3. Tiling: modules must sit flush with zero gap and zero overlap; verify in X, Z and all four rotations.
4. One shared UV atlas and one material per tier family across the whole kit.
5. No unique baked detail that forbids mirroring, rotating or tiling the module.
6. Variants change appearance only — never bounds, origin or opening size.
7. Collision boxes match visual bounds exactly; stairs and doorways keep the 0.9 x 2.1 clear opening and 1.8 m headroom.
8. Scale 1.0 applied, faces Blender -Y, manifold, no live modifiers at export.

## Quality standards
- A 4 x 4 x 2 stack of mixed variants reads as one continuous structure with no visible seams or shimmer.
- Door, window and stair modules align with the player capsule (1.8 m / 1.2 m) with clearance.
- Every module passes the same bounds table (foundation [3,0.2,3], wall [3,3,0.2], doorway [3,3,0.2], ceiling [3,0.2,3], door [0.9,2.1,0.1]).
- Tris within 200-800 (LOD0); atlas shared; naming follows `asset-naming`.

## Output
GLB per module family (LOD0-LOD2 in one file), the collision proxy, the kit atlas and material, plus a bounds table used by placement code and by the snapping validator.

## Validation
Snapping validation method: build `snap_test.blend` — a 6 x 6 grid where every cell holds one module at 0/90/180/270 rotation, then run:
`blender -b snap_test.blend --python .blender/scripts/validate_asset.py -- --check grid`
(script asserts world bounds fall on the 3.0 m lattice, AABBs never overlap, no two faces are coplanar, all origins identical).
Manual checklist:
- [ ] N-panel dimensions match the spec table exactly
- [ ] Origin at footprint center, bottom Y = 0, scale 1.0 applied
- [ ] Shift+D + snap test: zero gap, zero overlap, no z-fighting in all 4 rotations
- [ ] Doorway opening 0.9 x 2.1 clear, headroom 1.8 m, collider equals visual bounds
- [ ] Variants A/B/C share bounds/origin; all share one atlas and material
- [ ] Tri budget and LOD chain pass `lod-generation`; naming passes `asset-naming`

## Common mistakes
- Eyeballing size with the Scale tool instead of typing exact dimensions -> off-grid pieces that never snap.
- Origin at geometry center instead of the ground-plane footprint -> piece floats or sinks on placement.
- Two pieces meeting with overlapping coplanar faces -> z-fighting shimmer in-game.
- Modeling detail that crosses a tile edge -> visible seam when the piece repeats or mirrors.
- Per-variant materials -> instanced pieces no longer batch, draw calls climb.
- Collision box smaller than the visual mesh -> players walk through walls.
- Exporting with live Boolean/scale modifiers -> bounds and pivots differ from the spec table.
