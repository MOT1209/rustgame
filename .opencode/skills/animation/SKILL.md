---
name: animation
description: Author game animation clips for RustGame in Blender and export them as glTF actions — in-place locomotion, state clips, 30 fps baking, keyframe reduction and three.js AnimationMixer playback. Use when creating or fixing animations, adding walk/idle/attack cycles, or when the user mentions animation, anim, clip, keyframe, idle, walk, run, attack, loop, root motion, AnimationMixer or crossfade.
---

# animation

## Purpose
Deliver loopable, in-place, low-keyframe animation clips on a shared skeleton that export as clean glTF actions and play back in three.js with cheap crossfades at ≥30 FPS on mobile.

## When to use
- After `rigging` passes, before `export-pipeline`, for characters (`idle, walk, run, crouch, jump, attack, use, hit, death`), animals (`idle, walk`), and state-driven props.
- When clips pop at loop boundaries, when the model slides across the floor, or when playback stutters on mobile.

## Inputs
- Rigged `SK_` asset with clean weights and a stable bone set (`rigging`).
- Clip list and state machine for the asset (which states crossfade into which).
- Movement decision: RustGame uses capsule/raycast movement, so clips are in-place (no root motion).

## Workflow
1. **Author per clip, one Action each**: create a new Action named exactly after the clip — `Idle`, `Walk`, `Run`, `Crouch`, `Attack_01`, `Death` (PascalCase, no spaces). Do not stack unrelated clips in one Action; park them in the NLA or keep separate actions.
2. **Key on meaningful poses only**: pose in Pose Mode, insert keyframes with `I` on Location/Rotation (use Euler XYZ or Quaternion consistently — quaternion for limbs to avoid gimbal). Target a clean curve: contact, passing, extreme, rebound — not every frame.
3. **Bake at 30 fps**: Timeline → Start/End per clip, then Pose → Animation → Bake Action (Visual Keying, Clear Constraints if IK was used) or set sample rate 30; RustGame's clip rate is 30 fps — do not author 60 fps and hope.
4. **Loop correctly**: for `Idle`, `Walk`, `Run` — make first and last frames identical (copy the first key to the final frame), and check the F-Curve cyclic modifier (Modifier → Cycles) or simply verify the wrap by playing past the end frame. No foot slide: root stays at origin, feet plant.
5. **No root motion**: keep the armature at world origin for the whole clip; the game drives translation from code. Any hip translation you need for a lunge stays local — do not bake forward travel into the clip.
6. **Keyframe reduction**: select all keys → Key → Clean Keyframes (threshold ~0.001) or Decimate Keys; delete keys on static bones during a phase (an idle does not key every finger 30 times).
7. **Shared skeleton**: all clips use the same bone set and rest pose — never re-rig between clips.
8. **Export**: `export-pipeline` with `export_animations=True`, `export_skins=True`; verify the GLB contains one `<Animation>` per clip with the Action names intact.
9. **Play back in three.js**: `THREE.AnimationMixer` with `clipAction('Walk')`, crossfade via `action.crossFadeFrom(previous, 0.2)` on state changes; pre-load only the clips the asset actually uses.

## Rules
- Clip names are the contract: `Idle`, `Walk`, `Run`, `Crouch`, `Jump`, `Attack_01`, `Use`, `Hit`, `Death`, `Walk` for animals. Match exactly across Blender, GLB and code.
- Locomotion clips loop; `Death` and one-shots do not (hold last frame).
- In-place only — root motion is never baked (capsule movement is code-driven).
- 30 fps bake; minimal keys; clean curves.
- Bone count ≤60–70; never export IK targets, controls or constraints — bake then delete.
- One skeleton shared by all clips of an asset; retiming happens in code, not by re-authoring.

## Quality standards
- Loop boundary invisible: flick between last and first frame, no jump in pose or foot position.
- No foot sliding during `Walk`/`Run`; contact poses ground the foot at y=0 relative to the root.
- Clip length sane: `Walk` ~1.0 s at 30 fps, `Idle` 2–4 s, `Attack_01` ~0.4–0.6 s.
- Keyframe count proportionate (a 1 s walk ≈ 30–60 keys total, not 30 per bone per frame).
- Crossfade between states reads smoothly in-engine at 30 FPS mobile.

## Output
A GLB containing the skinned mesh plus one animation clip per Action, names preserved, ready for `THREE.AnimationMixer` in RustGame.

## Validation
Manual:
- [ ] Every required clip present with the exact contract name
- [ ] First/last frame of loop clips identical; wrap test shows no pop
- [ ] Root stays at origin across the whole clip (no baked translation)
- [ ] Keys reduced — 30 fps sample, no per-frame noise on static bones
- [ ] GLB loads, `mixer.clipAction('Walk')` finds the clip, crossfade to `Run` is smooth
- [ ] Mobile perf: bone count ≤60–70, no IK/control bones in the export

Runnable checks — must exit 0:
```
blender -b SK_Player_Survivor_A.blend --python .blender/scripts/validate_asset.py -- --check animations
```

## Common mistakes
- Root motion baked in → character moonwalks or teleports when code also drives translation.
- First and last frames differ by a few degrees → visible hitch every loop.
- Clip names drifting (`walk`, `Walking`, `Walk_Cycle`) → `clipAction` throws, state machine breaks.
- One Action containing every clip stacked on the timeline → glTF exports a merged garbage clip.
- IK controls left in the export → extra nodes, weight-free bones inflating the skeleton.
- Authoring at 24/60 fps and exporting without baking → retimed, sliding playback.

Cross-links: `rigging`, `export-pipeline`, `character-modeling`, `asset-naming`, `npc-ai`.
