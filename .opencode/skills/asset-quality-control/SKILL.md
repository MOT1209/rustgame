---
name: asset-quality-control
description: Final pass/fail gate for every rustgame 3D asset — reviews geometry, topology, normals, UV, materials, textures, scale, origin, LOD, collision, performance, export and visual quality, and rejects the asset back to the responsible skill when any critical check fails. Use when signing off an asset, deciding if a model is done, reviewing a finished asset, or when the user mentions QC, quality control, review the asset, is this shippable or approve the asset.
---

# asset-quality-control

The only skill allowed to declare an asset **APPROVED**. Everything else
produces work; this one judges it.

## Purpose

Verify the asset against the full game-ready checklist and, on any critical
failure, reject it back to the stage that owns the problem.

## When to use

- After `export-pipeline` completes, always.
- When the user asks "is this asset done / shippable / correct?".
- After any change to an already-approved asset (re-run the full gate).

## Inputs

- The `.blend` source, the exported `.glb`, the validation report from
  `asset-validation`, and references for visual comparison.
- The production plan from `3d-art-director` (budgets, direction, LOD, naming).

## Workflow

1. Run `.blender/scripts/validate_asset.py` headless; a FAIL here short-circuits.
2. Walk the checklist below, marking each ✓ / ✗ / not-applicable.
3. Load the `.glb` in the browser (or a three.js sandbox) and confirm import,
   scale, orientation, materials and textures actually render.
4. Compare renders against the reference; check silhouette, proportion, wear,
   material read at gameplay distance and at close range.
5. Verdict: **APPROVED**, **APPROVED WITH WAIVERS** (only WARN-level findings,
   recorded), or **REJECTED**.
6. On reject: name the failing check and the responsible skill, send it back,
   re-validate, re-review. Never negotiate a critical check away.

## Checklist

**Geometry** — no non-manifold, interior faces, loose/doubled verts; normals
outward; no unapplied silhouette-changing modifiers; no negative scale.
**Topology** — clean edge flow; density matches deformation/curvature; no
accidental n-gons where they break shading or deformation.
**UV** — no unintended overlap; texel density consistent; padding correct;
islands within 0-1.
**Materials** — ≤2 per asset; colour spaces correct; no unused slots; shared
where instancing needs it.
**Textures** — power-of-two; ≤1024 (≤2048 hero only); no missing files;
correct `_BC/_N/_R/_M` suffixes.
**Scale** — 1 BU = 1 m; player/door/grid reference matched.
**Origin** — per convention (footprint centre / grip / hinge / grid node).
**LOD** — chain present for qualifying assets; identical pivot and silhouette;
no pop at transitions.
**Collision** — `UCX_` present, simple primitive(s), silhouette close enough
to feel right in-game.
**Performance** — tris ≤ category budget; ≤2 materials; instancing-ready for
anything repeated; texture size within mobile budget.
**Export** — GLB valid, loads with `GLTFLoader`, placeholder fallback not
triggered, no Blender-only artefacts, naming intact through to node names.
**Visual quality** — matches reference; no bake artifacts; reads as worn,
lived-in and manufacturable; correct against the stated visual direction.

## Rules

1. Critical check (anything marked FAIL-level in `asset-validation`) failing
   → **REJECT**. No exceptions, no "ship it and fix later".
2. Evidence before assertion: a verdict without a validation report and an
   in-browser render is invalid.
3. Never approve on Blender's word alone — the asset is judged inside
   RustGame (import, scale, orientation, collision, lighting, performance).
4. Waivers must be written down with the reason and the owning skill.

## Quality standards

- 100% of critical checks ✓ for APPROVED.
- The review references concrete measurements (tri count, texture px, texel
  density, dimensions in meters), not impressions.

## Output

A verdict block: APPROVED / APPROVED WITH WAIVERS / REJECTED, the evidence
(validation report reference, tri/texture numbers, browser render), and — for
rejections — the failing check, the responsible skill and the required fix.

## Validation

- [ ] `validate_asset.py` → PASS attached to the verdict.
- [ ] Browser import verified (screenshot, console clean).
- [ ] Every checklist row explicitly marked, none skipped silently.

## Common mistakes

- Approving because the render "looks nice" while scale or collision is wrong.
- Skipping re-review after a "small" fix that touched topology or UVs.
- Letting the author of the asset review their own work without the checklist.
- Downgrading a FAIL to a WARN to avoid a rework cycle.
