---
name: destruction
description: Author damage states for RustGame — damaged walls, broken doors, destroyed vehicles, ruined containers and debris — as a four-tier variant set with physically believable breaks (mortar, grain, impact cones, rebar, tears, glass). Use when adding or fixing damage, ruins or rubble, or when the user mentions destruction, damaged, broken, destroyed, ruin, rubble, debris, crack, spall, rebar, shattered, wreck or impact.
---

# destruction

## Purpose
Make damage tell the truth about what happened: cracks follow material weakness and stress, breaks conserve mass (the missing piece is on the floor as debris), and every asset ships a consistent Minor -> Medium -> Severe -> Destroyed tier ladder the gameplay code can step through.

## When to use
- Creating damage variants for walls, doors, vehicles, containers, monuments; authoring debris piles; setting up the tier ladder used by health/damage systems.
- When damage looks like a noise filter instead of an event, or when a "destroyed" asset has no believable failure mode.
- Partner skill for wear/weathering layers: `texturing` handles grime; this skill handles broken geometry.

## Inputs
- The undamaged asset plus its material and load case (what force failed it: impact, fire, weight, blast, vehicle strike).
- Tier definition per asset: Dmg0 undamaged / Dmg1 minor / Dmg2 medium / Dmg3 severe-or-destroyed.
- Debris budget: each debris piece 40-120 tris, 3-6 variants per family, instanced at runtime.

## Workflow
1. **Failure analysis first**: write how it failed and where the stress concentrated. Mortar joints in brick, grain direction in wood, aggregate cones in concrete, sheet seams in metal, impact point in glass. Cracks follow those lines — never cross them randomly.
2. **Variant setup**: duplicate the base object per tier, rename `SM_<Asset>_Dmg1/2/3`, keep identical origin, scale and world position so tiers swap in place at runtime.
3. **Cut the break**: Boolean modifier (solver Exact) with a rough cutter (Icosphere + Displace modifier, Clouds texture, strength 0.2) for the missing chunk; Apply, then Merge by Distance and Recalculate Normals Outside (Shift+N). Keep cutters in hidden `CUTTERS`.
4. **Broken edge pass**: Bevel modifier limited to Angle 30 deg, width 0.005-0.02 m, 2 segments on the fracture rim only — masonry breaks are sharp but not knife-sharp; apply.
5. **Spalling and chipping**: Sculpt Mode with Clay Strips (shallow scoops around the rim) and Draw Sharp (crack lips); or Displace with Voronoi texture masked by a vertex group painted around the break. Concrete spalls in shallow cones, not squares.
6. **Rebar**: 8-sided cylinders run along the break plane, sunk 0.05 m into the concrete core, bent with Proportional Editing (O, Random falloff). 4-6 bars for a 3 m wall; exposed metal gets a rust material, no paint.
7. **Wood failure**: split along grain — Extrude (E) thin slivers from the rim, taper and rotate them along the grain; broken ends splinter, they do not saw. Cross-grain tearing only at the impact point.
8. **Metal failure**: tear = Boolean slit, then bend both lips with Proportional Editing and Smooth; dents = shallow negative sphere Boolean + Smooth shading. Metal bends and tears — it never cracks like stone.
9. **Glass**: Cell Fracture (Edit -> Preferences -> Get Extensions -> "Object: Cell Fracture", then Object -> Quick Effects -> Cell Fracture / `object.add_fracture_cell_objects`) on the pane with ~40 cells; keep radial + concentric shards from the impact point, delete interior cells, leave a jagged rim on the frame.
10. **Debris authoring**: the material removed in step 3 becomes separate low-poly pieces (`SM_Debris_<Material>_<Variant>`, 40-120 tris) with mass-conserving scale; piles placed with gravity bias (below the break, stacked, never floating) and water/wind direction where the scene calls for it.
11. **Tier blend (optional)**: vertex-blended damage only if the shader supports it — paint damage masks as Color Attribute and blend the texture set; default delivery is separate mesh variants, which is cheaper and works everywhere.
12. **LOD and export**: severe tiers drop interior detail (Decimate 0.4); destroyed tier = stub mesh + instanced debris. Export GLB per tier ladder via `export-pipeline`.

## Rules
1. Damage is physically believable: cracks follow mortar joints, wood grain and impact cones; concrete exposes rebar at breaks; wood splinters along grain; metal tears and bends, never cracks; glass goes radial + concentric from the impact point.
2. No random crack decals on undamaged geometry — Dmg0 may carry grime and fading only, no fractures.
3. Mass is conserved: what left the wall is on the ground as debris, in plausible proportion and directly below.
4. Silhouette changes at Dmg2 and above (chunks actually missing); texture-only damage is Dmg1 at most.
5. Tiers share origin, bounds direction and material slots so gameplay can swap meshes in place.
6. Debris is always a separate low-poly asset for physics/instancing — never animate or collide with the hero mesh.
7. Damage direction is consistent across the asset family (one storm, one battle, one timeline) — mixed directions read as noise.
8. Naming `SM_<Asset>_Dmg<0-3>`, debris `SM_Debris_<Material>_<Variant>` per `asset-naming`.

## Quality standards
- Each tier recognizable in silhouette and in clay grey at 5 m.
- Break rims read as the material: crumbly concrete, stringy wood, bent steel, sharp glass.
- No floating rebar, no debris hovering, no debris intersecting the floor plane more than 50%.
- Tris: wall tier <= 800 (Dmg0-3), debris piece 40-120; destroyed variant lighter than severe.
- All tiers of one asset use the same material set and texture atlas.

## Output
One GLB per asset containing the tier ladder (`_Dmg0` .. `_Dmg3`), a debris set GLB (3-6 instanced variants), a short damage narrative (what failed it) attached to the asset log.

## Validation
Run in Blender background mode: `blender -b damaged.blend --python .blender/scripts/validate_asset.py -- --check damage`
(script asserts per-tier origin identity, monotonic tri counts, manifold after Boolean, debris tri budgets, naming pattern).
Manual checklist:
- [ ] Origin and world position identical across Dmg0-Dmg3 (compare coordinates)
- [ ] Cracks traced against material weakness — mortar/grain/cone direction respected
- [ ] Rebar present at concrete breaks, splinters follow grain, metal has no crack lines
- [ ] Mass check: removed volume roughly equals debris pile volume
- [ ] Dmg0 has grime only, zero fractures; Dmg2+ changes silhouette
- [ ] Debris pieces manifold, 40-120 tris, separate meshes, gravity-correct placement
- [ ] Naming passes `asset-naming`; tri budget passes `low-poly-optimization`

## Common mistakes
- Crack decals painted on an intact wall -> reads as graffiti, breaks the tier system.
- Damage with no missing silhouette -> looks like a texture filter at gameplay distance.
- Boolean break left unapplied or ngon soup after apply -> broken normals and bake artifacts.
- Debris scaled uniformly from the wall chunk -> obviously fake repetition.
- Cracks running across brick instead of along mortar -> instantly wrong to the eye.
- Rebar modeled on wood or glass failure -> material logic ignored.
- Per-tier materials or origins -> tier swap flashes or teleports the mesh.
