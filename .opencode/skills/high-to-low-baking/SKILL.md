---
name: high-to-low-baking
description: Bake high-poly detail onto low-poly UVs in Blender — normal, AO, curvature and ID maps with cage projection, plus artifact diagnosis and fixes. Use when transferring sculpt/boolean detail to a game mesh, or the user mentions bake, baking, normal map bake, AO bake, cage, extrusion, selected to active, projection, curvature or bake artifacts.
---

# high-to-low-baking

## Purpose

Move high-poly surface detail (sculpt, bevels, boolean damage) onto the
low-poly's texture maps so the GLB stays at mobile triangle budget while
looking dense. Bridges `uv-unwrapping` and the maps `texturing` consumes.

## When to use

- After `uv-unwrapping` on the low poly and finishing the high poly
  (`sculpting`, `hard-surface-modeling`); before `texturing`.
- Re-bake whenever either mesh changes — texture masks invalidate with it.

## Inputs

- **High poly**: dense (sculpt/boolean), identical world transform to the low
  poly — safest is both at origin, scale/rotation applied (`Ctrl+A`).
- **Low poly**: UV'd single atlas, padding per `uv-unwrapping`; optional cage
  object for projection.

## Workflow

1. **Align** both objects exactly (same origin, transforms applied) —
   world-space bakes misalign otherwise.
2. **Cage setup** (preferred over raw extrusion): duplicate the low poly as
   `<low>_Cage`; `Extrude`/`Shrink-Fatten` (Alt+S) it so it **clears the
   highest high-poly detail everywhere without intersecting it**; smooth
   concave areas with proportional editing (a flat cage over curved geometry
   streaks).
3. **Select order**: low poly (or cage) first, **high poly last** as active —
   enables `Selected to Active`.
4. **Configure bake** (Render Properties → Bake, Cycles; EEVEE cannot bake):
   - **Normal**: type `Normal`, Space `Tangent`, `Selected to Active` on,
     `Cage` field = `<low>_Cage` (or `Extrusion` ≈ cage distance), Margin =
     4–8 px @1024, `Clear` on. Output Non-Color `T_<Asset>_N`; Blender's
     default is OpenGL +Y = glTF convention.
   - **AO**: type `AO`, `Samples` ≥64, `Only Local` on for object occlusion,
     same cage/margin. Output `T_<Asset>_AO`.
   - **Curvature/ID**: bake AO plus a Geometry-node pointiness pass for
     curvature; for ID maps assign flat emissive colors per part group and
     bake type `Diffuse` with Direct/Indirect unchecked, Color only.
5. **Extrusion tuning**: start at ~1.5× the highest high-poly displacement
   from the low surface (2 mm detail → 3 mm), tighten after pass one.
6. **Inspect at 100% zoom** in the Image Editor — island edges, concave
   corners, thin parts — then iterate per the diagnosis table.
7. **Export** maps power-of-two, ≤1024 (2048 hero), wire up per `pbr-materials`.

## Artifact diagnosis

| Symptom | Cause | Fix |
|---|---|---|
| Black patches / missing data | rays never arrived | increase `Extrusion`, enlarge cage |
| Streaking at edges | cage angle vs high surface | smooth cage, add margin on hard edges |
| Seams on UV borders | margin/padding too small | margin 4–8 px @1024 = UV padding |
| Double/self-intersecting detail | shells inside extrusion range | separate shells, reduce extrusion, bake per shell |
| Mirrored islands swirl | offset needed | unwrap mirrored parts with offset or bake separately |
| Normals lit from wrong side | green channel flipped | keep Blender default (+Y OpenGL); flip only DX sources |
| Soft/blurry detail | bake res below texel density | raise resolution or fix density (`uv-unwrapping`) |

## Rules

- **Never ship a model with visible bake artifacts** — black patches, seams,
  bleeding or normal inversion are release blockers (`asset-quality-control`).
- Cage must clear the highest detail everywhere without intersecting; verify
  via wireframe overlay. One cage per pass; hand-split distant shells.
- Save bakes 16-bit PNG if AO bands; all bakes are Non-Color data.
- AO feeds the ORM R channel (`pbr-materials`) — never multiply it into Base
  Color. Version bake outputs; a re-bake invalidates `texturing` masks.

## Quality standards

- Normal map: no black regions, no island bleeding, clean silhouette edges.
- AO: soft plausible contact shadows, no hard squares at UV borders.
- Curvature/ID crisp enough to drive edge wear in `texturing`; Blender and
  Three.js agree on detail orientation.

## Output

- `T_<Asset>_N`, `T_<Asset>_AO` (+ optional curvature/ID masks), cage kept in
  the `.blend`, bake settings recorded for reproducibility.

## Validation

Extend `.blender/scripts/validate_asset.py` (background mode):

```
blender -b asset.blend -P .blender/scripts/validate_asset.py -- --check bake
```

Manual checklist:

1. Image editor scan of `_N`/`_AO` at 100%: no black patches, no border bleed.
2. Flip-test under a moving light — detail reads outward, not dented inward.
3. Wireframe overlay — seams align with UV seams only.
4. Re-import GLB in Three.js and orbit — no swirls on mirrored parts, no
   stripes on cylinders.
5. Script `bake_artifact_scan` (min-luminance regions) passes.

## Common mistakes

- Baking without `Selected to Active`, or with low poly active — empty maps.
- Extrusion so large it captures the cage/other shells — doubled detail.
- Flat cage over curved geometry — streaks at every concave transition.
- Forgetting UV padding: bake margin smaller than padding → seam bleed.
- AO multiplied into Base Color instead of the ORM R channel.

Cross-links: `uv-unwrapping`, `sculpting`, `texturing`, `pbr-materials`,
`asset-quality-control`.
