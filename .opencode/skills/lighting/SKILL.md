---
name: lighting
description: Lights RustGame scenes within WebGL limits — one shadow-casting directional light, MeshStandardMaterial, physical light units, emissive sources and time-of-day presets (day, sunset, night, interior, firelight, industrial) mapped to the day/night cycle. Use when lighting a scene or prop, or when the user mentions light, lighting, sun, shadow, sunset, night, darkness, ambient, fog, lamp, firelight, glow, emissive, brightness or time of day.
---

# lighting

## Purpose
Light scenes so composition and gameplay readability come first, while staying inside Three.js reality: one shadow-casting directional light, `MeshStandardMaterial`, no baked GI or ray tracing at runtime, few dynamic point lights, and physical light units (r155+) where intensity values are much larger than beginners expect.

## When to use
- Lighting an environment, interior, hero prop or time-of-day state; converting Blender lookdev values into game light values.
- When a scene is too dark to read, shadows are broken, glow does not illuminate, or mobile FPS drops after adding lights.
- Applied on top of `environment-art`; the value hierarchy and focal emphasis come from `composition`.

## Inputs
- Scene with finished geometry/materials and the intended time-of-day preset (table below).
- Blender lookdev reference: a CC0 HDRI from Poly Haven for material/light reference only — the HDRI is never shipped as the game's lighting.
- Runtime constraints: 1 directional light with shadows (mapSize 2048 desktop / <= 1024 mobile, DPR capped 1.5-2), <= 2-4 unshadowed point lights visible at once, no per-point-light shadows on mobile.

## Workflow
1. **Set the preset**: pick the time-of-day row, set sun elevation and color temperature before touching intensities; composition fixes come after the values are in the right ballpark.
2. **Blender key light**: Light -> Sun, rotation set from elevation (N-panel: elevation = 90 deg - X rotation), Angle 0.5 deg for hard daylight, 3-5 deg for soft/overcast. Strength from the preset table.
3. **Fill and ambient**: Area light at 1/4 key strength opposite, or approximate the game's hemisphere ambient with the World background color at low strength — the fill exists only to keep shadow detail readable for review, the game gets ambient from a hemisphere/fog color.
4. **Three-point for hero props**: Key Area at 45 deg, Fill at 30% opposite, Rim behind the subject at 60% aimed at camera; then delete the fill before export — it is not a game light.
5. **Interiors**: Area lights sized like the actual fixtures (window = 2 x 1.5 m area, soft, spread 60-90 deg); Point lights only for lamps/bulbs; enable shadow on at most one of them.
6. **Night**: World color low-intensity blue (#101a2e), warm point lights (fire, lamps, 1800-2400 K), sun replaced by a dim cool directional (moon) from the preset table. Never pure black ambient — the player must still read silhouettes.
7. **Firelight**: Emission node on the flame mesh (strength 3-8) paired with one warm Point light, decay 2, range <= 12 m; flicker is handled by VFX, not by adding more lights.
8. **Emissive discipline**: every emissive surface gets a matching real light, but keep the count low — cluster emissive props so one light serves several sources; no emissive-only "glow" on things that should illuminate the floor.
9. **Shadow setup**: exactly one DirectionalLight with castShadow; tight ortho shadow camera (±40 m around the play area), bias -0.0005, normalBias 0.02, mapSize 2048 desktop / <= 1024 mobile; PCFSoftShadowMap.
10. **Translate to game values**: physical units mean intensity is raised — directional ~1.0-3.0, hemisphere/ambient 0.15-0.5, point lights in candela (5-40 cd with decay 2) instead of legacy 0-1 values; tone mapping ACESFilmic, exposure 1.0, then adjust the preset, never the exposure, to fix a scene.
11. **Record the preset**: write the final numbers (sun elevation, color, intensity, ambient, fog color/density) into the day/night config table so the cycle reproduces the Blender look.
12. **Fog**: FogExp2 density 0.006-0.010 day / 0.015-0.025 night, color matched to the horizon value — fog carries atmospheric depth and hides distant LOD swaps.

## Rules
1. Lighting serves composition and readability first: the brightest zone is the focal; a beautiful rim that hides the path is wrong.
2. One shadow-casting light, ever. No point-light shadows on mobile; mapSize <= 2048 desktop, <= 1024 mobile.
3. Dynamic point lights <= 4 per view; no light without an emissive/mesh source, no emissive source without a light where it should illuminate.
4. Physical light units (r155+): never reuse legacy 0-1 intensities; verify final values in the browser, not only in Blender.
5. Color temperatures are deliberate: warm focal (1900-3200 K) vs cool ambient/shadow (6500-9000 K) unless the preset says otherwise.
6. Night is dim, not unreadable: silhouettes and hazards stay visible at eye height 1.8 m.
7. Blender and Three.js values must agree on the same preset — record both columns; no per-scene one-off numbers outside the table.
8. No HDRI or baked GI shipped: the runtime lights are the only lighting.

**Per-time-of-day preset table** (day/night cycle targets):

| Preset | Sun elevation | Color temp | Blender sun | three.js sun | Ambient / fog color | Fog density |
|---|---|---|---|---|---|---|
| Dawn | 5-10 deg | 3200 K | 2.0 | 1.6 | #5a6a8a / #93a3bf | 0.010 |
| Morning | 25-35 deg | 4800 K | 3.0 | 2.4 | #7f93ad / #b9c6d6 | 0.008 |
| Noon | 60-75 deg | 5800 K | 4.0 | 3.0 | #a8bcd2 / #cfd9e4 | 0.006 |
| Late afternoon | 35-45 deg | 5600 K | 3.5 | 2.6 | #9aa8bd / #c4c9d2 | 0.007 |
| Sunset | 5-12 deg | 2400 K | 2.5 | 2.0 | #6b5a58 / #d99a6c | 0.012 |
| Dusk | 0-5 deg | 1900 K | 1.0 | 0.8 | #3b4460 / #5d6a8c | 0.015 |
| Night (moon) | 40 deg, angle 3 deg | 7500 K | 0.05 | 0.12 | #101a2e / #16233d | 0.022 |
| Overcast | 55 deg, angle 5 deg | 6500 K | 1.2 | 1.0 | #8b95a3 / #b6bcc6 | 0.010 |
| Interior / cave | sun off | 2700 K lamps | 0 | 0 | #14120f, emissive-driven | 0.030 |

## Quality standards
- Every preset readable at 1.8 m: no crushed black where gameplay happens, no blown white on the focal.
- Shadow map covers the play area with no visible acne, peter-panning or seam at the ortho bounds.
- Clay/desaturated frame: brightest zone = intended focal (`composition` checklist passes).
- Blender render and browser screenshot match within one exposure step for the same preset.
- Total dynamic lights and shadow settings inside the mobile budget; FPS stable after the light pass.

## Output
Per-preset lighting record (sun elevation, color, Blender strength, three.js intensity, ambient, fog color/density, shadow settings) for the day/night config, the `.blend` light rig in `LIGHT` collection, and day/night screenshots from the eye-height camera.

## Validation
Run in Blender background mode: `blender -b scene.blend --python .blender/scripts/validate_asset.py -- --check lighting`
(script counts lights, flags any second shadow-casting light, flags emissive materials with no paired light, verifies preset values against the table; preset values also pass `asset-validation` in the asset log).
Manual checklist:
- [ ] Exactly 1 shadow-casting sun; mapSize 2048 desktop / <= 1024 mobile configured in code
- [ ] <= 4 point lights visible per view, all with matching emissive geometry
- [ ] Preset row implemented in both Blender and the game config, values match the table
- [ ] Browser screenshots for dawn/noon/sunset/night: gameplay readable at 1.8 m
- [ ] Shadow acne/peter-panning absent at bias -0.0005 / normalBias 0.02
- [ ] No HDRI or baked lighting shipped; r155+ physical intensities confirmed in browser
- [ ] Cross-checked with `composition` (value hierarchy) and `pbr-materials` (roughness response)

## Common mistakes
- Reusing legacy 0-1 light intensities after r155+ -> scene renders nearly black in the browser.
- Raising exposure to fix a composition problem -> destroys the value hierarchy.
- Shadow-casting point lights -> immediate mobile FPS collapse.
- Emissive materials with no light (glow that does not touch the floor) or lights with no visible source.
- Two suns or a sun plus a bright fill both casting shadows -> double shadows, wrong time of day.
- Pure black night ambient -> player cannot read silhouettes or hazards.
- Tuning each scene by eye instead of using the preset table -> the day/night cycle flickers between looks.
