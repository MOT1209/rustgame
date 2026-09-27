---
name: tools
description: Game-ready tool assets for RustGame — axe, pickaxe, hammer, knife, shovel, building hammer, repair tools, lantern and fishing rod with ergonomic proportions, honest hafting construction and grip-point conventions in Blender 4.x/5.x. Use when modeling any handheld tool, or when the user mentions tool, axe, pickaxe, hammer, knife, shovel, machete handle, lantern, fishing rod, haft, grip, sheath or building hammer.
---

# tools

## Purpose
Build handheld tools whose handle length, head weight and construction are ergonomically believable against the 1.8 m player, cheap enough for the mobile budget (500–2000 tris, textures ≤1024 px), and correctly anchored so the hand grips them at the right point.

## When to use
- Survival and building tools: axe, pickaxe, hammer, knife, shovel, building hammer, repair tools, lantern, fishing rod.
- When fixing grip/origin placement, hafting detail, or tool wear in the game.
- For the crafting/recipe side use `crafting-system`; for generic prop construction use `prop-modeling`; shared metal technique in `hard-surface-modeling`.

## Inputs
- Reference with real dimensions in meters (felling axe ~0.9 m handle, hatchet ~0.4 m; shovel ~1.1 m; claw hammer ~0.33 m).
- The player scale anchors: 1.8 m standing, 1.2 m crouched; a hand spans roughly 0.08–0.10 m — the grip zone is derived from this.
- Tier decision: held/first-person tool vs world-dropped only.

## Workflow
1. **Realism audit in writing**: how is the head forged/cast and hung on the handle (hafting eye, wedge, ferrule)? Which surfaces contact the hand (grip darkens with oil, paint rubs off)? What wears first (edge polished by sharpening, tip rolled, handle struck/shamed by misses)? What gets repaired (handle replaced, tape wrap, wedge re-driven)?
2. **Dimension blockout**: cylinder for handle at real length, cube for head, checked against the 1.8 m player capsule in Front view (Numpad 1). Handle diameter 0.03–0.04 m; head mass reads heavier than the handle visually.
3. **Handle form**: cylinder with Loop Cut (Ctrl+R) tapering, oval cross-section via scale on one axis (axes-constrained Scale on X), optional slight curve for axes/shovels. Grip swell at the base; hatchets get a flared knob.
4. **Head construction**: forge from a cube — Extrude (E) for the blade/bit, Inset (I) + Extrude for the eye socket, Boolean modifier (Exact solver) for the eye hole through the head, applied and cleaned with Merge by Distance.
5. **Hafting as real geometry**: handle passes fully through the eye; model the protruding wedge (thin box driven into the handle end grain) and any ferrule/ring. This single detail sells the construction.
6. **Secondary detail**: hammer claw split (Boolean cut), pick taper (tapered cylinder or cone), shovel blade rolled from a profile (Solidify modifier 0.002–0.004 m), rivets/pins through eyes (6-sided cylinders), leather sheath as a separate shell (Solidify + stitch bumps), fishing rod guides (torus rings, 8-sided).
7. **Bevel + normals**: Bevel modifier Angle-limited 0.0005–0.0015 m, 1–2 segments; Weighted Normal modifier last; apply both.
8. **Wear geometry (silhouette level)**: chipped cutting edges (small notches via knife/proportional edit), dents in hammer faces, bent pick tip, shovel blade rolled edge. Fine scratches belong in the normal map — hand off to `high-to-low-baking`.
9. **Origin + grip point**: create an Empty named `ATT_Grip` at where the hand closes on the handle; set the object origin there, zero rotation, apply scale. Model faces −Y (blade/bit forward).
10. **UV + materials**: `uv-unwrapping`, then `pbr-materials` — material slots split as wood handle / steel head / rubber or leather, max 3 slots.
11. **LOD + collision**: LOD1 for dropped/world tools; simple `UCX_` box/cylinder collision along the handle.

## Rules
1. Handle length vs head weight must be reference-accurate in meters — a shovel handle is ~1.1 m, not "waist high".
2. Every head is hung, not glued: eye hole, through-handle, wedge/ferrule visible.
3. Wear follows use: cutting edges polished bright, handle darkened where held, paint worn at contact points, dirt in the eye crevice and blade shoulders.
4. Budget: 500–2000 tris at LOD0, textures power-of-two ≤1024 px (first-person tools may use 1024 only, never 2048+).
5. Naming: `SM_<Tool>_<Variant>` (e.g. `SM_Tool_Axe_A`, `SM_Tool_Lantern_B`), materials `M_Wood_Handle`, `M_Steel_Forged`, `M_Leather_Worn`, textures `T_Tool_Axe_BC/_N/_R/_M`.
6. Origin at `ATT_Grip`; scale 1.0 applied; faces −Y; no live modifiers in export.
7. Fishing rod: line and float are curves converted to mesh or engine-drawn — keep rod tris low and guides simple.

## Quality standards
- Held at the grip point, the tool's balance looks correct — heavy heads sit forward, shovels hang from the handle center.
- Construction reads at 1 m: hafting eye, wedge and ferrule visible without texture.
- Asymmetric motivated wear: one edge resharpened more, one side of the handle shiny, dents where it was dropped.
- No shading artifacts under Matcap; manifold; no interior faces inside solid heads.
- Tri count within 500–2000; ≤3 material slots.
- Worn but not destroyed: edges are resharpened, handles re-wrapped, not uniformly wrecked.

## Output
GLB with `SM_` tool mesh, `ATT_Grip` empty preserved, origin at grip, `M_` materials, `T_` ≤1024 texture set, optional `UCX_` collision proxy, +Y-up export per `export-pipeline`.

## Validation
Run: `blender -b <file>.blend --python .blender/scripts/validate_asset.py` (tri count, naming, scale, manifold, origin, empties).
Manual checklist:
- [ ] Dimensions within ±5% of reference in meters, checked against the 1.8 m player
- [ ] Hafting eye + wedge (or ferrule/rivet) present as geometry
- [ ] Origin = `ATT_Grip`, scale 1.0 applied, faces −Y
- [ ] 500–2000 tris, ≤3 material slots, textures ≤1024 px power-of-two
- [ ] Wear placement matches use (edge, grip, contact points) — not symmetric
- [ ] Cross-checked with `asset-naming`, `collision-mesh`, `export-pipeline`

## Common mistakes
- Origin at mesh center → tool rotates around its middle instead of the hand.
- Head modeled as one fused lump with the handle → reads as a toy, not a hung tool.
- Painting the wedge and eye instead of modeling them → loses the construction story at close range.
- Symmetrical wear on both blade edges → looks like a texture filter, not use history.
- Oversized handles "so you can see them" → breaks scale against the 1.8 m player.
- Modeling rope/fishing line as dense geometry → tri waste; use curves or engine lines.
