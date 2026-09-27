---
name: prop-modeling
description: Model game-ready props for RustGame — crates, barrels, bottles, cans, furniture, radios, lamps, containers, scrap, medical and food items — with believable proportions, construction logic and wear placement against the 1.8 m player. Use when modeling any interactable or decorative object, or when the user mentions prop, crate, barrel, bottle, can, chair, table, radio, lamp, box, loot container, furniture or clutter.
---

# prop-modeling

## Purpose
Turn a prop reference into a game-ready mesh whose scale, construction and wear are believable next to the player and cheap enough for the WebGL draw-call budget (desktop <300 draw calls, mobile ≥30 FPS).

## When to use
- Any single object a player can pick up, loot from, place, or read as storytelling dressing: crates, barrels, bottles, cans, furniture, radios, lamps, containers, scrap, medical/food items.
- Not for structural/architectural pieces or for organic and rock forms.

## Inputs
- Reference photos with a known real-world size; the 1.8 m player capsule and 1.2 m crouch height as scale anchors.
- Prop tier (clutter / medium / hero) decided before blocking out.
- Grid context if the prop sits in a building (3.0 m cells, 0.9 × 2.1 m door openings — a fridge must fit through a door).

## Workflow
1. **Answer the realism questions first**, in writing, before any geometry:
   - How was it manufactured (stamped, blown, cast, welded, stitched, injection-molded)?
   - How is it assembled — what are the seams, lids, fasteners, welds?
   - How is it used — which surfaces does a hand touch, which side faces the floor?
   - Where do wear, dirt, water and grime accumulate (edges, handles, bottoms, recesses)?
   - What breaks first and how would it be repaired (dents, tape, wire, replacement plank)?
2. **Blockout**: primitives (Cube, Cylinder, Sphere) sized to real dimensions in meters. Check against the player capsule in Front view (Numpad 1). A crate is ~0.5–0.7 m, a barrel ~0.9 m tall, a bottle ~0.25 m.
3. **Primary forms**: Extrude (E), Inset (I), Loop Cut (Ctrl+R). Keep silhouette-defining edges sharp via Edge Crease or Mark Sharp.
4. **Secondary construction**: panel boards on crates (individual slats with 0.004 m gaps), barrel hoops (torus/array), bottle neck profile (spin/screw from a profile curve), can rims (inset + extrude), furniture legs and aprons.
5. **Tertiary wear geometry**: dents (proportional edit or sculpt with a Grab brush), chipped rims, bent corners, sagging lids. Keep it silhouette-level — micro wear belongs in the normal map (hand off to `high-to-low-baking`).
6. **Bevel pass**: Bevel modifier, Angle limit, 0.0005–0.0015 m, 1–2 segments; add Weighted Normal modifier, apply both.
7. **Topology cleanup**: remove interior faces where hidden (bottle inside, closed can), merge doubles, no non-manifold. If over budget → `retopology`; if the prop is static and non-deforming, Decimate (collapse) is an allowed shortcut.
8. **UV + materials**: hand off to `uv-unwrapping`, then PBR texturing — dirt masks driven by ambient occlusion and edge wear, not painted uniformly.
9. **LOD + collision**: props ≥ 1 m or blockable get a simple collision proxy; anything seen at range gets an LOD chain.

## Rules
1. Every prop is checked at real scale — no "looks about right" meshes. 1 BU = 1 m, scale 1.0 applied.
2. Wear follows use: bottoms are dirty, handles are polished, edges are chipped, tops collect dust and water stains.
3. No floating geometry — labels, handles and decals are either real intersecting geometry or baked into the texture.
4. Keep every prop within tier budget before texturing: clutter 100–300 tris, medium 300–1500 tris, hero 1500–5000 tris.
5. Model faces −Y so front-facing detail (labels, grilles, dials) reads correctly in Three.js (+Z forward).
6. Naming `SM_<Prop>_<Variant>` (e.g. `SM_Crate_Wood_A`, `SM_Barrel_Rusty_B`); paired texture `T_Crate_A_BC`, material `M_Wood_Worn`.
7. One material slot per prop where possible — merged draw calls matter on mobile.

## Quality standards
- Silhouette is instantly recognizable as the object in shadow/light only.
- Construction is plausible: a crate has slats and corner posts, a barrel has hoops, a lamp has a cord and socket.
- Wear is asymmetric and motivated (one corner dented, not all four).
- No shading errors under Matcap; no texture stretching at UV time.
- Tris within tier; manifold; origin at the resting base center (so it sits on the floor at y=0).

## Output
GLB (glTF) with `SM_` name, `M_` materials, origin at base, scale applied, plus a collision proxy where the game needs one. See `export-pipeline` for the GLB settings.

## Validation
Run `blender -b <file>.blend --python .blender/scripts/validate_asset.py` in background mode (tri count, naming, scale, manifold, origin).
Manual checklist:
- [ ] Real-world dimensions verified against the 1.8 m player
- [ ] Origin at base center, scale 1.0 applied, faces −Y
- [ ] Bevel + Weighted Normal applied; no live modifiers
- [ ] Tier tri budget respected (100–300 / 300–1500 / 1500–5000)
- [ ] All six realism questions answered and visible in the model
- [ ] Wear placement follows use, not symmetry
- [ ] Naming follows the project convention; passes `asset-quality-control`

## Common mistakes
- Props at wrong scale (a crate the size of a wardrobe) breaking player-relative readability.
- Symmetric damage on all edges — reads as a texture filter, not history.
- Modeling sub-millimeter detail that the normal map should carry → wasted tris.
- Interiors modeled on closed props → invisible faces, broken bakes.
- Origin in the object center → prop floats or sinks when placed.
- One material per slat/part → draw-call explosion on mobile.
