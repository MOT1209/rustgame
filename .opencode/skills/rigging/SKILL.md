---
name: rigging
description: Build animation-ready Blender armatures for RustGame characters and animals — bone layout, orientation convention, rest pose, skinning with ≤4 influences and deformation cleanup. Use when rigging a character or creature, fixing bad weights, adding an armature or skeleton, or when the user mentions rig, rigging, armature, bones, skinning, weight paint, weights, skeleton or deformation.
---

# rigging

## Purpose
Produce a lean, correctly oriented armature and clean skin weights so animations deform believably, export cleanly to glTF, and stay cheap enough for mobile skinning.

## When to use
- After `character-modeling` / `animal-modeling` final topology, before `animation`.
- When shoulders collapse, elbows candy-wrapper, weights bleed across the torso, or an export arrives in Three.js with a broken/rest-pose skeleton.

## Inputs
- Final low-poly skinned mesh (`SK_`), clean topology with edge loops at every joint (`topology`).
- Bone naming table (`asset-naming`), influence cap (≤4), target platform budget (≤60–70 bones for characters).

## Workflow
1. **Plan landmarks before placing bones**: biped = hips, spine 1–3, neck, head, clavicle, upper arm, forearm, hand, thigh, shin, foot, toe (mirrored); quadruped = spine chain, neck, skull, scapula, humerus, radius, pelvis, femur, tibia, metatarsals, toes, tail. Cut bones to the budget — fingers often collapse to one bone per finger for mobile.
2. **Create the armature**: Shift+A → Armature → Single Bone in Edit Mode, extrude (E) per chain; enable Armature → Viewport Display → In Front so bones read through the mesh.
3. **Set orientation convention**: X runs along each bone — select all bones, Bone → Recalculate Roll → Global +X (or +Y if the rig standard demands it; pick one and hold it). Verify in Bone Properties → Roll is consistent per chain.
4. **Rest pose**: T-pose for bipeds (arms horizontal, palms down, legs slightly apart), natural stance for quadrupeds. Zero all rotations before skinning — Object Mode, Alt+G / Alt+R / Alt+S.
5. **Bind**: select mesh then armature → Ctrl+P → With Automatic Weights. Fallback when Blender fails: Empty Groups + Weight Paint manually.
6. **Weight cleanup in Weight Paint mode**: smooth falloff across joints (Weights → Smooth, or Blur vertex mix); remove bleeding with Weights → Subtract / manual zero on wrong groups; Weights → Limit Total to 4 and Weights → Normalize All.
7. **Isolated verts**: Vertex → Select Linked by Vertex Group must find no group with zero assigned verts; delete or reassign them.
8. **Joint correction**: shoulder and hip get corrective attention — raise the scapula/hip influence so the arm/leg does not clip the torso on raise; add corrective shape keys if the collapse survives weight smoothing.
9. **Test poses**: pose each joint to its limit (shoulder 180°, elbow ~145°, knee ~140°, hip swing) and inspect silhouette under Matcap; fix in Weight Paint, re-test.
10. **IK/FK**: build IK constraints for production convenience if desired, but export only what ships — glTF evaluates the rig, so bake constraints (Pose → Animation → Bake Action, visual keying, clear constraints) before export.
11. **Name everything**: bones per `asset-naming` (`B_Hips`, `B_Spine_01`, mirrored `.L/.R` or `_L/_R` — pick one and hold it); armature object and GLB node names match the `SK_` asset name.

## Rules
- ≤4 vertex influences per vertex (glTF/Three.js friendly) — enforced with Weights → Limit Total.
- Bone count ≤60–70 for characters (mobile skinning cost).
- Consistent orientation: X along the bone, identical roll convention per chain.
- No negative scale on the armature or mesh; rest pose transforms zeroed.
- Weights only on bones that deform — IK targets, controls and helpers are never weighted or exported.
- Smooth falloff only across joints; hard weight edges produce faceted deformation.

## Quality standards
- Every test pose deforms without clipping, candy-wrapping or isolated bulges.
- Zero vertex groups with zero verts; zero verts with no group.
- Weights normalized; sum = 1.0 on every vertex.
- Armature exports with the mesh (`export_skins=True`) and loads in three.js with correct rest pose.

## Output
A rigged `SK_` `.blend`: armature object + mesh + weights, bone names consistent with `asset-naming`, ready for `animation` and `export-pipeline`.

## Validation
Manual:
- [ ] Bone count within budget; no control/IK bones left in the export set
- [ ] Weights → Limit Total (4) reports nothing over; Normalize All clean
- [ ] No empty vertex groups; no unweighted verts
- [ ] Test poses at joint limits show no clipping or collapse (shoulder/hip watched closely)
- [ ] Rest pose zeroed, roll convention consistent, no negative scale
- [ ] GLB re-import / three.js load shows correct rest pose and skinning

Runnable checks — must exit 0:
```
blender -b SK_Deer_A.blend --python .blender/scripts/validate_asset.py -- --check rig,weights
```

## Common mistakes
- Automatic weights taken as-is — shoulder bleed, hip collapse, butt/leg bleeding left uncleaned.
- More than 4 influences per vertex → silent weight loss on export and mobile shading cost.
- IK controllers weighted to the mesh → mesh follows controls into the exported file.
- Inconsistent bone roll → glTF imports with limbs twisted 90°.
- Naming bones after the mesh parts instead of the skeleton convention → retargeting and clip reuse break.
- Rigging low-poly mesh with no edge loops at joints → deformation pinches regardless of weights.

Cross-links: `animation`, `character-modeling`, `animal-modeling`, `asset-naming`, `export-pipeline`.
