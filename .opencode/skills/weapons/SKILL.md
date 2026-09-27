---
name: weapons
description: Dedicated weapon-asset pipeline for RustGame — melee, firearms, improvised and thrown explosives modeled with working mechanics, attachment points and first-person viewmodel LODs in Blender 4.x/5.x. Use when creating or fixing any weapon mesh, or when the user mentions weapon, gun, rifle, pistol, shotgun, machete, spear, sword, club, knife combat, blade, magazine, bolt, muzzle, sight, attachment or viewmodel.
---

# weapons

## Purpose
Produce game-ready weapon meshes whose mechanisms are mechanically believable, whose proportions match real reference dimensions in meters, and whose LOD0 viewmodel quality and tri budget survive first-person play on desktop (60 FPS) and mobile (≥30 FPS).

## When to use
- Any offensive item: melee (spear, machete, sword, club), firearms (pistol, rifle, shotgun), improvised weapons (rebar, pipe, hatchet), thrown explosives (grenade, molotov).
- When adding attachment sockets, viewmodel LODs, or weapon collision to the game.
- For the firing/damage logic use `combat-system`; for generic hard-surface technique use `hard-surface-modeling`.

## Inputs
- Reference photos with real dimensions written in meters (e.g. AK-47 ~0.88 m overall, 1.1 kg; machete ~0.5 m blade).
- Weapon category and whether it is a first-person viewmodel, world/dropped item, or both.
- Hand pose anchor: player eye height 1.8 m standing / 1.2 m crouched defines grip placement in world space.

## Workflow
1. **Realism audit in writing** before geometry: how is it manufactured (stamped receiver, forged barrel, injection-molded polymer)? Which parts move (bolt, trigger, hammer, pump, cylinder, magazine, sliding blade)? Where does it wear (bluing rubbed at holster edges, wood darkened at the grip)? What breaks first (sights, magazines, triggers)?
2. **Dimension blockout**: place a 1.8 m player capsule and a rough hand cube; block the weapon from real dimensions using Cube/Cylinder primitives. Verify grip-to-trigger distance (~0.07–0.09 m) against the hand cube. Model faces Blender −Y.
3. **Primary hard-surface pass**: Extrude (E), Inset (I), Loop Cut (Ctrl+R), Bevel (Ctrl+B). Boolean modifier (Exact solver) for ejection port, trigger guard interior, sight channels — apply in-session, keep cutters in hidden `CUTTERS` collection, clean with Merge by Distance.
4. **Moving parts as separate objects**: bolt/slide, trigger, hammer, pump, cylinder, magazine, blade slider are separate meshes parented to the receiver/body so `combat-system` can animate them. No welded-shut mechanisms — a magazine must be able to leave the magwell.
5. **Interface geometry**: rail slots, mounting lugs, sling loops, bayonet lugs modeled as real recessed geometry (0.004–0.010 m gaps), not painted.
6. **Attachment points**: create Empty objects named exactly `ATT_Muzzle` (barrel axis, at crown), `ATT_Sight` (rail center), `ATT_Mag` (magwell center), `ATT_Grip` (hand pose point), `ATT_Underbarrel` (rail underside). Parent empties to the body mesh; do not scale them.
7. **Origin + orientation**: origin at `ATT_Grip` (the hand pose point), rotation zeroed, scale 1.0 applied; model faces −Y so the muzzle points +Z in Three.js.
8. **Detail pass**: sights (front post + rear aperture with real apertures), extractor, charging handle, safety lever, checkering/stippling on grips (geometry only at silhouette level), screws and rivets as 6–8 sided cylinders.
9. **Bevel + normals**: Bevel modifier Angle-limited 0.0005–0.002 m (steel edges 0.5–1 mm), segments 1–2; Weighted Normal modifier (`keep_sharp`) last, then apply.
10. **LOD0 viewmodel pass**: 1500–6000 tris at LOD0 with 1024–2048 px textures (first-person fills the screen). Build LOD1 (~40–50%) and LOD2 (~15–20%) by removing interior/unseen parts, not blind decimation — see `lod-generation`.
11. **Collision proxy**: simple convex hull or box/cylinder decomposition named `UCX_<weapon>` covering body + protruding barrel/blade.
12. **Hand-off**: UVs → `uv-unwrapping`; texture sets → `pbr-materials` / `texturing`; export → `export-pipeline`.

## Rules
1. Never create purely decorative weapons — no impossible mechanisms, no floating parts, no bolts that do not touch a surface.
2. Moving parts must be modeled and separable; static weapons may not be used where the game animates the action.
3. Real proportions from reference in meters — never stylized scale; check against the 1.8 m player every pass.
4. Materials: steel (dark worn bluing, polished wear edges), polymer (matte, scuffed), wood (grip oil darkening, dents) — separate via material slots but keep slot count ≤3 to protect mobile draw calls.
5. Texture sets: one BC/N/R/M set per weapon; ≤2048 px for viewmodel weapons, ≤1024 px for world-only weapons; power-of-two only.
6. Naming: `SM_<Weapon>_<Variant>` (e.g. `SM_Rifle_AK_A`, `SM_Melee_Machete_B`), materials `M_Steel_Worn`, `M_Wood_Grip`, textures `T_Rifle_A_BC/_N/_R/_M`.
7. Origin at grip point; scale applied; no live Boolean or unapplied modifiers in the export GLB.
8. World/dropped versions may be LOD1-only meshes but must keep the same `ATT_` empties if attachable.

## Quality standards
- Weapon reads correctly at arm's length in first person: silhouette, sights and ejection port all resolve.
- Every mechanism could function if animated — trigger pivots on its pin, magazine follows the magwell, pump travels the action bars.
- Wear tells use history: holster rub on the slide, hand polish on the blade spine, dirt in the magwell.
- No shading artifacts under Matcap; no z-fighting between overlapping plates; manifold.
- Tri budget held: LOD0 1500–6000 (viewmodel), LOD1/2 within `lod-generation` ratios.

## Output
GLB with `SM_` weapon mesh(es), `ATT_` empties intact, `UCX_` collision proxy, `M_` materials, `T_` texture set, LOD0/1/2 variants, origin at grip, +Y-up on export.

## Validation
Run: `blender -b <file>.blend --python .blender/scripts/validate_asset.py` (checks naming, scale, manifold, tri budget, orphan empties).
Manual checklist:
- [ ] All five `ATT_` empties present, unscaled, parented, correctly positioned against reference
- [ ] Moving parts are separate objects; no impossible mechanism
- [ ] Overall length/height within ±5% of reference dimensions in meters
- [ ] Origin at grip, scale 1.0, faces −Y
- [ ] LOD0 tri count 1500–6000; textures ≤2048 px, power-of-two
- [ ] No live modifiers; bevel applied; Weighted Normal applied
- [ ] Cross-checked with `asset-naming`, `collision-mesh`, `export-pipeline`

## Common mistakes
- Modeling the trigger guard solid and painting the trigger on → cannot animate fire.
- Forgetting `ATT_Muzzle` or placing it at the receiver → wrong muzzle flash/tracer origin in `vfx-system`.
- Origin at bounding-box center → weapon floats away from the hand.
- Blind decimation for LOD1 → sights and barrel collapse; strip parts instead.
- One texture set at 4096 px "because it's a hero asset" → violates budget and mobile load times.
- Decorative fantasy details (skulls, runes) breaking the survival/industrial art direction.
