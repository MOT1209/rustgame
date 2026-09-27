---
name: vegetation
description: Builds game-ready plants for RustGame — trees, bushes, grass, ground cover and dead vegetation — using alpha leaf cards, cross-billboards, instanced scatter, wind-ready vertex data and an LOD0-LOD2 chain within mobile budgets. Use when modeling or optimizing any plant, or when the user mentions tree, bush, grass, foliage, leaves, leaf card, billboard, plant, fern, ferns, dead tree, vegetation or wind sway.
---

# vegetation

## Purpose
Deliver foliage that reads as real species at gameplay distance while costing almost nothing: alpha cards instead of leaf geometry, instancing instead of duplicates, alpha-test instead of transparency, and an LOD chain that fades to a billboard without popping.

## When to use
- Authoring any plant: trees (alive and dead), bushes, grass fields, ferns, shrubs, crop rows, ground cover.
- When foliage tanks FPS, causes transparency sorting artifacts, or looks like cardboard at distance.
- Terrain blending context comes from `terrain`; scatter placement logic comes from `environment-art`.

## Inputs
- Species reference with real dimensions (pine 12-18 m, birch 10-14 m, bush 0.6-1.5 m, grass 0.15-0.6 m) and the season/state (alive, dry, dead, snowless).
- Tri budget: LOD0 tree 1000-5000 tris including cards; bush 200-800; grass is a 1-3 quad card instanced at runtime.
- Texture budget: one POT atlas per species family, <= 1024 px (alpha channel in A), shared across related species where silhouettes allow.

## Workflow
1. **Species plan**: decide card count vs tri budget first. A 3000-tri pine = ~10-sided trunk (240 tris) + ~40 branch stubs + ~60 leaf cards (2 tris each).
2. **Trunk and branches**: Cylinder (8-12 sides) with Loop Cuts (Ctrl+R) tapering upward; branches as Bezier Curves with bevel_depth 0.04-0.12 m, resolution 2, then Object -> Convert -> Mesh and Join to the trunk. Bend with Proportional Editing (O, Smooth falloff).
3. **Leaf cards**: Add -> Mesh -> Plane, Subdivide once, shape the quad into a leaf-cluster silhouette with Proportional Editing; UV via UV -> Cube Projection so the atlas cluster lands square. Never model individual leaves.
4. **Card placement**: rotate each card to face outward from its branch at 20-40 deg tilt, avoid parallel/coplanar card pairs (they vanish edge-on and double overdraw), sink the card root 0.05 m into the branch so no gap appears when it sways.
5. **Material**: Principled BSDF with the atlas in Base Color, Alpha from the leaf texture; alpha mode Alpha Clip / alphaTest 0.5, blend method Opaque, backface culling off (two-sided), roughness 0.6-0.85. Alpha-tested, never alpha-blended — blending sorts wrong behind other foliage.
6. **Wind data**: Weight Paint stiffness (0 at trunk base -> 1 at canopy tips), then Paint -> Vertex Color into Color Attribute `wind` (store in R; optionally store phase in G from a second noise paint). The shader displaces by R; keep trunk vertices near 0 so roots stay planted.
7. **Grass**: single quad with alpha, base edge exactly at Y = 0; cross-billboard variant = two quads joined at 90 deg (three-plane star only for hero clumps). One material, one mesh, 2-6 tris — designed for `InstancedMesh` with per-instance scale/rotation.
8. **Atlas packing**: bake leaf clusters and bark into one 1024 atlas where sensible (UV -> Pack Islands, margin 0.004); alpha margin 4-8 px so mip levels do not eat the leaf edge.
9. **LOD chain**: LOD1 = Decimate -> Collapse 0.4 plus deleting interior cards; LOD2 = billboard — set camera to player eye height (Z = 1.8, orthographic), project UVs from view (UV -> Project from View) and bake Diffuse with alpha to a 512 px card (`lod-generation`).
10. **Bounds and origin**: origin at trunk base on the ground (0, 0, 0), scale 1.0 applied, model faces -Y; decimation and card culling never move the origin.
11. **Export**: GLB with alpha preserved (glTF alphaMode MASK), materials `M_Tree_<Species>_Foliage`, mesh `SM_Tree_<Species>_<Variant>`, textures `T_Tree_<Species>_Leaves` / `_BC`.

## Rules
1. Alpha-test only (alphaTest ~0.5); no alpha-blended foliage anywhere — sorting artifacts and mobile overdraw.
2. No per-leaf geometry. Leaf cards only, sized to a real leaf cluster (0.3-1.2 m across).
3. Overdraw control: no more than 3 card layers along any view ray through the canopy; delete cards the camera never sees from gameplay angles.
4. Wind vertex data on every plant that will sway; trunk base weight 0, tips 1, so roots never lift out of the terrain.
5. Shared atlases across species where silhouettes allow; one material per plant family.
6. Budgets: LOD0 tree 1000-5000 tris, bush 200-800, grass 1-3 quads; textures POT <= 1024, never 4K.
7. Dead/dry variants share the same mesh family and atlas with a different color ramp — do not rebuild geometry per season.
8. LODs keep identical origin, world position and material (no flash on swap).

## Quality standards
- Species readable by silhouette alone at 30 m against sky and ground.
- No dark or "plastic" leaf planes under neutral light; alpha edges clean at 100% zoom, no halo after mipmapping.
- Foliage does not z-fight with terrain — intersect volumes, never coplanar cards.
- Crouch (1.2 m) and stand (1.8 m) views both pass: no card clipping the camera, no see-through trunk.
- Naming `SM_Tree_<Species>_<Variant>` / `T_Tree_<Species>_Leaves` / `M_Tree_<Species>_Foliage`.

## Output
GLB per species with LOD0-LOD2, wind color attribute intact, shared atlas, plus a scatter density note (instances per 100 m2 and target draw-call share) for the runtime instancer.

## Validation
Run in Blender background mode: `blender -b trees.blend --python .blender/scripts/validate_asset.py -- --check foliage`
(script asserts origin at base, alpha channel present, LODs share origin/material, tri budgets, card count per LOD).
Manual checklist:
- [ ] Alpha mode is Alpha Clip / alphaTest 0.5, culling off, no blended foliage
- [ ] Wind attribute: R = 0 at trunk base, 1 at tips; checked in the spreadsheet view
- [ ] Overdraw test: 3+ card layers never stack along one view ray (side view wireframe)
- [ ] LOD flick test at 20 m and 50 m trigger distances: silhouette holds, no pop
- [ ] Tri counts: tree LOD0 1000-5000, bush 200-800, grass quad 1-3 tris
- [ ] GLB re-imported: alpha MASK, textures <= 1024 POT, scale 1.0 applied
- [ ] Naming passes `asset-naming`; export passes `export-pipeline`

## Common mistakes
- Alpha-blended leaf materials -> sorting holes and halos when the camera moves.
- Modeling individual leaves -> tri budget gone before texturing starts.
- Cards parallel to each other -> invisible edge-on and doubled overdraw.
- Wind weight left 1.0 at the trunk base -> trees slide out of the ground when swaying.
- Unique material per tree -> instancing broken, draw calls explode.
- Decimating the LOD without preserving the origin -> tree jumps on level swap.
- Grass quads floating 1-2 cm above terrain -> white gap at grazing angles.
