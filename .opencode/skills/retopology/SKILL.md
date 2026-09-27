---
name: retopology
description: Convert high-poly sculpts and dense blockouts into clean, bake-ready low-poly meshes for RustGame — shrinkwrap and snap workflows, manual poly-by-poly retopo, silhouette preservation, deformation topology and decimate-for-static shortcuts. Use when rebuilding a mesh at lower density, or when the user mentions retopo, retopology, low poly, shrinkwrap, wrap, decimate, bake mesh, high to low or mesh reduction.
---

# retopology

## Purpose
Produce a low-poly mesh that (a) preserves the high-poly silhouette, (b) carries deformation-safe edge flow where the asset moves, and (c) matches the normal-map texel budget so bakes from the high-poly land clean.

## When to use
- After `sculpting` (Multires or dyntopo high-poly) or when a blockout exceeds budget.
- Before `uv-unwrapping` and `high-to-low-baking`. Static rocks/debris may use the decimate shortcut instead of full manual retopo.
- Not for: simple primitives already in budget — don't retopo what doesn't need it.

## Inputs
- Approved high-poly (or sculpt) with transforms applied, shared world origin, scale 1.0.
- Asset class: static / deforming — decides manual retopo vs decimate shortcut.
- Texel budget: texture size (≤1024 px typical, ≤2048 hero) → maximum low-poly surface area and density.
- Budget from the owning skill (character LOD0 8000–25000 tris / mobile ≤12000; animal 3000–10000; prop tiers; weapon 1500–6000).

## Workflow
1. **Freeze the high-poly**: duplicate as `HIGH`, hide it, set `Snap to Faces` (magnet with face icon) plus `Snap → Project onto Faces`; for sculpt surfaces enable `Shrinkwrap` targeting the high-poly.
2. **Silhouette pass first**: in Front (Numpad 1) and Side (Numpad 3), lay the first vertices exactly on the high-poly outline. Silhouette vertices are sacred — they define the read at range; budget loops there first, strip interior density later if needed.
3. **Choose the construction method**:
   - **Manual poly-by-poly (default for deforming assets)**: Poly Build tool (Shift+Tab in Edit Mode) or Extrude along normals from a single quad; Snap to Faces keeps every vertex on the surface. Bridge Edge Loops to close runs; Grid Fill for flat patches.
   - **Shrinkwrap + subdivide workflow**: start from a low subdivision of a proxy cube/sphere, add Shrinkwrap modifier (mode: Project / Nearest Surface Point, offset 0.001–0.005 m), subdivide while snapping, apply, then remove redundant loops.
   - **Addon assist**: a retopology addon (e.g. quad-remesher style tools) may generate a first pass, but every deforming region is then hand-audited — addons put poles in joints.
   - **Decimate-for-static shortcut (allowed)**: for non-deforming assets only (rocks, debris, static props, scatter meshes) — Decimate modifier, Collapse ratio tuned until the tri budget is met, then Planar dissolve (angle ~5–10°) to remove coplanar edges. Follow with Merge by Distance and a non-manifold check. Never decimate anything that must deform or that must keep a clean joint loop.
4. **Deformation topology** (characters/animals): rebuild loops perpendicular to each joint axis, 3–4 loops across shoulder/hip/knee/elbow; keep the high-poly's landmark vertices; no poles inside joints; verify by posing the mesh (or Lattice test) before proceeding.
5. **Density matching**: low-poly density must match the texel budget — the high-poly detail being baked has to be representable at the texture resolution. Rule of thumb: surface area (m²) × (texels/m)² ≤ texel count of the chosen map. If the low-poly is too dense, its UV islands will be too small to hold the bake; if too sparse, the silhouette breaks.
6. **Decimate tris and clean**: delete interior faces, Merge by Distance (0.00001), recalc normals outside (Shift+N), fix n-gons on curved regions.
7. **Verify silhouette match**: shrinkwrap the low-poly back onto the high-poly with a small offset, or use Shrinkwrap modifier in `Nearest Surface Point` and read the visual delta — deviation should stay within ~one texel at the target map size.
8. **Hand off**: name `SM_`/`SK_`, apply all modifiers, then `uv-unwrapping` → `high-to-low-baking`.

## Rules
1. Silhouette vertices are preserved — never simplify away an outline change.
2. Deforming regions get manual retopo with joint-perpendicular loops; decimate is forbidden there.
3. Decimate-for-static is allowed ONLY for non-deforming assets, and still requires cleanup (manifold, normals, UV).
4. Low-poly density must match the normal-map texel budget, not the high-poly's vertex count.
5. All-quad preference in deforming/curved areas; tris only on flat runs and deliberate caps.
6. High and low share identical world origin and scale (1 BU = 1 m) or bakes will misalign.
7. Target budget comes from the owning skill — retopo finishes when the budget and silhouette are both met, whichever is later.
8. Final mesh passes `topology` checks: no non-manifold, no interior faces, no lamina, correct normals.

## Quality standards
- Silhouette match to high-poly within ~1 texel at target resolution.
- Wireframe: even quad flow, loops following form, no pinch-prone fans.
- Deforming zones: 3–4 loops across each joint, zero poles inside them.
- Tri count ≤ budget; UV density uniform enough for a clean bake.
- Bake test from the high-poly produces no missed rays, no seam streaks.

## Output
Low-poly `SM_`/`SK_` mesh (modifiers applied, manifold, normals out) paired with the frozen high-poly, ready for `uv-unwrapping` and `high-to-low-baking`.

## Validation
Run `blender -b <file>.blend --python .blender/scripts/validate_asset.py` in background mode (tri count, naming, manifold, normals, scale).
Manual checklist:
- [ ] Silhouette checked in Front (Numpad 1) and Side (Numpad 3) vs high-poly
- [ ] Shrinkwrap deviation ≤ ~1 texel at target map size
- [ ] Joint loops present and pole-free (deforming assets only)
- [ ] Non-Manifold = 0; Interior Faces = 0; Merge by Distance merges ~0
- [ ] Normals outward (Face Orientation all blue)
- [ ] Tri budget met per owning skill; texel-density math checked
- [ ] High/low share origin + scale; passes the validation gate and `export-pipeline`

## Common mistakes
- Retopo'ing a simple prop that was already in budget — pure time loss.
- Letting an auto-remesher place poles inside a shoulder or hip.
- Deleting silhouette loops to hit a tri count → visibly cheaper outline at range.
- Ignoring texel budget: a dense low-poly UV'd into 1024 px produces a soft, smeared bake.
- Low-poly and high-poly at different origins/scales → normal bake offset by centimeters.
- Decimating a character or animal → joints collapse and animation pinches.
- Skipping the shrinkwrap silhouette verification and discovering the mismatch after texturing.
