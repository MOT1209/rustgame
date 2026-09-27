---
name: animal-modeling
description: Model game-ready animals for RustGame — deer, wolf, bear, boar, rabbit, bird, dog — with real quadruped anatomy, WebGL-safe fur solutions, rig-ready topology and mandatory LODs. Use when modeling wildlife or any creature, or when the user mentions animal, deer, wolf, bear, boar, rabbit, bird, dog, quadruped, fauna, wildlife, fur, creature or NPC animal.
---

# animal-modeling

## Purpose
Build survival-appropriate fauna that are anatomically credible, riggable, and cheap enough for WebGL — 3000–10000 tris with a required LOD chain, because animals are seen at range.

## When to use
- Deer, wolf, bear, boar, rabbit, bird, dog and other fauna — any quadruped, biped bird or creature.
- Not for humanoids, non-living props, or pure surface-detail work.

## Inputs
- Reference: skeletal and muscular diagrams plus photos for each animal, front/side/top.
- Real dimensions (shoulder height, body length) — deer ~1.4 m at shoulder, wolf ~0.8 m, boar ~0.8 m, rabbit ~0.35 m.
- Rig plan known early (`rigging`): quadruped spine chain, four limbs, tail, jaw.
- Tri budget and LOD tiers decided before blocking (see `lod-generation`).

## Workflow
1. **Anatomy reference**: collect skeleton + muscle reference. Mark joint landmarks: scapula tip, elbow, carpus (wrist), stifle (knee), hock, digit joints; on birds: keel, alula, patagium.
2. **Skeleton blockout**: build a low-segment bone chain (cylinders/spheres) as a separate guide object — the future armature path. Joints sit on real anatomical landmarks, not evenly spaced.
3. **Primary forms**: build the body from a cube/cylinder per mass (ribcage, pelvis, head, limbs) and Bridge Edge Loops to connect. Keep the silhouette recognizable in pure black — the fastest read of species correctness.
4. **Secondary forms**: neck taper, muzzle shape, limb muscle bulges (triceps, gaskin), paw/pad volumes. Use Extrude/Inset/Loop Cut; keep quads.
5. **Fur solution** (pick exactly one — real hair/particle systems are forbidden, too expensive for WebGL):
   - **Shell cards / alpha cards**: intersecting card strips or a shell-modifier stack only for hero animals; count the tris.
   - **Alpha cards**: crossed planes with alpha-tested fur cards at silhouette and neck ruff.
   - **Texture-painted fur**: default for game animals — fur is painted into albedo + normal + roughness; geometry stays bare. Cheapest and the correct default at 3000–10000 tris.
6. **Detail pass**: sculpt fine skin/wrinkle detail on a Multiresolution modifier only for hero animals, otherwise skip — it carries in the bake.
7. **Topology**: hand off to `retopology`. Requirements: loops encircling each joint (shoulder, elbow, carpus, stifle, hock, jaw), quads in all deforming zones, poles on flat non-deforming areas (flank, cheek), density following curvature.
8. **UV + textures**: hand off to `uv-unwrapping`, then texturing — fur direction flow, dirt on belly/paws, scars per environmental storytelling.
9. **LOD chain**: mandatory. LOD0 3000–10000 tris; LOD1 ~40%; LOD2 ~15% (billboard or 200–600 tris at distance). See `lod-generation`.
10. **Collision + export**: simple capsule/box collision for AI; GLB export per `export-pipeline`, origin at ground contact between the paws.

## Rules
1. Joint placement follows real skeleton landmarks — never evenly spaced limb loops.
2. No real hair, particle systems, or dense shell stacks: fur is cards or painted texture.
3. All-quad, deformation-safe topology at every joint; no poles inside a joint loop.
4. Budget 3000–10000 tris at LOD0; every animal ships with an LOD chain.
5. Faces point −Y in Blender; origin at ground contact; scale 1.0 applied; 1 BU = 1 m.
6. Naming: `SK_Deer_Buck_A` (mesh), `M_Fur_Deer`, `T_Deer_A_BC`.
7. Proportions checked against real measurements and the 1.8 m player (a bear must tower, a rabbit must read small).

## Quality standards
- Species is identifiable from silhouette alone at 10 m.
- Limb angles and joint positions match anatomical reference in a side-view screenshot.
- Fur reads through texture and silhouette cards — no visible bald patches or plastic skin.
- Walk-cycle-ready loops: 3–4 loops across each joint, even spacing.
- Tris within budget, LOD chain present, manifold mesh.

## Output
`SK_`-named GLB with LOD variants, applied modifiers, ground origin, −Y facing, plus a joint/vertex-group note for `rigging`.

## Validation
Run `blender -b <file>.blend --python .blender/scripts/validate_asset.py` in background mode (tri count, naming, manifold, scale).
Manual checklist:
- [ ] Joint landmarks verified against skeleton reference in side view
- [ ] 3–4 topology loops across shoulder, elbow, stifle, hock
- [ ] Zero poles inside joint loops
- [ ] Fur is cards or painted — no particle/hair systems in the file
- [ ] LOD0 within 3000–10000 tris; LOD1/LOD2 generated
- [ ] Silhouette test: animal recognizable in black at 10 m
- [ ] Origin at paw ground contact; scale 1.0; passes the asset quality gate

## Common mistakes
- Evenly spaced limb loops → knee bends like a rubber tube.
- Real hair particles left in the file → export bloat or silent loss on GLB export.
- Skipping LODs because the model "isn't that detailed" → frame drops when a herd spawns.
- Texturing before topology is final → UV seams re-cut, texel density lost.
- Modeling from a single photo → wrong foreshortening, broken proportions.
- Symmetric fur/marking paint — real animals are asymmetric.
