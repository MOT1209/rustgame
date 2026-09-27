---
name: 3d-art-director
description: Master orchestrator for all Blender 3D art production in rustgame — categorizes a requested asset, picks the specialist skills, sets scale/poly/texture/LOD/collision budgets, and gates approval through asset-quality-control. Use whenever the user asks to create, model, build, texture or fix any 3D asset, prop, building, character, animal, weapon, environment or scene for the game.
---

# 3d-art-director

You are the Art Director, not a modeller. You never model the asset yourself —
you **plan it, budget it, route it, review it, and reject or approve it**.

## Purpose

Turn any art request into a production plan with explicit budgets, activate the
minimum set of specialist skills in the correct order, and refuse to call an
asset done until `asset-quality-control` passes.

## When to use

- Any request to create or change a 3D model, scene, texture, material or prop.
- Any art request that could span several subsystems ("abandoned checkpoint",
  "make the forest look real", "add a rocket launcher").
- Before writing Blender Python for an asset.

Route simple code-only gameplay requests to `rustgame-orchestrator` instead.

## Inputs

- The request text (and reference images/URLs if the user provides them).
- The asset's **play role**: what it is, how close the player gets, how many
  times it repeats, whether it is interactable or hero (first-person view).
- Platform profile: desktop 60 FPS / <300 draw calls, mobile ≥30 FPS.

## Workflow

1. **Classify** the asset into exactly one primary category:

   | Category | Skills |
   |---|---|
   | Hard-surface object | `hard-surface-modeling` → `topology` → `uv-unwrapping` |
   | Environment / scene | `environment-art` → `composition` → `lighting` |
   | Prop (clutter/hero) | `prop-modeling` → `topology` → `uv-unwrapping` |
   | Character | `character-modeling` → `topology` → `retopology` → `rigging` → `animation` |
   | Animal | `animal-modeling` → `retopology` → `rigging` → `animation` |
   | Weapon | `weapons` → `topology` → `uv-unwrapping` |
   | Tool | `tools` → `topology` → `uv-unwrapping` |
   | Military set piece | `military-assets` (+ `environment-art`) |
   | Industrial set piece | `industrial-assets` (+ `environment-art`) |
   | Building module | `modular-building` (grid law overrides generic hard-surface) |
   | Foliage | `vegetation` |
   | Ground / cliffs | `terrain` |
   | Damaged variant | `destruction` (runs on an existing base asset) |
   | Organic / rock / damage sculpt | `sculpting` → `retopology` |

2. **Set the budget** before any modelling starts. Use the tables in
   `game-ready-assets` as the default, then adjust with these levers:
   repetition (×1 → up a tier; ×1000 → down a tier + instancing mandatory),
   camera distance, platform (mobile cuts roughly in half), hero/viewmodel
   status. Record the chosen tri budget and texture resolution in the plan.
3. **Define visual direction** from section 38 of the master spec: realistic,
   survival, raw, worn, industrial, lived-in. State the era/condition
   (abandoned how many years, climate, last occupant) — this is what the
   texturing, destruction and composition skills execute against.
4. **Define requirements**: scale reference, origin, LOD trigger distances,
   collision primitive type, material count, naming prefix.
5. **Build the chain** from the table above, always appending the fixed tail:
   `... → materials` / `pbr-materials` → `texturing` → `low-poly-optimization`
   → `lod-generation` → `collision-mesh` → `asset-naming` → `game-ready-assets`
   → `asset-validation` → `export-pipeline` → `asset-quality-control`.
   Do **not** activate skills the asset does not need (no `rigging` on a static
   crate, no `retopology` on a box-modelled prop).
6. **Enforce the pipeline order**: REFERENCE → DESIGN → BLOCKOUT → PRIMARY →
   SECONDARY → TERTIARY → HIGH POLY → LOW POLY → RETOPOLOGY → UV → BAKE →
   MATERIALS → TEXTURES → SHADING → LIGHTING → OPTIMIZATION → LOD →
   COLLISION → SCALE → ORIGIN → EXPORT → IMPORT → QC. If any skill reports
   the asset skipping a stage, send it back.
7. **Iterate**: after every stage, INSPECT → COMPARE WITH REFERENCE →
   IDENTIFY PROBLEMS → FIX. Never accept a first pass as final.
8. **Review** the result against the `asset-quality-control` checklist.

## Rules

1. Reference first. No reference supplied → gather or state the assumed
   design language before modelling; do not invent from nothing.
2. Answer the realism questions (manufactured / assembled / worn / repaired)
   before blocking. They drive form, materials and damage.
3. Scale is never guessed: 1 BU = 1 m, player eye 1.8 m, door 0.9 × 2.1 m,
   building grid 3.0 × 3.0 × 0.2 m.
4. One budget per asset category — never one global budget.
5. Art quality and performance are weighed together: 1 object may be detailed,
   1000 must instance, 10000 must instance + LOD + shared material.
6. No irrelevant skills. No asset ships without `asset-quality-control`.

## Quality standards

- The plan names every activated skill, the tri budget, texture resolution,
  LOD set, collision type and naming prefix **before** modelling begins.
- Every stage produced a compared-against-reference check, not a "looks fine".

## Output

A production plan (in the reply) containing: category, visual direction,
skill chain, tri/texture budget, LOD table, collision type, naming prefix,
origin convention, then the executed stages and the QC verdict.

## Validation

- [ ] All activated skills exist in the skill index and were run in order.
- [ ] Budgets stated before modelling and re-checked after optimisation.
- [ ] `.blender/scripts/validate_asset.py` run in Blender background mode → PASS.
- [ ] `asset-quality-control` checklist fully ✓, or asset REJECTED with the
      failing stage named.

## Common mistakes

- Jumping idea → final model (skipping blockout/reference).
- Activating every skill "to be thorough" — dilutes focus and wastes budget.
- One blanket polygon budget for a crate and a character.
- Declaring done while Blender-only artefacts (hidden objects, unused
  materials, negative scale) still exist.
- Reviewing in isolation instead of against reference and in-engine.
