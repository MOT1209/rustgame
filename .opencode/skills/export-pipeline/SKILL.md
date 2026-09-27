---
name: export-pipeline
description: Reliable GLB export from Blender for RustGame — pre-export validation, exact bpy.ops.export_scene.gltf settings, headless background export scripts and post-export import checks. Use when exporting a model, automating or batching exports, fixing broken or empty GLBs, or when the user mentions export, GLB, glTF, exporter, background export, export settings, missing textures or import fails.
---

# export-pipeline

## Purpose
Turn a validated `.blend` into a GLB that loads first time in `three/addons/loaders/GLTFLoader.js` — correct scale, orientation, materials, textures, animations and collision metadata, with a repeatable script behind it.

## When to use
- The terminal step after `game-ready-assets` passes, and whenever an asset must be (re)generated for the repo or CI.
- When a GLB is empty, upside-down, unscaled, texture-less, or throws in the loader.

## Inputs
- Approved `.blend`; selection or object name to export (`--input`); output path under the game's asset folder.
- Asset class: static (`SM_`) vs skinned/animated (`SK_`) — changes apply-transform and animation flags.

## Workflow
1. **Pre-export validation in Blender**:
   - Transforms: Ctrl+A → Rotation for statics; for `SK_` assets decide apply-rotation/apply-scale once and stay consistent — never blind-apply scale on a rigged mesh (bones rebake badly).
   - Scale = 1.0, dimensions in meters (1 BU = 1 m), object faces −Y (Front view, Numpad 1) so it lands +Z forward in Three.js.
   - Materials: Base Color sRGB, Normal/Roughness/Metallic/AO Non-Color; images packed or validly linked (File → External Data → Pack Resources for portability).
   - UV present and named `UVMap`; normals recalculated outside, smooth-by-angle or Weighted Normal applied.
   - Naming per `asset-naming`; LOD levels and `UCX_` collision present; origins set per convention.
   - Delete hidden objects, purge orphans (File → Clean Up → Purge Unused), apply all modifiers except Armature.
2. **Set selection**: select only the export root(s) — collision, LODs and attachments that belong to the asset.
3. **Export via `bpy.ops.export_scene.gltf`** with:
   `export_format='GLB'`, `use_selection=True` (single asset), `export_yup=True` (default, +Y up), `export_apply=False` for rigs / `True` for statics, `export_materials='EXPORT'`, `export_texcoords=True`, `export_normals=True`, `export_extras=True` (carries collision metadata), `export_animations=True` and `export_skins=True` for `SK_`, `export_cameras=False`, `export_lights=False`. `export_texture_dir` is unused for GLB. Draco/meshopt compression only if the decoder addons are wired into the three r160 loader — otherwise leave compression off.
4. **Headless export** for CI/batches:
   ```
   blender.exe --background file.blend --python .blender/scripts/export_glb.py -- --input SM_Military_Crate_A --output out/SM_Military_Crate_A.glb
   ```
5. **Post-export import check**: re-import the GLB into a clean Blender scene (File → Import → glTF 2.0) and confirm geometry, materials, UV, origin; then load it in a three.js test page — failure must fall back to the placeholder mesh, never crash (`asset-pipeline`).
6. **Verify size on disk and texture budget**: GLB ≤ expected weight; textures ≤1024 px typical / ≤2048 px hero, power-of-two, no 4K/8K; count embedded images.

## Rules
- One asset per GLB, one root node — no kitchen-sink scenes.
- `export_yup` stays default (True): the Blender +Z-up / −Y-front convention already converts to Three.js +Y-up / +Z-forward; do not hand-flip geometry.
- Statics: apply rotation (and scale) before export; skinned meshes: decide once per rig and never vary.
- `export_extras=True` is mandatory when `UCX_` collision metadata must reach the importer.
- Compression flags are all-or-nothing with the decoder: if Draco/Meshopt decoder is not registered in the loader, export uncompressed.
- Export only animations actually used (`export_animations=True` with the clip selection), never the whole NLA stash.

## Quality standards
- Re-import shows identical geometry, materials and origin to the source `.blend`.
- Loads in-browser with zero console errors; placeholder fallback path still intact.
- GLB size within budget; texture count and resolutions compliant.
- Node names match `asset-naming` exactly (no `.001`, no spaces).

## Output
A `.glb` in the repo's asset folder plus a QC note: file size, tri count, material/texture counts, animation clips included, LOD levels included.

## Validation
Manual:
- [ ] Re-import into an empty Blender scene: geometry, materials, UV, origin all correct
- [ ] Loads in three.js test page, no console errors, placeholder fallback untouched
- [ ] File size and texture budget on disk verified
- [ ] Scales/orientation correct against the 1.8 m player in-engine
- [ ] `UCX_` and LOD nodes present when expected

Runnable checks — both must exit 0:
```
blender -b file.blend --python .blender/scripts/export_glb.py -- --input SM_Military_Crate_A --output out/tmp.glb
blender -b --python .blender/scripts/validate_asset.py -- --check export --input out/tmp.glb
```

## Common mistakes
- `use_selection=False` → the whole scene (helpers, cameras, other assets) exported into one GLB.
- Applying scale on a rigged mesh → deformed skeleton, broken animations.
- Forgetting `export_extras` → collision metadata never reaches the game.
- Enabling Draco without wiring the decoder addon → loader throws on every asset.
- Exporting with unapplied transforms → asset imports at scale 0.01 or rotated 90°.
- Relative texture paths + unpacked images → GLB exports with missing textures.

Cross-links: `asset-naming`, `game-ready-assets`, `asset-validation`, `animation`, `rigging`.
