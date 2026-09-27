---
name: asset-validation
description: Automated Blender Python validation of game assets — naming, transforms, scale, origin, materials, UVs, non-manifold geometry, polygon counts, textures, LOD and collision, emitting a PASS/WARNING/FAIL report. Use when running or writing asset validation scripts, checking a .blend or .glb before export, or when the user mentions validate, validator, QA script, report or check the model.
---

# asset-validation

Automated, deterministic checks. Judgement calls belong to
`asset-quality-control`; this skill only produces machine-verifiable evidence.

## Purpose

Catch the mechanical failures (wrong scale, bad names, non-manifold junk,
missing LOD/collision, oversize textures) before a human or the QC gate looks
at the asset.

## When to use

- After modelling/UV/texturing, before export.
- In CI or a pre-export hook on a `.blend`.
- On an imported `.glb` right after it lands in the repo.

## Inputs

- A `.blend` with the asset selected (or a collection), or an exported `.glb`.
- Optional budget overrides (max tris, max texture px, required LODs).
- CLI: `blender.exe --background <file>.blend --python .blender/scripts/validate_asset.py -- --object SM_Crate_A --budget 1500`

## Workflow

1. Load the scene headless (`--background`), select the target object or
   collection.
2. Run the check groups below and collect findings as
   `{level: PASS|WARNING|FAIL, code, message}`.
3. Print a table plus a final verdict line: `RESULT: PASS | WARN | FAIL`.
4. Exit non-zero on FAIL so scripts/CI can gate on it.
5. Any FAIL → return the asset to the skill named in the report and re-run.

## Check groups

| Code | Check | Level |
|---|---|---|
| NAME | object/mesh/material names follow `SM_/SK_/T_/M_/UCX_`, no spaces/non-ASCII | FAIL |
| XFORM | scale = (1,1,1), no negative scale, rotation applied where required | FAIL |
| SCALE | real-world dimensions match expected reference (meters) | FAIL |
| ORIGIN | origin at the convention point (footprint centre / grip / hinge) | FAIL |
| MESH | non-manifold edges, interior faces, loose verts, doubled verts, ngons in deforming areas | FAIL |
| NORMAL | flipped/outward normals, custom split normals sane | FAIL |
| UV | ≥1 UV map, no unintended overlap, islands inside 0-1, padding present | FAIL |
| MAT | ≤2 materials, no empty/unused slots, correct colour spaces (BC=sRGB, N/R/M=Non-Color) | FAIL |
| TEX | power-of-two, ≤1024 (≤2048 hero), no missing files | FAIL |
| TRI | triangle count ≤ category budget | FAIL over 120% / WARN over 100% |
| LOD | `_LOD0..n` chain present for qualifying assets, pivots match | FAIL |
| COL | `UCX_` collision object present, primitive ≤64 tris | FAIL |
| HIDDEN | no hidden/unused objects, orphan data purged | WARN → FAIL at export |
| MOD | no unapplied modifiers that change silhouette | FAIL |
| SKIN | ≤4 influences per vertex, bone count ≤70 | FAIL |

## Rules

- Deterministic: same scene → same report. No randomness, no network.
- Never mutate the scene during validation (read-only checks).
- WARN never masks FAIL; a WARN-only asset may ship only if the director
  recorded an explicit waiver.
- Budgets come from the table in `game-ready-assets`, overridable per run.

## Quality standards

- Every check is independently runnable and reports the offending datablock
  name plus the measured vs expected value.
- Report is stable and diffable (sorted by code, then object name).

## Output

- Console table + `RESULT:` line.
- Optional JSON report (`--report out.json`) for tooling.

## Validation

- [ ] Script runs headless without opening a UI.
- [ ] Deliberately broken fixtures (renamed object, scale 2.0, deleted UV)
      each produce the expected FAIL code.
- [ ] A known-good asset returns `RESULT: PASS`.

## Common mistakes

- Validating only the visible object while hidden junk exports alongside it.
- Treating validation as QC — a PASS says nothing about whether the asset
  looks right; `asset-quality-control` still runs.
- Running with the wrong budget profile (desktop numbers on a mobile asset).
