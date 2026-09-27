---
name: industrial-assets
description: Industrial environment assets for RustGame — generators, pipe networks, machines, tanks, switchgear, conveyors, valves, pumps, ladders, catwalks, silos and HVAC built mechanically believable and modular for instancing. Use when building industrial scenery or machinery, or when the user mentions industrial, generator, pipe, pipeline, valve, pump, tank, conveyor, ladder, catwalk, silo, switchgear or factory.
---

# industrial-assets

## Purpose
Produce mechanically believable industrial machinery and modular pipeline networks whose routing, junctions and controls could actually function, while staying instance-friendly for the desktop <300 draw-call budget and mobile ≥30 FPS floor.

## When to use
- Generators, pipe networks, machines, recyclers, tanks, electrical boxes/switchgear, factory props, conveyor segments, valves, pumps, ladders, catwalks, barrels, industrial containers, HVAC, silos.
- When dressing a monument or factory in `world-generation`, or when a machine must look operable.
- Shared technique in `hard-surface-modeling`; single operable props may also use `prop-modeling`.

## Inputs
- Reference with real dimensions in meters (steel drum 0.88 m tall, 0.58 m dia; pipe DN100 ~0.11 m outer; industrial valve ~0.4 m with handwheel; catwalk width ≥0.8 m).
- Connectivity plan: which pieces join which — write the route (source → elbow → flange → valve → pump → destination) before modeling.
- Context grid: building cells are 3.0 × 3.0 m with 0.2 m thickness; pipe module lengths snap to a consistent step (recommend 1.0 m straight runs).

## Workflow
1. **Mechanical audit in writing** per machine: what does it do, what are its panels/hinges/cable glands/motors, where does power enter (conduit, gland plates), where does fluid exit (flanged nozzles), which surfaces are painted steel vs galvanized vs bare rusted, what leaks or sweats (stains below joints), what gets serviced (removable panels with wing nuts)?
2. **Module plan for pipelines**: define a small repeatable set on a 1.0 m step — straight, 90° elbow, T-junction, flange pair, valve body, cap/blind. One mesh per module, instanced along the route; elbows and Ts are unique small meshes shared across the whole level.
3. **Blockout the run**: lay primitives along the route — cylinders (12–16 sides) for pipe, cubes for machines/tanks, checked against the 1.8 m player capsule (valve handwheel center ~1.0–1.6 m off floor for reachable controls).
4. **Pipe module construction**: cylinder + Loop Cut (Ctrl+R); elbow from a 90° curve segment (Curve with Bevel depth → Convert to Mesh, or spin a profile); flanges as separate short cylinders at each end with bolt circles (6–8 sided cylinders via Array modifier around the axis).
5. **Junction discipline**: every pipe end that meets another carries a flange, collar, weld bead or clamp. Boolean modifier (Exact solver) for T-branch openings and penetration holes through walls/machines — apply in-session, keep cutters in `CUTTERS`, clean with Merge by Distance.
6. **Valve/pump detail**: handwheel (torus + spokes or a 6-spoke array), stem with packing nut, flow-direction arrow cast into the body (geometry or texture), pump volute casing, motor with cooling fins (array of thin boxes), coupling and baseplate bolts.
7. **Machines and switchgear**: panels with recessed seams (0.004–0.010 m), hinges + latches, cable glands at conduit entries, gauges (8-sided cylinder + face), warning labels and arc-flash placards as texture decals, cooling louvers (array), lifting eyes on top.
8. **Structural steel**: ladders with rungs every 0.30 m and side rails, catwalks from planks/deck plate (Solidify 0.003–0.005 m) with toe boards and handrail (tube cylinders at 1.1 m height), supports and gussets as simple boxes — all snapped to the 3.0 m grid where they meet the building.
9. **Material separation** via slots (max 3–4 per asset): painted steel (gloss chipped to bare metal), galvanized (spangle, dull), rusted steel, rubber hose, copper/brass fittings, concrete base/pad. Rust concentrates at joints, bases and below leaks; paint wears at bolt heads and hand-contact areas.
10. **Bevel + normals**: Bevel modifier Angle-limited 0.0005–0.002 m (sheet 0.5–1 mm, cast 1–2 mm), Weighted Normal modifier last, apply both.
11. **Instance pass**: every repeated module shares mesh + material; vary placement by rotation and by swapping between 2–3 texture variants (rusted/painted/galvanized) rather than new meshes. Confirm InstancedMesh suitability before export.
12. **LOD + collision**: LOD1/LOD2 per `lod-generation` for distant pipe runs and silos; `UCX_` boxes/cylinders for machines, drums, tanks and catwalk posts.

## Rules
1. No floating pipes: every run starts at a source (tank, pump, wall penetration, machine nozzle) and ends at a destination, with supports (pipe clamps/brackets every ~2–3 m) along the way.
2. Valves always have a handwheel/lever, a stem, flanged or threaded ends, and a flow direction consistent with the route.
3. Real dimensions in meters from reference; snapping to the 1.0 m pipe step and 3.0 m building grid.
4. Manufactured logic: bolted flanges have matching bolt circles on both sides; panels hinge open; motors have fins and a junction box; nothing is welded where a bolt is required for service.
5. Naming: `SM_Ind_<Type>_<Variant>` (e.g. `SM_Ind_Pipe_Straight_1m`, `SM_Ind_Valve_Gate_A`, `SM_Ind_Generator_A`, `SM_Ind_Ladder_A`), materials `M_Metal_Painted`, `M_Metal_Galvanized`, `M_Metal_Rust`, `M_Rubber_Hose`, textures `T_Ind_Valve_BC/_N/_R/_M`.
6. Budgets: pipe module 40–200 tris, valve 150–500 tris, drum 200–500, pump/generator 500–2500, catwalk/ladder segment 100–400 tris; textures ≤1024 px typical, ≤2048 px only for hero machines seen in first person.
7. Origin at logical pivot (flange center for pipe modules, base center for machines); scale 1.0 applied; faces −Y; no live Booleans or unapplied modifiers in the GLB.
8. Warning labels, gauges readouts and serial numbers live in the texture — decal geometry breaks instancing.

## Quality standards
- A pipe run can be traced with the eye from source to destination; every junction has hardware.
- A machine reads as serviceable: panels, hinges, glands, gauges and labels in plausible places.
- Material break tells the story: painted body, bare worn bolts, rust bleeding from joints, concrete pad stained below leaks.
- No shading artifacts under Matcap; manifold; consistent 12–16 sided cylinders (no mixed densities).
- Instancing verified: repeated modules share one mesh + material; tri totals within budget.

## Output
GLB module set: `SM_Ind_*` meshes (pipe modules, valves, machines, structures), shared `M_` materials, `T_` texture sets, LOD0/1/2, `UCX_` proxies, +Y-up per `export-pipeline`.

## Validation
Run: `blender -b <file>.blend --python .blender/scripts/validate_asset.py` (naming, scale, manifold, tri count, orphan objects, live-modifier check).
Manual checklist:
- [ ] Every pipe route traced: source → run → destination, supports present, no dead-end floating segments
- [ ] Valves have handwheel, stem, flanges and flow direction; flanges match bolt circles
- [ ] Dimensions within ±5% of reference; pipe step 1.0 m, building grid 3.0 m respected
- [ ] Material slots ≤4 with correct painted/galvanized/rust/hose separation
- [ ] Per-asset tri budget met; textures power-of-two ≤1024 (≤2048 hero only)
- [ ] Origin at pivot/base, scale 1.0, faces −Y; no live modifiers; instances share meshes
- [ ] Cross-checked with `asset-naming`, `lod-generation`, `export-pipeline`

## Common mistakes
- Pipes that start and end in mid-air or pass through geometry without collars → instantly reads as fake.
- Inconsistent cylinder density (12-sided here, 32-sided there) → shading breaks and wasted tris.
- Modeling a unique elbow for every corner → defeats instancing; use one shared module.
- Bolts on one flange side only → violates assembly logic.
- Paint texture uniformly rusted → rust must start at joints, bases and leak paths.
- Labels/gauges as geometry → tri cost per instance; bake to the BC texture.
- Handwheels at 2.5 m height → unreachable for a 1.8 m player; keep controls 1.0–1.6 m.
