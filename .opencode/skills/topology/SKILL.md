---
name: topology
description: Judge and enforce clean game-mesh topology for RustGame assets — edge flow, quad discipline, density proportional to deformation and curvature, and freedom from non-manifold, interior, lamina and overlapping geometry. Use when reviewing or fixing mesh structure, or when the user mentions topology, edge flow, quad, ngon, non-manifold, normals, face loops, poles, mesh cleanup or wireframe.
---

# topology

## Purpose
Ensure the mesh's edge structure serves four consumers — silhouette, deformation, shading and baking — at the lowest possible density, so the asset exports clean and animates/artifacts free.

## When to use
- Reviewing or repairing any mesh before UV, bake or export.
- Deciding edge-flow direction and density on characters, animals and hard-surface assets.
- Pre-flight check before handing to `retopology` or `uv-unwrapping`.

## Inputs
- The mesh in Edit Mode plus its intended use: static / deforming / subdivided / baked.
- Deformation map: which regions bend (joints) vs which stay rigid.
- Curvature map: where the surface curves — density must follow it.

## Workflow
1. **Classify the mesh**: static (prop/building), deforming (character/animal limb), or subdivided (Subdivision Surface). The class sets which rules below are mandatory.
2. **Overlays on**: Viewport Overlays → statistics, Face Orientation, Wireframe. Run Select → All by Trait → Non-Manifold (Alt+Shift click path: Select → Select All by Trait → Non-Manifold) and fix each hit.
3. **Silhouette first**: walk the outline in Front (Numpad 1) and Side (Numpad 3) views; add loops only where the outline changes direction. A flat run needs no extra loop.
4. **Density pass**: density ∝ curvature × deformation. Joints and high-curvature areas get 3–4 loops; flat areas get long sparse quads. Delete loops that change neither silhouette nor deformation.
5. **Edge-flow pass**: redirect loops along form and joint axes. At joints the loops must run perpendicular to the bend axis so compression/stretch distributes evenly. Use Knife (K) + vertex slide (GG) + Merge to reroute; Select → Loops → Edge Loops to verify continuity.
6. **Pole audit**: 5+ edge vertices (poles) must sit only in flat, non-deforming areas (flank, cheek, flat panel). Select → Vertices → Non Manifold / "Select Boundary" plus a wireframe scan; move poles out of shoulders, hips, knees, elbows, face masks, bevel runs.
7. **Quad/n-gon discipline**: prefer all quads. Triangles allowed only on flat, non-deforming, non-subdivided runs and at deliberate fan centers (pole caps, cylinder caps). N-gons allowed ONLY on flat, non-deforming, non-subdivided surfaces — otherwise cut them with Knife or `Grid Fill`.
8. **Geometry defect cleanup** (in order): Merge by Distance (search 0.00001) → delete Interior Faces (Select → Faces → Interior Faces, or Select All by Trait → Interior Faces) → fix Lamina (non-manifold flaps) → recalculate normals outside (Shift+N) → check for overlapping/coincident faces via Merge by Distance at 0 and Select → Select All by Trait → Interior Faces.
9. **Shading check**: Matcap with sharp specular; look for pinching (a pole or stretched quad nearby), black facets (flipped normal), and stretched highlights (bad edge flow).
10. **Bake readiness**: no interior faces, no doubled shells, consistent smoothing groups via Mark Sharp/Edge Split; then hand to `uv-unwrapping`.

### What topology must serve

| Consumer | Must be correct in… | Failure symptom |
|---|---|---|
| Silhouette | outline loops, exterior edges | chunky/rounded-off outline at range |
| Deformation | joint loops, pole placement | pinching, candy-wrapper twist |
| Shading | even quad flow, no stretched faces | spec streaks, Matcap black spots |
| Baking | no interior/overlapping faces, clean normals | ray misses, dark seams on normal map |

## Rules
1. No non-manifold geometry, no interior faces, no lamina, no overlapping/coincident faces, no loose vertices/edges — ever.
2. Normals point outward (Face Orientation overlay all blue) and smoothing is intentional (Mark Sharp / Weighted Normal, not accidental).
3. Density is never uniform: flat = sparse, curved = dense, deforming = densest.
4. Edge flow runs along the form and along the joint's bend axis.
5. All-quad preference; exceptions only where documented in Rules 4 above.
6. Zero poles in deforming zones; poles parked on flat non-deforming surfaces.
7. Mesh stays manifold after every cleanup pass — re-run the non-manifold check at the end, not just the start.
8. Budget awareness: every loop must earn its tris against the tier budget in the owning skill.

## Quality standards
- Select All by Trait → Non-Manifold returns 0; Interior Faces returns 0; Merge by Distance reports 0 merged.
- Face Orientation overlay entirely blue.
- Matcap shows no pinching at joints or black facets anywhere.
- Wireframe reads as calm, evenly spaced flow — no fan of random cuts across a surface.
- Tri count within the owning asset's budget.

## Output
A clean, manifold, quad-dominant mesh ready for `uv-unwrapping`/`retopology`, plus a short report of what was fixed (poles moved, n-gons cut, interior faces removed).

## Validation
Run `blender -b <file>.blend --python .blender/scripts/validate_asset.py` in background mode (automated non-manifold, normals, interior-face and naming checks).
Manual checklist:
- [ ] Select All by Trait → Non-Manifold: 0
- [ ] Interior Faces: 0; Lamina/coincident: 0 (Merge by Distance at 0 merges nothing)
- [ ] Face Orientation overlay: all blue; Shift+N normals consistent
- [ ] No poles inside any joint/deforming loop
- [ ] No n-gons on curved or deforming regions
- [ ] Matcap inspection: no pinching, no black facets
- [ ] Silhouette verified in Front (Numpad 1) and Side (Numpad 3)
- [ ] Passes `asset-validation` before export

## Common mistakes
- Uniform density — dense everywhere, wasteful and hard to edit.
- Triangles placed inside a joint instead of on a flat run.
- N-gons spanning a bevel or curve → shading artifacts after Weighted Normal.
- Interior faces left where two shells were bridged → invisible in viewport, breaks bakes.
- Fixing normals but not the flipped-smoothing cause → artifacts return after export.
- Adding loops "to be safe" without a silhouette/deformation justification.
