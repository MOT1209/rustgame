---
name: game-ready-assets
description: Definition-of-done gate for a single RustGame asset — a full pass/fail QC checklist covering geometry, topology, normals, UV, materials, textures, scale, origin, LOD, collision, performance and export, plus per-category triangle budgets. Use when finishing, reviewing or signing off an asset, or when the user mentions game-ready, QC, checklist, shippable, asset budget, triangle budget, tri count or definition of done.
---

# game-ready-assets

## Purpose
One authoritative gate that decides whether a single asset may ship into the RustGame repo. Every prop, building module, weapon, character and tree clears this checklist before `export-pipeline` and `asset-quality-control`.

## When to use
- At the QC step of the universal pipeline: after OPTIMIZATION → LOD → COLLISION → SCALE → ORIGIN → EXPORT → in-engine validation, before APPROVED.
- Whenever a reviewer asks "is this asset done?", before committing a GLB, and after any change to geometry, UV, materials or scale (a fix invalidates an earlier pass).

## Inputs
- The `.blend` with final low poly, textures, LOD chain and `UCX_` collision proxy (see `lod-generation`, `collision-mesh`).
- Category/tier of the asset (drives the budget table below).
- Reference sheet for the VISUAL QUALITY section; player anchors: 1.8 m capsule, 1.2 m crouch eye, 3.0 m grid, 0.9 × 2.1 m door.

## Workflow
1. **Run the script first** for hard numbers: `blender -b asset.blend --python .blender/scripts/validate_asset.py -- --strict` (tris, materials, scale, naming, orphans).
2. **GEOMETRY**: Edit Mode → Select All by Trait → Interior Faces must be empty; Mesh → Clean Up → Merge by Distance (0.0001 m) and Delete Loose; Mesh → Clean Up → Non-Manifold must return nothing; Shift+N recalculate normals outside.
3. **TOPOLOGY**: edge flow follows the form; no extra loops across flat areas; density fits purpose (statics need no deformation loops).
4. **NORMALS**: Object Data → Normals → Auto Smooth 30–60°, or add Weighted Normal modifier (Keep Sharp on) and apply it; inspect under Matcap (Red Wax) for pinching or dark seams.
5. **UV**: checker texture at target resolution — no stretch, `Face Overlap` clean, uniform texel density, padding 4–8 px @1024 (`uv-unwrapping`).
6. **MATERIALS**: ≤1–2 slots (remove with `Material Slot Remove Unused`); Base Color node = sRGB, Normal/Roughness/Metallic/AO = Non-Color; no empty or duplicate slots.
7. **TEXTURES**: power-of-two; ≤1024 px typical, ≤2048 px only hero/first-person, never 4K/8K; ORM packed into one RGB image.
8. **SCALE**: Ctrl+A → Scale applied, object scale 1.0, dimensions match the reference table in meters (1 BU = 1 m).
9. **ORIGIN**: Object → Set Origin → Origin to 3D Cursor with cursor at the convention point — base center for props, cell corner for building modules, feet for skinned meshes.
10. **LOD**: `_LOD0.._LOD3` present where required, each step ~half the tris, identical pivot and world position across all levels.
11. **COLLISION**: `UCX_` objects present, in the `COLLISION` collection, within tri limits (box ≈12 tris, hull ≤32–64).
12. **PERFORMANCE**: tri count inside the budget table; one draw call where possible (shared material).
13. **EXPORT**: GLB per `export-pipeline`, then load in the browser test page — must not throw, must fall back to placeholder on failure.
14. **VISUAL QUALITY**: side-by-side with reference under neutral lighting; no bake artifacts, no shading errors, silhouette reads correctly.

## Rules
- Fail closed: any red item blocks APPROVED. No "good enough for now".
- Cleanup pass mandatory: no hidden objects (Alt+H, check outliner visibility), no orphan data (Outliner → Orphans Data → Purge, or File → Clean Up → Purge Unused), no leftover modifiers (apply Bevel / Weighted Normal / Array; keep only Armature on `SK_`), no unused materials or images.
- No negative scale anywhere — mirror with Ctrl+M → X or apply scale; negative scale breaks normals and animation export.
- Re-run the whole gate after any edit; do not spot-check only the changed section.

## Quality standards
| Category | LOD0 tris |
|---|---|
| Clutter prop | 100–300 |
| Medium prop | 300–1500 |
| Hero prop | 1500–5000 |
| Building module | 200–800 |
| Tool | 500–2000 |
| Weapon LOD0 | 1500–6000 |
| Character LOD0 | 8000–25000 desktop / ≤12000 mobile |
| Animal | 3000–10000 |
| Tree LOD0 | 1000–5000 |
| Rock | 300–2000 |
| Vehicle | 5000–20000 |

Textures ≤1024 px typical / ≤2048 px hero; UV fill ≥70%; ≤2 materials; skinned meshes ≤4 vertex influences; desktop <300 draw calls, mobile ≥30 FPS.

## Output
An asset marked APPROVED: `.blend` clean, GLB exported and loaded in-browser, QC numbers (tris, texture px, materials, LOD levels) recorded in the PR summary.

## Validation
Manual:
- [ ] All 14 Workflow sections pass, none skipped
- [ ] Tri count inside category budget; texture ≤ budget
- [ ] GLB loads in browser without console errors, placeholder fallback intact
- [ ] `asset-naming` and `export-pipeline` checks green

Runnable checks — both must exit 0:
```
blender -b asset.blend --python .blender/scripts/validate_asset.py -- --strict
blender -b asset.blend --python .blender/scripts/validate_asset.py -- --check geometry,uv,scale,origin,naming,orphan
```

## Common mistakes
- Skipping the purge/orphan step — stale materials ride into the GLB and bloat it.
- Approving on tri count alone while normals, scale or origin are wrong.
- Budget checked on LOD0 only while LOD1/LOD2 are heavier than their parent.
- Negative scale left from mirroring → flipped normals and broken skinning in Three.js.
- Interior faces kept "just in case" → broken bakes and wasted fill rate.

Cross-links: `asset-quality-control`, `low-poly-optimization`, `lod-generation`, `collision-mesh`, `export-pipeline`.
