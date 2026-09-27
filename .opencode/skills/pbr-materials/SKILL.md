---
name: pbr-materials
description: Technical Metal/Rough PBR workflow for RustGame — Principled BSDF inputs, map sets per asset type, color-space rules, normal conventions and glTF ORM channel packing. Use when wiring texture maps into Blender or Three.js materials, fixing washed-out/black surfaces, or the user mentions PBR, Principled BSDF, normal map, sRGB, ORM, metallic map, roughness map, base color or color space.
---

# pbr-materials

## Purpose

Wire maps into the Principled BSDF and glTF export so Blender authoring
matches Three.js rendering. Wrong color space or a flipped green channel is
invisible in Blender and catastrophic in-game.

## When to use

- After `texturing`, when connecting `_BC/_N/_R/_M/_AO/_H` maps; before
  `export-pipeline` (packing, export checks).
- When a surface renders washed out, too dark, or "bumpy backwards" in
  Three.js vs Blender.

## Inputs

- Maps `T_<Asset>_{BC,N,R,M,AO,H}` from `texturing`; roughness windows from
  `materials`; target Three.js 0.160 `GLTFLoader`, glTF 2.0.

## Workflow

1. **Create** material `M_<Family>_<Variant>` with a Principled BSDF
   (`Shader Editor → Add → Shader → Principled BSDF`), then **connect each
   map** with the right Color Space on the Image Texture node:

   | Map | Socket | Color Space |
   |---|---|---|
   | `_BC` Base Color | Base Color | **sRGB** |
   | `_N` Normal | Normal (via `Normal Map` node) | Non-Color |
   | `_R` Roughness | Roughness | Non-Color |
   | `_M` Metallic | Metallic | Non-Color |
   | `_AO` Occlusion | AO socket / Mix into Base Color | Non-Color |
   | `_H` Height | Bump node `Height` or Displace | Non-Color |
   | Emission | Emission Color | sRGB |

   **Color data = sRGB, data masks = Non-Color.** Non-Color on Base Color =
   washed-out; sRGB on Roughness = wrong contrast.

2. **Normal maps**: insert a `Normal Map` node (never plug straight into
   Normal). Convention: **OpenGL / +Y / green up — the glTF and Three.js
   convention**; fix DirectX maps by inverting green (Image Editor `Invert G`
   or `Separate/Combine Color`). Shipped `_N` is tangent space only.
3. **ORM packing**: glTF packs Occlusion(R) + Roughness(G) + Metallic(B) in
   one RGB texture. The Blender glTF exporter can merge separate maps —
   verify the option per export — or pack manually (R=`_AO`, G=`_R`,
   B=`_M`) as `T_<Asset>_ORM`. `_N`/`_H` stay separate.
4. **Alpha**: cutout foliage/fences → Material Properties → Settings →
   `Blend Mode: Alpha Clip`/`Alpha Hashed`; confirm the exporter emits
   `KHR_materials_alphaMode`.
5. **Minimize materials**: one material + UV atlas per asset by default, 2–3
   max — each is a draw call against desktop <300 / mobile ≥30 FPS
   (`game-performance`). Keep the node graph linear: textures (left) →
   Normal Map/Bump → Principled → Material Output, so `texturing` can read it.

## Map-set decision table

| Asset type | Maps |
|---|---|
| Opaque solid (prop, wall, rock) | BC + N + R + M |
| Foliage / cutout (leaves, fence) | BC + N + R + alpha |
| Terrain | BC + N + R + M + AO |
| Hero asset (close inspection) | BC + N + R + M + AO + H |
| Emissive (lamp, screen) | + Emission Color/Strength |
| Glass | BC(alpha) + N + R, IOR 1.45 |

Drop `_M` for all-dielectric assets (wood, fabric, concrete) — unconnected
Metallic defaults to 0 and saves a texture.

## Rules

- sRGB on Base Color and Emission only; Non-Color on Normal, Roughness,
  Metallic, AO, Height — no exceptions.
- Three.js/glTF normal = OpenGL +Y; never ship DirectX −Y.
- ORM is exactly R=AO, G=Roughness, B=Metallic — swapping G/B silently
  renders metal as shiny-rough.
- Names follow `asset-naming` (`M_Metal_Rust` style), one per asset where
  possible; never flip a texture to Non-Color to "fix" a look (that masks a
  `materials` calibration error); do not override `map.colorSpace` in
  Three.js (`GLTFLoader` sets sRGB correctly).

## Quality standards

- Blender and Three.js renders match at neutral lighting (screenshot-compare);
  no "rubber" (uniform roughness) or "chrome plastic" (0.5 metallic gradient).
- Each asset records its map set and resolutions; ≤1024 typical, 2048 hero,
  power-of-two, inside the texture memory budget.

## Output

- `.blend` with correct node graphs and color spaces; GLB via
  `export-pipeline` with verified ORM merging; per-asset map-set record.

## Validation

Extend `.blender/scripts/validate_asset.py` (background mode):

```
blender -b asset.blend -P .blender/scripts/validate_asset.py -- --check pbr
```

Manual checklist:

1. Color-space audit: `_BC`/emission sRGB, all others Non-Color.
2. Normal Map node present; texture +Y (OpenGL) convention confirmed.
3. Metallic near-binary (`materials` prints `metallic_outliers`).
4. Export GLB → Three.js vs Blender screenshot: no inversion, no washout.
5. Packed ORM inspected: R=AO, G=roughness, B=metallic.
6. Material count ≤ budget (≤1 props, ≤3 complex).

## Common mistakes

- Roughness/AO textures left in sRGB — crushed contrast, flat surfaces.
- DirectX (−Y) normal maps shipped unflipped — dents read as bumps.
- ORM channel swap (G/B), or the exporter merge option silently off.
- Extra materials per part instead of one atlas — draw calls blow the budget.
- Base Color authored at 1.0 white — blowouts under game lighting.

Cross-links: `materials`, `texturing`, `high-to-low-baking`,
`export-pipeline`, `threejs-game-engine`.
