---
name: uv-unwrapping
description: Unwrapping UVs for RustGame GLB assets — seam placement, texel density targets, distortion-free islands, and high-density atlas packing in Blender. Use when UVs look stretched, textures blur or swim, islands waste space, or the user mentions unwrap, UV, seams, texel density, UV grid, checker, pack islands, atlas or layout.
---

# uv-unwrapping

## Purpose

Produce a single-atlas UV layout per asset that maximizes texel density, keeps
distortion near zero, and hides seams. UVs are the contract between
`retopology` and `high-to-low-baking` — a bad layout makes both fail.

## When to use

- After `retopology`, before `high-to-low-baking` and `texturing`; re-unwrap
  whenever the low poly silhouette changes after a bake.
- When baked normals show seams, checker squares pinch or skew, or a texture
  reads blurry next to a sibling asset.

## Inputs

- Final low-poly mesh (post-`low-poly-optimization`, scale 1.0 applied,
  metric, 1 unit = 1 m) and its texel-density class (table below).
- Texture budget: 1024 px typical, 2048 hero only. No UDIM — one atlas per
  asset, always.

## Workflow

1. **Clean the mesh first**: `Merge by Distance` (0.0001 m), recalc normals
   outside, remove loose edges. Non-manifold geometry breaks unwrap.
2. **Mark seams** in Edit Mode with `Mark Seam` (Ctrl+E): along hard edges
   (auto-smooth 30–60°), inside panel lines, on material boundaries, along the
   silhouette bottom. Cylinders get one seam on the least-visible edge plus cap
   loops. Split anything baked separately (mirrored halves, lids) into its own
   island group.
3. **Quick pass for props**: `Smart UV Project` (angle limit 66°, island
   margin 0.02) — background clutter only. **Hero pass**: manual seams +
   `Unwrap` (Angle-Based, margin 0.003); boxy architecture uses `Cube
   Projection` at the real dimension (3.0 m cells), then seam cleanup.
4. **Set texel density** (measure px/m with a UV Squares check or the
   `img.measure` script), then scale islands uniformly until checker squares
   match across all shells:

   | Class | Examples | Density |
   |---|---|---|
   | Small prop | tool, can, ammo box | 512 px/m @1024 |
   | Medium | crate, barrel, wall panel | 256 px/m @1024 |
   | Large/hero | building section, vehicle | 128 px/m @1024 |
   | Terrain | ground chunks | 64 px/m @1024 |

5. **Orient islands**: wood grain / lettering runs along U — `UV → Align
   Horizontal`, straighten planks with `UV → Follow Active Quads`.
6. **Pack**: `UV → Pack Islands`, margin = padding target, `Rotate Islands`
   on, `Shape Method: Convex Hull`. Fill the square — 70–80% occupancy.
7. **Overlap check**: `Select → Select All by Trait → Face Overlap` — only
   genuinely identical mirrored parts (rivets, symmetric halves) may share UV
   space, and only with a bake UV offset.
8. **Distortion check**: assign the `UV Grid`/checker at 1024 and orbit the
   model — squares must stay square; a pinch marks a bad seam or non-planar
   fold. Save (glTF exports UVs by default), record density in the QC sheet.

## Rules

- One atlas per asset; no UDIM tiles (Three.js `GLTFLoader` ignores them).
- Texel density uniform *within* an asset (assets may differ by class). Never
  stretch a UV to "fit more detail" — scale the island instead.
- Seams never cross a flat visible face; they hide on hard edges, in
  recesses, or on material boundaries (`M_Metal_Rust` meeting `M_Wood_Old`).
- Mirrored UVs only where geometry/texture are identical, and only with a
  `Selected to Active` bake using cage + UV offset — otherwise separate.
- Padding at 1024 px: 4–8 px (≈0.004–0.008 in 0–1 UV). Scale linearly:
  2048 → 8–16 px, 512 → 2–4 px. Padding prevents mipmap bleed.

## Quality standards

- ≥70% (target 80%) UV fill; no island wasting >5% on empty margin; every
  shell inside 0–1 space; checker distortion visibly zero (stretch ≤1.05).
- Texel density within ±10% across all islands of the asset.
- Grain/lettering orientation matches what `texturing` expects.

## Output

- `.blend` with UV map named `UVMap` (first attribute) + GLB via
  `export-pipeline`; QC note: texel density px/m, pack fill %, resolution.

## Validation

Run in Blender background mode; extend `.blender/scripts/validate_asset.py`:

```
blender -b asset.blend -P .blender/scripts/validate_asset.py -- --check uvs
```

Manual checklist:

1. Checker texture applied — no stretching, no rotated squares on grain faces.
2. `Face Overlap` select reports only intended mirrored pairs.
3. Pack density ≥70% (script prints `uv_fill_ratio`).
4. Density within ±10% of the class target (script prints `px_per_meter`).
5. GLB re-imported in Three.js shows no visible seam under neutral lighting.

## Common mistakes

- One giant island stretched across the atlas (empty space >40%) — re-pack,
  never accept sub-60% fill.
- Seams across flat visible faces instead of hidden edges.
- Stretched UVs "to fit more detail" instead of re-scaling islands.
- Per-asset density drift: two crates on the same shelf at different px/m.
- Padding not scaled with resolution — accept mipmap bleed at 2048.

Cross-links: `retopology`, `high-to-low-baking`, `texturing`, `asset-validation`.
