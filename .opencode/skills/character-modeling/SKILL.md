---
name: character-modeling
description: Model game-ready humanoid characters for RustGame — player, NPCs, survivors, enemies — from concept through proportions, anatomy, clothing, equipment, deformation topology and rig handoff in Blender. Use when building any humanoid, or when the user mentions character, player model, NPC, survivor, humanoid, body, face, clothing on a character, proportions or character topology.
---

# character-modeling

## Purpose
Build a rig-ready humanoid that deforms cleanly at shoulders, hips, knees and elbows, hits the 1.8 m player height, and stays inside the desktop/mobile tri budget (LOD0 8000–25000 desktop, ≤12000 mobile target).

## When to use
- Player, NPC, survivor, enemy humanoids — anything skinned (`SK_` prefix).
- Not for quadrupeds/wildlife or for heavy organic surfacing work.

## Inputs
- Concept sheet or reference set (front/side/back, same pose).
- Canonical proportions: 8-head canon scaled so total height = 1.8 m (1 head ≈ 0.225 m); eye height 1.8 m standing, 1.2 m crouched.
- Target tri budget and whether the character needs mobile LOD0 ≤12000.
- Rig requirements (see `rigging`) known before topology: joint axes, IK/FK, facial needs.

## Workflow
1. **Reference + turnaround**: lock front, side and back references at identical scale. Write down head count, shoulder width (~0.45 m), and landmark heights (hip ~0.95 m, knee ~0.5 m).
2. **Proportions blockout**: build from primitives — head sphere, ribcage and pelvis boxes, limb cylinders — scaled to the 8-head canon, total 1.8 m. Verify in Front view (Numpad 1) against the player capsule.
3. **Anatomy primary forms**: shape the blockout with Extrude/Loop Cut/Proportional Edit. Landmarks: sternum, iliac crest, patella, olecranon, acromion. Silhouette first — read it as a black shape.
4. **Merge into one shell**: bridge limbs to the torso (Bridge Edge Loops), remove interior faces at the joins, keep quads radiating from shoulder and hip.
5. **Clothing**: model as separate shells offset 0.005–0.02 m above skin, or as trimmed meshes replacing skin geometry underneath (never double-shell a full body on mobile). Give garments real thickness (Solidify modifier, 0.003–0.008 m) at hems, collars and cuffs only.
6. **Equipment**: pouches, holsters, backpack straps as separate `SK_`/`SM_` objects with explicit attachment points noted for `rigging` (vertex groups: `attach_belt_r`, `attach_back`).
7. **High-poly detail (optional)**: Sculpt Mode for face, hands and cloth folds on a Multiresolution modifier. Do not sculpt before proportions are final.
8. **Topology / retopo**: hand off to `retopology`. Requirements: deformation loops around shoulder (concentric), hip socket, knee and elbow (3–4 loops across the joint), poles (5+ edge verts) only in non-deforming areas (side of torso, calf), edge flow following muscle direction and joint axes.
9. **UV + textures**: hand off to `uv-unwrapping`, then texturing. Skin, fabric and wear masks per character history; no generic clean textures.
10. **Rig handoff**: name vertex groups by Blender bone convention, apply all modifiers, export per `export-pipeline`; rigging and animation continue in `rigging`.

## Rules
1. Height is law: 1.8 m total, eye 1.8 m standing / 1.2 m crouched — measure, do not eyeball.
2. All-quad topology in deforming regions; no triangles across a joint; no pole inside shoulder, hip, knee, elbow, neck or face mask.
3. Density is proportional to deformation and curvature — flat torso runs are sparse, joints and face are dense.
4. Clothing is a separate shell or a trimmed replacement — never z-fighting coplanar faces.
5. Budget: desktop LOD0 8000–25000 tris; mobile target ≤12000 → plan LOD tiers early (see `lod-generation`).
6. Naming: `SK_Player_Survivor_A` for the mesh, `M_Skin_Base`, `T_…_BC`/`T_…_N`/`T_…_ORM` textures.
7. Faces model toward −Y (Front view) so the character looks the right way in Three.js.
8. Apply scale 1.0 and transforms before UV and export; origin at feet (0,0,0).

## Quality standards
- Silhouette reads as a distinct character in pure black at 10 m.
- Neutral A-pose or T-pose, arms ~45° from the body for clean shoulder/armpit topology.
- No shading pinches at neck, shoulder or hip under a specular Matcap.
- Even UV texel density, no stretched faces on face/hands (highest density there).
- Tri budget met; mobile LOD0 ≤12000 or a documented LOD chain exists.

## Output
`SK_`-named GLB with clothing/equipment, applied modifiers, feet-origin, ±Y facing per convention, plus a handoff note listing vertex groups and attachment points for `rigging`.

## Validation
Run `blender -b <file>.blend --python .blender/scripts/validate_asset.py` in background mode (manifold, naming, scale, tri count).
Manual checklist:
- [ ] Height = 1.8 m measured; eye height matches 1.8/1.2 m convention
- [ ] Deformation loops present at shoulder, hip, knee, elbow
- [ ] Zero poles inside deforming zones (inspect with Mesh Doctor / Select Non-Quads)
- [ ] No non-manifold, no interior faces, no loose vertices
- [ ] Clothing has thickness at edges; no coplanar overlap with skin
- [ ] Tri count within budget; LOD chain defined if over 12000
- [ ] UVs unwrapped per `uv-unwrapping`; export passes the asset quality gate

## Common mistakes
- Wrong proportions fixed late — everything else is built on a bad silhouette.
- Triangles and poles inside the shoulder/hip → pinching during animation.
- Sculpting before the blockout proportions are approved → wasted high-poly work.
- Double-shelled full-body clothing → mobile fill-rate and tri budget blown.
- Symmetric, clean clothing with no wear — off-brand for survival (see visual direction: RAW + WORN).
- Forgetting to apply scale → 2× size character in Three.js.
