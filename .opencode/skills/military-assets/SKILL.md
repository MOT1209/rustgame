---
name: military-assets
description: Military environment assets for RustGame — checkpoints, barriers, sandbags, crates, ammo boxes, watchtowers, tents, camo netting and fuel drums as instanced kitbash modules with stencil decals. Use when building military scenery, or when the user mentions military, checkpoint, jersey barrier, razor wire, sandbag, ammo box, watchtower, tent, camo netting, fuel drum or barricade.
---

# military-assets

## Purpose
Deliver military set-dressing whose construction (welded steel, bolted panels, rope lashings) and history (hasty abandonment, combat damage, improvisation) read as environmental storytelling while staying instance-friendly for the <300 draw-call desktop budget and ≥30 FPS mobile target.

## When to use
- Checkpoints, barriers (concrete jersey barriers, razor wire, tank traps), sandbags, military containers/crates, ammo boxes, medical crates, radios, watchtowers, tents, camo netting, fuel drums, field equipment.
- When dressing a monument, roadblock or base in `world-generation`.
- Shared technique with `hard-surface-modeling`; lootable containers hand off to `prop-modeling` and `loot-system`.

## Inputs
- Reference with real dimensions in meters (NATO ammo box ~0.44 × 0.19 × 0.24 m; jersey barrier ~3.2 × 0.8 m; 200 L fuel drum ~0.88 m tall).
- Set-dressing context: checkpoint layout, grid (3.0 m cells), and which pieces must be instanced vs unique.
- Story beat per cluster: abandoned in haste? Improvised under fire? Long-standing and maintained?

## Workflow
1. **Story audit in writing**: what happened here — vehicles fled leaving doors open, sandbags stacked then collapsed, crates split open, barriers dragged into place with scrape marks? Which parts were field-repaired (wire, tape, mismatched panels)?
2. **Kitbash module plan**: define a small module set before modeling — e.g. barrier body, sandbag, crate shell A/B, drum, panel, post, razor-wire strand, netting patch. Each module is one instanced mesh placed many times; count target instances per module to justify its tris.
3. **Blockout the scene** on the 3.0 m grid: Cube primitives for barriers/crates, cylinder for drums/posts, checked against the 1.8 m player capsule (jersey barrier ~0.8 m tall, watchtower legs ≥4 m).
4. **Primary forms**: Extrude (E), Inset (I), Loop Cut (Ctrl+R). Concrete barriers get a trapezoid profile (tapered side extrude) with chipped corners; drums get hoop ribs (inset rings); crates get corner posts and lid lip.
5. **Construction detail**: weld beads (curve with Bevel depth along seams), bolt/rivet arrays (6–8 sided cylinders via Array modifier), bolted access panels with recessed gaps (0.004–0.010 m), rope lashings on sandbag stacks and tent poles (curve + Bevel), hinges and hasps, stenciled-plate recesses.
6. **Combat/age damage**: bent barrier edges, shrapnel pocks (Boolean spheres applied + cleaned), bullet holes only where story demands (as normal-map detail for distant pieces), torn tarp edges, collapsed sandbag rows (deformed duplicate bags).
7. **Sandbags specifically**: one slightly irregular bag mesh (subdivided cube shaped by Proportional Edit, seams pinched at ends), then 3–5 random-rotation instances per stack — never identical bag in a visible row.
8. **Camo netting**: plane with Solidify (0.002 m), Subdivision level 1, then Displace modifier with a noise texture for sag between support poles; cut irregular edges with a Boolean or by deleting face loops. Keep under ~300 tris; alpha cutouts via texture, not geometry strips.
9. **Stencils and markings**: bake into the BC texture as a decal layer (unit markings, serial numbers, "FLAMMABLE", crate lot codes) using a second UV layer or directly painted — decal geometry would explode tri counts on repeated instances. Match `texturing`/`pbr-materials` conventions.
10. **Bevel + normals**: Bevel modifier Angle-limited 0.0005–0.002 m (steel 0.5–1 mm, concrete 2–5 mm chips only on damaged pieces), Weighted Normal last, apply both.
11. **Instance pass**: set shared materials per module (one `M_` per material type — `M_Concrete_Chipped`, `M_Steel_OliveDrab`, `M_Fabric_Camo`), join what is never separated, keep separate what the game toggles. Mark pieces for InstancedMesh: same mesh + material across all copies.
12. **LOD + collision**: LOD1/LOD2 per `lod-generation` for pieces seen at range; `UCX_` boxes for barriers/drums/crates the player can collide with or loot.

## Rules
1. Real dimensions in meters from reference; never invent barrier/crate sizes.
2. Everything is manufactured or field-assembled: welded seams touch both plates, bolts sit in holes, ropes wrap poles — no floating detail.
3. Reuse before uniqueness: a new unique mesh must justify its draw call; prefer instances of an existing module with rotation/scale/paint variation.
4. Stencils and serials live in the texture, not in geometry; each crate/box variant gets a different serial/lot number to break repetition.
5. Naming: `SM_Mil_<Type>_<Variant>` (e.g. `SM_Mil_Crate_Ammo_A`, `SM_Mil_Barrier_Jersey_B`, `SM_Mil_Drum_Fuel_A`), materials `M_Metal_Paint_Olive`, `M_Concrete_Chipped`, `M_Fabric_Camo`, textures `T_Mil_Crate_A_BC/_N/_R/_M`.
6. Budgets: crate/box 150–600 tris, sandbag 60–150 tris, barrier 300–1000 tris, drum 200–500 tris, tower 800–3000 tris; textures ≤1024 px typical, ≤2048 px only for hero checkpoint pieces.
7. Origin at ground-contact base center for placed pieces; at logical pivot for movable lids/doors; scale 1.0 applied, faces −Y.
8. No fantasy or decorative elements — survival/industrial realism only.

## Quality standards
- A cluster tells a story without text: scuffs where barriers were dragged, sand spilled from split crates, netting torn on one side.
- Construction holds up at 2 m: welds, bolts, hasps and rope all read as real assembly.
- Instanced copies vary by rotation, decal/serial and wear level — no visible identical twins in one view.
- No shading artifacts under Matcap; manifold; no z-fighting on stacked bags.
- Tri totals keep the dressed scene within draw-call budget (instance everything repeated).

## Output
GLB module set in the asset export folder: `SM_Mil_*` meshes, shared `M_` materials, `T_` texture sets with baked stencils/serials, LOD0/1/2 variants, `UCX_` proxies, +Y-up per `export-pipeline`.

## Validation
Run: `blender -b <file>.blend --python .blender/scripts/validate_asset.py` (naming, scale, manifold, tri budget, orphan objects).
Manual checklist:
- [ ] Dimensions within ±5% of reference in meters vs the 1.8 m player
- [ ] Every bolt/weld/rope contacts its parent surface; no floating geometry
- [ ] Module plan honored: instances share one mesh + material; variation via transform/texture
- [ ] Stencils/serials in texture; each crate variant has a distinct lot number
- [ ] Per-piece tri budget met; textures power-of-two ≤1024 (≤2048 hero only)
- [ ] Origins at base/pivot, scale 1.0, faces −Y; no live modifiers
- [ ] Cross-checked with `asset-naming`, `lod-generation`, `export-pipeline`

## Common mistakes
- Modeling each sandbag/crate uniquely → tri and draw-call explosion, no instancing possible.
- Floating decals/welds 2 mm off surfaces → visible gaps at grazing angles and broken bakes.
- Copy-paste identical crates in a row → reads as a bug; vary rotation, serial and damage.
- Jersey barriers at invented sizes → breaks player-relative scale.
- Concrete rendered as flat gray with no chipped corners/rebar → reads as untextured blockout.
- Camo netting as full geometry leaves → thousands of tris; use a displaced plane with alpha.
