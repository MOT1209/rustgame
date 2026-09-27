---
name: asset-naming
description: The RustGame naming convention system for meshes, materials, textures, bones, LOD levels and collision objects, keeping Blender datablocks and glTF node names in exact agreement. Use when naming a new asset, renaming data blocks, fixing inconsistent names, or when the user mentions naming, naming convention, prefix, suffix, SM_, SK_, T_, M_, rename, duplicate names or naming rules.
---

# asset-naming

## Purpose
One predictable naming scheme so assets, textures, materials, LOD levels and collision proxies can be found, matched and imported programmatically — Blender object, mesh datablock, material, texture files and GLB node names all tell the same story.

## When to use
- At BLOCKOUT (name the object on creation) and at every pipeline gate: `game-ready-assets`, `export-pipeline`, `asset-quality-control`.
- When a GLB imports with `undefined` node names, when textures fail to bind, or when duplicates appear in the Outliner.

## Inputs
- Asset identity: type prefix, subject, optional variant.
- Texture map types used (base color, normal, roughness, metallic, AO, height, emissive).
- LOD level and collision role if applicable.

### Convention table
| Prefix | Purpose | Example |
|---|---|---|
| `SM_` | Static mesh | `SM_Stone_Wall_A`, `SM_Military_Crate_A`, `SM_Tree_Pine_A` |
| `SK_` | Skinned mesh | `SK_Player_Survivor_A`, `SK_Deer_A` |
| `T_` | Texture | `T_Wood_Wall_A_BC`, `T_Stone_Wall_A_N` |
| `M_` | Material | `M_Wood_Old`, `M_Metal_Rusted` |
| `UCX_` | Collision proxy (`COL_` accepted as legacy alias) | `UCX_SM_Military_Crate_A` |
| `_LOD0.._LOD3` | LOD suffix | `SM_Tree_Pine_A_LOD1` |
| `ATT_` | Attachment empties | `ATT_Hand_R`, `ATT_Back` |
| `B_` / bone names | Armature bones | `B_Hips`, `B_Spine_01` |

Texture suffixes: `_BC` base color, `_N` normal, `_R` roughness, `_M` metallic, `_AO` occlusion, `_H` height/displacement, `_E` emissive.

Derivation rule: texture names come from the asset name — `SM_Wood_Wall_A` → `T_Wood_Wall_A_BC`, `T_Wood_Wall_A_N`; material `M_Wood_Old`.

## Workflow
1. **Name on creation**: type the prefixed name into the object name field at Blockout — never leave `Cube.007`.
2. **Format**: PascalCase segments separated by underscores between prefix/subject/variant — `SM_Wood_Wall_A`. No spaces, no non-ASCII, no leading/trailing underscores, ASCII only (`A-Z a-z 0-9 _`).
3. **Variants**: `_A/_B/_C` for design alternatives; `_01`, `_02` for countable repeats of the same design.
4. **Sync every datablock**: Object name = Mesh datablock name = Material name (where single-material) = GLB node name. Rename the mesh data in the Properties → Object Data tab, not just the object.
5. **Sync texture files**: rename image files on disk and re-link (File → External Data), matching the `T_` derivation rule.
6. **LOD suffix**: append `_LOD0.._LOD3` to object, mesh and node names — level 0 included.
7. **Collision**: prefix the visual name — `UCX_` + full static-mesh name.
8. **Sweep for duplicates**: Outliner → search by name; run the rename checklist below.

## Rules
- One asset = one root name; every derived datablock derives from it by rule, never by hand-invented spelling.
- Duplicate names are forbidden anywhere in the scene (Blender will suffix `.001` — that suffix is a bug, not a convention).
- Case is consistent per segment: PascalCase segments, snake_case is not mixed in.
- Renaming after UV/bake requires touching all of these — the rename checklist: Object, Mesh data, Material, UV map (if named), texture files, GLB nodes.
- Skinned assets: bone names stay stable after `rigging` — renaming bones breaks animation retargeting.
- Never rename `Armature`-bound objects without re-exporting dependent animation GLBs.

## Quality standards
- Zero `.001`-style suffixes; zero spaces; zero non-ASCII characters in any name.
- Object / Mesh / Material / GLB node names identical for every exported asset.
- Texture files on disk match the `T_<Subject>_<Variant>_<Map>` rule exactly, case included.
- Naming passes `asset-naming` review as part of `game-ready-assets`.

## Output
A scene where Outliner names read as a clean index of the game's assets, and GLB node names that the RustGame importer can key off directly.

## Validation
Manual:
- [ ] Every object matches `^(SM_|SK_|T_|M_|UCX_|ATT_|B_)[A-Za-z0-9_]+$`
- [ ] No `.001` suffixes anywhere in the Outliner
- [ ] Object name = mesh datablock name = GLB node name (spot-check in a glTF inspector)
- [ ] Texture files derive from the asset name and re-link without broken paths
- [ ] LOD levels carry `_LOD0.._LOD3`; collision carries `UCX_`

Runnable checks — must exit 0:
```
blender -b asset.blend --python .blender/scripts/validate_asset.py -- --check naming
```

## Common mistakes
- Renaming the object but leaving the mesh datablock `Cube.001` → GLB node name does not match the game's lookup key.
- Spaces or hyphens (`SM-Stone Wall`) → import keys fail silently, fallback placeholder appears.
- Inventing per-asset prefixes (`CRATE_`, `gun_`) outside the table → search and automation break.
- Textures named after the material instead of the asset → atlas binding fails.
- Renaming bones after animations exist → clips orphaned, retargeting broken.

Cross-links: `game-ready-assets`, `export-pipeline`, `rigging`, `asset-validation`, `asset-quality-control`.
