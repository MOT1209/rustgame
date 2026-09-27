---
name: texturing
description: Layered PBR texturing for RustGame assets — base material, edge wear, cavity grime, stains and decals driven by masks, with procedural/hand-painted/external method choice per asset. Use when authoring or fixing textures, weathering surfaces, adding dirt, rust or wear, or the user mentions texture, texturing, wear, grime, dirt, stains, decals, paint chipping or texture painting.
---

# texturing

## Purpose

Turn correctly unwrapped geometry into surfaces that tell a survival story:
worn, dirty, repaired, rained on. Must read at gameplay distance within the
1024 px mobile budget.

## When to use

- After `uv-unwrapping` and `high-to-low-baking`, before `pbr-materials`;
  redo texture layers after any re-bake (masks invalidate).
- When a model looks "plastic", "too clean", or material identity is unclear.

## Inputs

- UV'd low poly + baked maps (`_N`, `_AO`, curvature/ID from
  `high-to-low-baking`); mood from `3d-art-director` (realistic, survival,
  raw, worn, industrial); texel density from `uv-unwrapping` (256 px/m @1024)
  and the cap: ≤1024 typical, 2048 hero only, power-of-two always.

## Workflow

1. **Choose method per asset** (do not mix randomly within one asset):
   - *Procedural (Blender shader nodes)*: concrete, dirt, rust, painted
     metal — fast, resolution-independent, must be **seeded**
     (`Noise Texture`/`Voronoi` with fixed `W`/`Seed`) for determinism.
   - *Hand-painted (Blender Texture Paint)*: decals, signage, damage stories
     on hero props.
   - *External (Substance/Krita/Photoshop)*: complex layered wear baked to
     shared `T_<Asset>_*` files.
2. **Build the layer stack bottom-up** (shader nodes or external tool):
   1. Base material — clean-but-not-new color, `Noise` at 0.2–0.5 m scale.
   2. Edge wear — baked curvature drives chipped paint to bare substrate.
   3. Cavity grime — inverted AO/curvature in recesses, dark, desaturated.
   4. Liquid stains — vertical streaks under holes/rivets (gradient + noise on
      object-space Z).
   5. Decals/damage — bullet holes, rust runs, stencil lettering, patches.
3. **Apply the wear-decision table** (exposed → worn, hidden → clean):

   | Location | Result |
   |---|---|
   | Exposed edge/corner | paint chipped to bare metal, polished scratches |
   | Recessed/cavity | dust and grime accumulation, darker |
   | Bottom 0–0.5 m | mud splash gradient, spatter |
   | Handle/grip | polished, darkened, lower roughness |
   | Horizontal top | settled dust, UV-flat fading |
   | Under overhang | protected — wear stops at the drip line |

4. **Drive masks from data**, not memory: baked AO/curvature, vertex paint
   grime weight, and the vertex normal up-dot (`.z > 0.7` = dust, `< 0.3` =
   mud).
5. **Fit the budget and name outputs**: power-of-two at density target
   (`_BC`/`_N` 1024, `_R`/`_M` may drop to 512 on large surfaces; no 4K/8K —
   mobile DPR is the constraint). Name exactly `T_Wood_Wall_A_BC`, `_N`, `_R`,
   `_M`, `_AO`, `_H`; confirm color spaces and ORM packing per `pbr-materials`.
6. **Sanity render**: neutral 3-point light, turntable at 2 m and 10 m — at
   10 m the material must read as its substance (wood ≠ plastic).

## Rules

- Never a perfectly clean surface unless the object is explicitly new (still
  needs micro roughness variation).
- Deterministic only: fixed seeds for every noise node; no per-run randomness.
- Masks derive from bake data or vertex paint — hand-drawn noise reads as
  noise, not physics.
- Wear follows gravity and use: streaks go down, mud comes up, polish from hands.
- Respect the texel density from `uv-unwrapping`; never paint detail the UVs
  cannot hold. Delete any mask invisible at gameplay distance.

## Quality standards

- Material identity readable in silhouette + grayscale at 10 m.
- Edge wear confined to high-curvature zones; grime never floods open faces.
- No tiling repetition within 2× asset width — break with a second noise octave.
- All maps power-of-two, ≤1024 typical (2048 hero), named and tracked in the QC
  sheet with resolution and KB; wet stains lower roughness with the mask.

## Output

- `T_<Asset>_{BC,N,R,M,AO,H}` map set + source file in the asset log;
  `M_<Material>` assignment prepared for `materials`.

## Validation

Extend `.blender/scripts/validate_asset.py` (background mode):

```
blender -b asset.blend -P .blender/scripts/validate_asset.py -- --check textures
```

Manual checklist:

1. Every map power-of-two, ≤1024 (2048 only if hero), `T_<Asset>_<suffix>`.
2. Grayscale test: desaturate BC — material still reads via roughness/AO.
3. 10 m screenshot under neutral light — no plastic look, no visible tiling.
4. Seeds fixed: reopen the file, textures byte-identical.
5. Total texture memory logged under the mobile budget (`game-performance`).

## Common mistakes

- Uniform grime over the whole mesh instead of AO/curvature/vertex-paint
  masks — reads as dirt-colored paint.
- Wear with no physical cause (rust on sheltered undersides, mud on tops).
- Unseeded noise nodes — every rebuild produces different textures.
- 4K/8K or non-power-of-two maps on props with no visible detail at 10 m.
- Painting detail finer than the asset's texel density — mush in-game; drop
  it or raise density via `uv-unwrapping`.

Cross-links: `uv-unwrapping`, `high-to-low-baking`, `materials`,
`pbr-materials`, `3d-art-director`.
