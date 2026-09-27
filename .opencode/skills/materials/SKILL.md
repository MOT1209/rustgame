---
name: materials
description: Physically believable material definitions for the RustGame survival world — metals, wood, concrete, stone, plastic, glass, fabric, leather, rubber, ground and wet surfaces with roughness ranges and variation rules. Use when creating or tuning materials, deciding how a surface should look, or the user mentions material, roughness, rust, wood, concrete, fabric, glass, leather or surface look.
---

# materials

## Purpose

Define what each substance in the survival world is: roughness window,
reflectivity, color variation, micro detail. `pbr-materials` owns map
plumbing; this skill owns believability and material naming (`M_Wood_Old`,
`M_Metal_Rust`, `M_Concrete_Damaged`).

## When to use

- Assigning `M_<Material>` names, authoring shader node groups, or when a
  surface reads as "generic gray" / "plastic"; reviewing `texturing` output.

## Inputs

- Asset context from `environment-art` (indoor/outdoor, exposure, age, use);
  map set from `texturing`/`high-to-low-baking` (BC, N, R, M, AO, H).
- Unit scale 1 unit = 1 m — detail frequencies are meter-relative.

## Workflow

1. **Pick the material family** and baseline roughness from the table.
2. **Set Base Color** from reality: desaturated survival palette, clamped to
   ~0.04–0.92 — pure white/black are wrong.
3. **Set Metallic** per Rules: metals 1.0, everything else 0.0.
4. **Build variation in layers**: large color shift (0.5–2 m noise) → medium
   blotch (0.1 m) → micro detail (scratches/grain) in the normal only.
5. **Add micro detail** via `Normal` or Bump node from `_H`: wood grain
   direction, fabric weave, cast-metal pitting.
6. **Age it**: weathering raises roughness and lowers contrast; polished
   contact spots (handles, tread) lower roughness locally via mask.
7. **Wet variant**: where surfaces get wet, move roughness into the wet range
   *and* darken BC 15–25% — never one without the other.
8. **Name** `M_<Family>_<Variant>` (`asset-naming`) and assign per asset.

## Roughness reference

| Material | Roughness | Metallic | Notes |
|---|---|---|---|
| Polished/brushed metal | 0.15–0.30 | 1 | anisotropic scratches in BC/normal |
| Painted metal | 0.30–0.50 | 0 (paint) | chipped areas flip to 1 |
| Galvanized metal | 0.35–0.55 | 1 | spangle pattern in normal |
| Oxidized/rusted metal | 0.60–0.85 | 0 in rust, 1 under | rust is a dielectric layer |
| Oiled/dark steel | 0.25–0.45 | 1 | slightly darker BC |
| Dry wood | 0.60–0.85 | 0 | directional grain in normal |
| Painted/varnished wood | 0.30–0.55 | 0 | wear reveals dry wood |
| Wet wood | 0.25–0.45 | 0 | darker, glossier |
| Charred wood | 0.75–0.95 | 0 | near-black BC, chunky normal |
| Rough concrete | 0.70–0.90 | 0 | stains darken, do not gloss |
| Polished/planed stone | 0.30–0.55 | 0 | spec breakup via normal |
| Plastic (matte) | 0.40–0.70 | 0 | never mirror-sharp |
| Glass | 0.02–0.10 | 0 | transmission/alpha, IOR 1.45 |
| Canvas/burlap | 0.75–0.95 | 0 | strong weave normal |
| Nylon/synthetics | 0.45–0.70 | 0 | slight edge sheen |
| Leather (worn) | 0.50–0.80 | 0 | crease darkening |
| Rubber | 0.65–0.90 | 0 | very low spec |
| Dry dirt/sand | 0.85–0.98 | 0 | flat, dusty BC |
| Mud/wet ground | 0.30–0.60 | 0 | puddles 0.05–0.15 locally |
| Snow | 0.55–0.85 | 0 | sparkle in normal only |
| Any wet surface | 0.10–0.30 | unchanged | darken BC 15–25% with it |

## Rules

- **Metallic maps are near-binary**: metal = 1, dielectric = 0. No lazy
  gradients across flat surfaces; gradients only at a physical boundary
  (paint chip edge), and even there prefer a hard mask.
- Non-metals are **never** white in the metallic map — top cause of "plastic".
- Rust, paint, dust, mud are dielectrics *on top of* metal: metallic 0 patches
  over metallic 1 base; on 512-class budgets treat the panel as painted (0)
  and let `texturing` decals carry the metal edge.
- Roughness variation correlates with a cause (wear, grime, moisture) — never
  random per-pixel noise as the primary signal.
- Fresnel is free in Principled BSDF; do not fake rim light (`lighting`).

## Quality standards

- Each material within ±0.05 of its table row before masks; grayscale-only
  render still identifies the substance.
- Material count minimized (`pbr-materials`): one material + atlas for most
  props, ≤3 for complex; wet/dry as masks, not duplicate materials.

## Output

- `M_<Family>_<Variant>` materials in the `.blend`, referenced by GLB export;
  material list recorded for draw-call budgeting (`game-performance`).

## Validation

Extend `.blender/scripts/validate_asset.py` (background mode):

```
blender -b asset.blend -P .blender/scripts/validate_asset.py -- --check materials
```

Manual checklist:

1. Naming: every material matches `M_*`; no `Material.001` leftovers.
2. Metallic histogram: only values near 0 or 1 (`metallic_outliers`).
3. Roughness baselines inside the table windows.
4. Neutral-light turntable: no plastic sheen, no mirror on concrete/wood.
5. One-material-per-asset check passes for props (draw-call budget).

## Common mistakes

- Metallic 0.5 "average" values, or non-metals whitened in the `_M` map.
- Roughness set by eye with no physical cause — surfaces read as plastic.
- Copying one roughness for every wood/metal instead of using the table.
- Wet areas darkened in BC but roughness untouched (or vice versa).
- One material per wear variant — exploding draw calls instead of masks.

Cross-links: `pbr-materials`, `texturing`, `environment-art`, `asset-naming`,
`lighting`.
