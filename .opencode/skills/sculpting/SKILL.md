---
name: sculpting
description: Sculpt organic and high-detail forms in Blender for RustGame — rocks, creatures, damaged surfaces, terrain detail, character and animal high-poly — with correct form hierarchy, multiresolution vs dyntopo decisions and a clean decimate/retopo handoff. Use when sculpting, or when the user mentions sculpt, sculpting, rock, creature, organic detail, damage, cracks, dents, high poly, multires or dyntopo.
---

# sculpting

## Purpose
Produce high-poly forms whose primary/secondary/tertiary detail survives baking to a normal map, while never wasting density on detail that a texture should carry.

## When to use
- Organic forms (characters, animals, creatures), rocks, terrain chunks, and realistic damage (impact craters, splintering, spalling, bullet pocks).
- When detail must exist in the silhouette or drive a bake. Do NOT sculpt when a normal map or vertex paint can carry the detail — see Rules 1.
- Paired with `high-to-low-baking`; hand off to `retopology` after the sculpt.

## Inputs
- Reference photos (real rocks, real damage, real anatomy) — sculpting without reference produces noise, not realism.
- A decision: silhouette-level detail (sculpt) vs surface-only detail (texture/normal map).
- An already-approved blockout — never sculpt on unapproved proportions.
- Target high-poly density budget (typically 100k–1M tris before decimation).

## Workflow
1. **Reference pass**: collect photos of the exact subject, including close-ups of the damage/material (spalling on concrete, splinter direction on wood, lichen on rock). Note light direction for form readability.
2. **Choose the evaluation method**:
   - **Multiresolution modifier**: preferred for base-mesh-driven work (characters, animals, props with a known low-poly). Add Multires, subdivide to level 3–5, sculpt per level, keep a renderable base.
   - **Dyntopo** (Dynamic Topology): for freeform blocking and where topology doesn't matter yet (rocks, creature concepts, heavy damage). Enable in Sculpt Mode → Dyntopo, detail size ~0.01–0.03 m at this scale, `Detail Type: Relative Detail`.
   - Decide before starting: multires if the mesh will be re-topologized against its surface; dyntopo if the mesh is a throwaway sculpt-to-decimate.
3. **Primary forms** (~50% of read): big masses with Grab, Elastic Deform and Snake Hook brushes at large radius. Check silhouette constantly — rotate to a black-background front view (Numpad 1) and side view (Numpad 3).
4. **Secondary forms**: Clay Strips + Smooth to build muscle/rock planes, Crease to define edges, Inflate for swelling. Keep brush symmetry (X-mirror) for anatomy, switch it OFF for damage and rock detail — real damage is asymmetric.
5. **Tertiary detail**: Scrape, Multiplane Scrape, Draw Sharp for cracks; Mesh Filter → Smooth for localized relaxation. Model damage by cause: impact craters have raised lips, spalling has sharp flat flakes, splintering follows grain direction, bullet pocks are small conical craters with radial cracks — never uniform noise over the surface.
6. **Terminology check**: detail that does not break the silhouette belongs in the normal map, not the sculpt — if it disappears at the target texel size, delete it.
7. **Decimate or retopologize**:
   - Non-deforming (rocks, debris, static props): Decimate modifier, ratio until ~5–15% of sculpt tris, planar-then-collapse, then hand off for UV.
   - Deforming (characters, animals): hand off to `retopology` — shrinkwrap onto the sculpt surface.
8. **Bake handoff**: keep the high-poly in the file or as an OBJ/FBX sidecar with matching transforms; bake normal/AO/curvature per `high-to-low-baking`. High and low must share the same world origin and scale (1 BU = 1 m).
9. **Reproject + cleanup**: after retopo, Shrinkwrap back to the sculpt to verify silhouette match; check for baked-in noise that will alias.

## Rules
1. Do NOT sculpt when a normal map, vertex color, or alpha texture can do the job — sculpt only for silhouette changes, large form, or bake-worthy detail.
2. Form hierarchy is mandatory: primary (read at 10 m) → secondary (read at 2 m) → tertiary (read at 0.5 m). Never jump to pores/cracks first.
3. Reference-driven: every anatomy/damage decision traced to a photo, not imagination.
4. Realistic damage only — cause-specific, asymmetric, motivated. Random noise reads as stylized, not survival-realistic.
5. Symmetry off for damage, wear and rock detail; on only for anatomy blocking.
6. No sculpting on an unapproved blockout; proportions are locked first.
7. High-poly density is capped by the bake texel budget — 100k–1M tris typical; beyond that, detail won't be captured at ≤1024 px textures.
8. After sculpting, the file still passes `validate_asset.py` (scale 1.0, correct origin, `SM_`/`SK_` naming on the final mesh).

## Quality standards
- Silhouette readable and correct from front, side and three-quarter views.
- Detail density decreases with distance logic — no evenly distributed noise.
- Damage shows cause (impact, water, wear) and history.
- Sculpt surface bakes cleanly: no clipped/self-intersecting geometry at the bake ray distance.
- Handoff meshes (decimated rock or retopo'd character) preserve the sculpt silhouette within one texel.

## Output
High-poly sculpt (Multires or decimated mesh) + a named, transformed-matched low-poly handoff, documented bake distance, handed to `high-to-low-baking` and then `texturing`.

## Validation
Run `blender -b <file>.blend --python .blender/scripts/validate_asset.py` in background mode (scale, naming, transforms).
Manual checklist:
- [ ] Multires vs dyntopo chosen deliberately and documented
- [ ] Primary/secondary/tertiary all present, in that order of work
- [ ] Symmetry disabled for damage/wear passes
- [ ] Detail that vanishes at target texel size removed
- [ ] High and low share origin and scale (bake-safe)
- [ ] Decimate target met (rocks) or retopo handoff sent (deforming)
- [ ] Bake test produced no ray-catch misses or seams

## Common mistakes
- Starting with pores/cracks before blocking primary forms → mushy, unreadable shapes.
- Sculpting detail that normal maps should carry → wasted density and unmanageable files.
- Symmetric damage on both sides of a rock/weapon → reads as procedural noise.
- Sculpting on an unproportioned blockout → all later work inherits the error.
- Dyntopo on a mesh that needs a matching low-poly → silhouette has no clean source to shrinkwrap to.
- Forgetting to apply transforms before baking → misaligned normal maps.
