---
name: low-poly-optimization
description: Intelligently cut triangle counts on RustGame assets without butchering silhouette, gameplay readability or close-up quality — dissolve, decimate, collapse and cleanup techniques in Blender with strict preserve/remove lists. Use when a mesh is over budget, the scene is heavy, FPS drops, or the user mentions low poly, optimize, decimate, reduce polys, triangle count, mesh cleanup or too many triangles.
---

# low-poly-optimization

## Purpose
Bring a mesh inside its `game-ready-assets` budget while keeping the silhouette, important edges, gameplay readability and close-up quality intact. Optimization removes what nobody can see, never what the eye reads.

## When to use
- After PRIMARY/SECONDARY/TERTIARY modeling and before `uv-unwrapping` / `high-to-low-baking`, whenever the tri count exceeds the category budget.
- When mobile FPS drops, when a bake is slow because of poly count, or when LOD levels (`lod-generation`) need a lighter base.

## Inputs
- Final low-poly or mid-poly `.blend`, tier budget from `game-ready-assets`, target camera distances (close-up vs background).
- Reference renders of the asset for before/after silhouette comparison.

## Workflow
1. **Measure baseline**: Select object → Sidebar (N) → Item shows faces/verts; or run `.blender/scripts/validate_asset.py` for tri count per object.
2. **Delete what you cannot see**: Edit Mode → Select All by Trait → Interior Faces, Loose Geometry, Faces by Sides as needed; select undersides of props facing the floor, geometry buried inside solids, back faces of panels. Delete, then Mesh → Clean Up → Merge by Distance (0.0001 m).
3. **Dissolve flat redundancy**: select flat regions → Mesh → Delete → Limited Dissolve (Max Angle 2–5°); or Mesh → Clean Up → Dissolve (angle). This removes extra edge loops across flat faces without touching curved form.
4. **Remove by angle**: Mesh → Clean Up → Delete by Angle (2–5°) for coplanar clutter; re-check the result — it can eat a soft chamfer.
5. **Collapse manually where it matters**: select redundant edge loops on visible forms → Edge → Dissolve Edges or Merge (At Center / At Cursor); use vertex Slide (GG) when collapsing so the silhouette does not shift.
6. **Replace geometry with normal detail**: modelled screws, rivets, thread grooves and micro-bevels <0.5 mm are baked (`high-to-low-baking`) — delete them from the low poly.
7. **Bevel budget**: Bevel modifier with 2 segments instead of 5+, Angle limit 30°, width ≥0.001 m so the bevel still catches light at 1 m; drop micro-bevels that vanish at gameplay distance. Apply the modifier.
8. **Decimate as a starting point only**: Decimate modifier → Collapse with ratio 0.3–0.7, or Planar (angle 5°) for hard-surface slabs. Apply, then clean by hand: retopologize pinch areas, fix stretched UVs (decimation destroys the layout → re-pack per `uv-unwrapping`), recalc normals outside (Shift+N), re-check Auto Smooth / Weighted Normal.
9. **Verify**: render front/side/three-quarter before and after at the same camera; overlay or flick between renders — silhouette differences must be invisible at gameplay distance.

## Rules
- Never decimate a deforming/animated (`SK_`) mesh without re-checking topology afterwards: decimation destroys edge loops needed for joint deformation. Prefer manual loop collapse along deformation flow.
- Re-check normals after every decimate/dissolve pass — recalculate outside, verify no flipped faces under Matcap.
- Verify silhouette by comparing before/after renders, not by tri count alone.
- Preserve: silhouette-defining edges, gameplay-readability features (doorway widths, ladder rungs, handle shapes), anything within 15 m of a player camera, UV seams on islands you intend to keep.
- Remove: unseen undersides, interior faces, buried geometry, duplicated vertices, unused UV islands, extra loops in flat areas, high-poly fasteners, redundant subdivisions.
- Never optimize past the point where the asset fails `game-ready-assets` VISUAL QUALITY.

## Quality standards
- Budget met (e.g. clutter 100–300, medium 300–1500, hero 1500–5000 tris) with silhouette identical at gameplay distance.
- No non-manifold, no loose verts, no flipped normals after the pass.
- UV layout still ≥70% fill with density unchanged; no island moved into another.
- Shading identical under Matcap before/after (no new pinching from collapsed support loops).
- Edge count in flat regions reduced by ≥50% versus the pre-optimization mesh.
- Live modifiers: zero (all applied).

## Output
A clean, budget-compliant mesh ready for `uv-unwrapping` / `high-to-low-baking` / `lod-generation`, with the tri count delta recorded in the asset QC notes.

## Validation
Manual:
- [ ] Before/after renders flicked side by side — silhouette unchanged
- [ ] Matcap inspection: no pinching, no flipped faces
- [ ] Tri count inside category budget
- [ ] `SK_` meshes: deform test poses still clean after any collapse
- [ ] UV overlap and texel density unchanged after the reduction pass

Runnable checks — must exit 0:
```
blender -b asset.blend --python .blender/scripts/validate_asset.py -- --check tris,manifold,normals,uv
```

## Common mistakes
- Blind Decimate as the final step — broken topology, wrecked UVs, smeared normals.
- Decimating characters/animals and destroying joint edge flow → candy-wrapper elbows.
- Deleting "flat area" loops that were supporting a bevel or a baked normal gradient.
- Optimizing a mesh that was never over budget — wasted hours and lost detail.
- Forgetting to re-check UV overlap after dissolving geometry that shared islands.
- Cutting so hard the asset reads differently at 10 m (gameplay readability loss).

Cross-links: `game-ready-assets`, `retopology`, `lod-generation`, `high-to-low-baking`, `uv-unwrapping`.
