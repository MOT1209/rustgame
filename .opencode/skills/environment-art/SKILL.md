---
name: environment-art
description: Assembles RustGame locations — towns, forests, roads, military/industrial zones, camps, ruins and villages — from kits and props with correct scale and environmental storytelling (WHERE/WHEN/WHAT HAPPENED/WHY). Use when dressing a scene, kitbashing a landmark, scattering props, or when the user mentions environment, set dressing, landscape, scenery, ruins, camp, village, road, settlement, monument, abandoned or location.
---

# environment-art

## Purpose
Turn kits, terrain and foliage into readable, lived-in places where the player instantly learns WHERE they are, WHEN it was built, WHAT happened here and WHY it looks this way — inside the RustGame budget: `MeshStandardMaterial`, one shadow-casting directional light, desktop <300 draw calls / 60 FPS, mobile >= 30 FPS.

## When to use
- Dressing or re-dressing any location: village, outpost, gas station, quarry, military base, forest clearing, riverside camp, ruined farmhouse, monument.
- Kitbashing a new landmark from building modules and props; deciding placement, scatter and clutter passes.
- This skill produces the geometry; `composition` and `lighting` are applied on top of it afterwards.

## Inputs
- One-paragraph location brief answering WHERE / WHEN / WHAT HAPPENED / WHY IT LOOKS THIS WAY.
- Kit list: building modules (`modular-building`), rocks and cliffs (`terrain`), foliage (`vegetation`), props.
- Reference photos carrying scale cues: door 0.9 x 2.1 m, person 1.8 m, vehicle 1.5 m, ceiling 2.4 m.
- Fixed constraints: metric, 1 BU = 1 m, scale 1.0, model faces Blender -Y, 3.0 m x 3.0 m building grid, GLB export +Y up.

## Workflow
1. **Write the story first** (4 lines, the four questions). Every object placed later must trace back to one of those four answers.
2. **Collection structure**: `ENV_Static`, `PROP`, `FOLIAGE`, `DECAL`, `LIGHT`, hidden `CUTTERS`. Nothing loose at scene root; move structural objects with Ctrl+L -> Link to Collection.
3. **Greybox**: Grid floor object at 3.0 m, Increment snap (Shift+Tab, Snap to Grid). Add a camera at Z = 1.8 (player eye), clip start 0.05, lens 24 mm to match game FOV; review every approach from it (Numpad 0).
4. **Large forms pass**: terrain masses, building shells, road cuts, collapsed structures — silhouette only, no props. The focal point must read from the spawn direction.
5. **Mid props pass**: vehicles, crates, fences, generators, furniture. Repeats are linked duplicates (Alt+D) or Collection Instances (Add -> Collection Instance) so the runtime merges them into one `InstancedMesh`.
6. **Small clutter pass**: tools, bottles, papers, casings, cloth. Cluster near doors, chairs and workbenches — people do not spread things evenly across a floor.
7. **Decal pass**: alpha planes for grime, leaks, scorch, footprints. Shrinkwrap modifier (mode Project, direction Negative Z) onto the host surface, apply, keep in `DECAL`.
8. **Scatter pass**: Geometry Nodes = Distribute Points on Faces -> Instance on Points -> Rotate Instances, Random Value on rotation/scale, fixed Seed; density driven by a Weight Paint vertex group so roads, paths and doorways stay clear.
9. **Ground blending**: Weight Paint transition bands between ground materials, then convert to a Color Attribute (Paint -> Vertex Color) so the blend exports as vertex color for splat blending in the shader.
10. **Placement audit**: for each object state who/what put it there — wind jams it against the wall, water piles it downstream, gravity drops it below the break, decay collapses the weak side. No answer = move or delete it.
11. **Variation**: jitter rotation +/-5 deg and scale +/-8%, alternate A/B/C kit variants so rows never repeat visibly.
12. **Finalize**: apply all transforms (Ctrl+A -> All Transforms), delete Cutters, run naming (`SM_` / `M_` / `T_`), assign LOD levels, export GLB.

## Rules
1. Never scatter at pure random — density is always masked (vertex group or color attribute) with a fixed seed.
2. Human-scale anchors everywhere: door 0.9 x 2.1 m, ceiling >= 2.4 m, eye 1.8 m. Anything compared against a doorway must be dimensionally true.
3. Repeated objects share one mesh and one material (instances only) so they collapse into a single instanced draw at runtime.
4. <= 4 unique materials per scene region; families of props share one texture atlas; textures power-of-two, <= 1024 px typical, <= 2048 px hero.
5. Uniform grid spacing only where a machine placed it (kerbs, tiles, pallets); hand-placed objects are jittered.
6. Storytelling is cumulative: at least 3 evidence pieces per location (barricaded door, dated calendar, personal effects, tool left mid-job).
7. Dressing must fit the budget: target <= 120 draw calls for a location so terrain, foliage and entities still fit inside the 300 total.
8. Heavy objects sink 1-3 cm into the ground; no floating props, no intersecting silhouettes at eye height.

## Quality standards
- From the spawn sightline a viewer states the location's story within 3 seconds.
- Works in clay/matcap grey: silhouette and value hierarchy hold with textures disabled.
- At least 3 distinct roughness responses in one view (wet/dry, painted/bare, smooth/rough).
- Ground contact believable under grazing light; decals show no z-fighting shimmer.
- Naming `SM_<Class>_<Material>_<Variant>` (e.g. `SM_Barn_Wood_A`), materials `M_`, textures `T_`; scale 1.0 applied.

## Output
Dressed `.blend` with the defined collection structure; GLB per cluster (statics merged, repeats instanced, LODs included); the 4-line placement brief; player-eye screenshots (camera Z = 1.8) for review.

## Validation
Run in Blender background mode: `blender -b scene.blend --python .blender/scripts/validate_asset.py` (naming, scale, non-manifold, unique material count, duplicate mesh data, texture size).
Manual checklist:
- [ ] Story brief present; every prop traces to WHERE / WHEN / WHAT HAPPENED / WHY
- [ ] Collections ENV_Static / PROP / FOLIAGE / DECAL / LIGHT populated; no objects at scene root
- [ ] Player-eye screenshots: focal point readable, no empty dead frames
- [ ] Repeats are instances sharing one material (unique mesh datablock count checked)
- [ ] No floating props, no coplanar decal z-fighting, scale 1.0 applied, faces -Y
- [ ] Texture sizes power-of-two within budget; <= 4 materials per region
- [ ] Cross-checked with `composition` and `lighting` before sign-off

## Common mistakes
- Uniform random scatter -> objects inside walls, on paths, floating mid-air.
- Detail-dressing before the greybox reads; a weak composition cannot be rescued by props.
- A unique mesh and a unique material per repetition -> draw-call explosion on mobile.
- Story told by one "spooky" prop instead of accumulated, mundane evidence.
- Scale drift (1.4 m door, 2.5 m person) -> instantly wrong at eye height 1.8 m.
- Coplanar ground decals -> z-fighting shimmer, worst on mobile GPUs.
- Debris placed against gravity, wind or water flow -> the scene reads as fake.
