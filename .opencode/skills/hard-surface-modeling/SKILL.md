---
name: hard-surface-modeling
description: Build game-ready hard-surface assets for RustGame — buildings, weapons, tools, machines, vehicles, containers, industrial and military equipment — in Blender 4.x/5.x with controlled bevels, booleans and manufacturing logic. Use when modeling anything mechanical, man-made or structural, or when the user mentions hard surface, weapon, gun, vehicle, machine, metal, panel, bevel, boolean, container, turret, furnace or industrial.
---

# hard-surface-modeling

## Purpose
Produce structurally believable man-made meshes whose forms read correctly at game distance and survive the full universal pipeline (BLOCKOUT → PRIMARY → SECONDARY → TERTIARY → HIGH POLY → LOW POLY → … → EXPORT).

## When to use
- Buildings and building modules, weapons, tools, machines, vehicles, shipping containers, industrial/military equipment.
- Any asset where construction logic (sheet metal, welds, bolts, panel gaps) matters more than organic form.
- Not for crates, bottles or furniture (prop workflow) or for organic/creature forms (sculpt workflow).

## Inputs
- Reference (photo set or sketch) with real dimensions; building-grid constraints (3.0 m × 3.0 m cells, 0.2 m slab/wall thickness, door 0.9 × 2.1 m) when the asset is architectural.
- Target tri budget and LOD tier before blocking out.
- Unit scale confirmed: metric, 1 BU = 1 m, scale 1.0, model faces Blender −Y.

## Workflow
1. **Reference + dimensioning**: gather 3-view references; write real dimensions in meters. Establish which parts are stamped, cast, extruded or welded.
2. **Blockout**: cube/cylinder primitives snapped to the 3.0 m grid where applicable. Verify silhouette against the 1.8 m player capsule in Front view (Numpad 1). Freeze nothing yet.
3. **Primary forms**: Box Modeling with Extrude (E), Inset (I), Loop Cut (Ctrl+R) and Bevel (Ctrl+B). Keep n-gons out of curved regions; use only quads and triangles at this stage.
4. **Boolean holes**: Boolean modifier (Exact solver) for ports, sight holes, cutouts — apply, then clean with Merge by Distance (Alt+M) and Triangulate/quadrify the leftover ngons. Keep the cutter objects in a hidden `CUTTERS` collection for later re-runs.
5. **Panel gaps and seams**: model gaps as real geometry (0.004–0.010 m recess) via Extrude along normals on split shells — never as painted lines only.
6. **Controlled bevels**: Bevel modifier, `limit_method: Angle`, width 0.0005–0.002 m (0.5–2 mm realistic chamfer), segments 1–2. Harden normals ON. Apply before export. Never randomize bevel width per-object for "style".
7. **Creasing + normals**: mark sharp edges (Ctrl+E → Mark Sharp) or Edge Crease where a hard manufactured break exists; add Weighted Normal modifier (`keep_sharp: True`, `weight: 50`) as the last modifier, then Apply. Enable Auto Smooth only if the Blender version still requires it.
8. **Support loops**: only when subdividing (Subdivision Surface level 1–2 for cast/forged parts). Two loops bracketing each hard edge, spaced 0.002–0.005 m. If you are not subdividing, do not add support loops.
9. **Secondary detail**: bolt patterns (array of low-count cylinders, 6–8 sided), rivets, weld beads (curve + Bevel depth or a simple torus section), hinge barrels, vents (array modifier), latches, cable runs (Curve → Convert to Mesh).
10. **Tertiary wear geometry**: limit to silhouette-breaking damage — dents, bent corners, chipped paint edges — via sculpt or proportional edit. Fine pitting belongs in the normal map (hand off to `high-to-low-baking`).
11. **Manufacturing audit**: check sheet thickness (≥0.01 m visible edge), draft angles on cast parts, no floating geometry, no impossible assembly (a lid must be able to close; a panel must be reachable by a tool).
12. **Low-poly pass**: apply modifiers, remove interior faces, decimate only flat runs. Meet the budget, then hand off to `retopology` if the count is exceeded, then `uv-unwrapping`.

## Rules
1. Bevel width is derived from real material: sheet metal 0.5–1 mm, cast iron 1–2 mm, plastic 0.5 mm. Never bevel "because it looks nicer".
2. One Weighted Normal modifier, applied last. No overlapping normal-fixing stacks.
3. Booleans are applied and cleaned in the same session — never ship live Boolean modifiers in a GLB.
4. No floating detail geometry: every bolt, handle and bracket must intersect or weld to a parent face.
5. Model faces Blender −Y; origins at logical pivot (door hinge, wheel axle, weapon grip); apply scale before export.
6. Polygon budgets (LOD0): building module 200–800 tris, weapon 1500–6000 tris, vehicle 5000–20000 tris. Exceed → flat-run decimation or hand off to `retopology`.
7. N-gons only on flat, non-deforming, non-subdivided surfaces; never spanning a bevel.

## Quality standards
- Reads as manufactured: consistent gaps, symmetric bolt patterns, plausible sheet thickness.
- Silhouette holds at 5 m distance and against a bright sky.
- No shading artifacts (pinching, black spots) under a Matcap with sharp specular.
- Naming: `SM_<Type>_<Material>_<Variant>` (e.g. `SM_Wood_Wall_A`, `SM_Barrel_Metal_B`); materials `M_Metal_Rust`, textures `T_…_BC`.
- Tris within budget; no non-manifold geometry; scale 1.0 applied.

## Output
GLB (glTF) in the asset export folder, +Y-up on export, with `SM_` naming, materials prefixed `M_`, and a collision proxy mesh named `UCX_<asset>` ready for `collision-mesh`.

## Validation
Run in Blender background mode: `blender -b file.blend --python .blender/scripts/validate_asset.py` (checks non-manifold, scale, naming, tri count, normals, floating parts).
Manual checklist:
- [ ] Bevel width 0.5–2 mm, segments ≤2, applied
- [ ] Weighted Normal applied, no shading artifacts under Matcap
- [ ] No live Boolean/live modifiers in the export mesh
- [ ] No interior faces, no floating geometry, manifold
- [ ] Scale 1.0 applied, faces −Y, origin at logical pivot
- [ ] Tri count within budget for its tier
- [ ] Cross-checked against the naming convention and `export-pipeline`

## Common mistakes
- Random bevel widths per object → inconsistent light response.
- Subdividing a boxy mesh without support loops → blobby edges.
- Boolean cutters left unapplied or ngon soup after apply → broken bake normals.
- Detail modeled that no process could manufacture (welds floating 2 mm off the panel).
- Over-subdivision to "get detail" → tri budget blown before texturing.
- Painting panel gaps instead of modeling them → flat reads at grazing angles.
