---
name: terrain
description: Authors RustGame ground — sculpted terrain meshes, cliffs, rocks, dirt, mud, sand and grass surfaces — with splat/vertex blend masks, tiling breakup, chunking for streaming and a low draw-call shared material. Use when building or fixing the ground, or when the user mentions terrain, heightmap, landscape, cliff, rock, ground, dirt, mud, sand, snow, splat map, blend mask, tiling, chunk or ground texture.
---

# terrain

## Purpose
Produce the high-visibility ground layer of the world: a chunked, low-draw-call terrain mesh with believable sculpted relief, rock/cliff assets that merge into it, and material blending that hides tiling at every distance the player can see.

## When to use
- Sculpting hills, valleys, riverbeds, roads cuts, plateaus; authoring cliff/rock assets; authoring ground material sets and blend masks.
- When ground textures visibly tile, chunks crack, or terrain eats the draw-call budget.
- Foliage sits on top of this layer (`vegetation`); scene dressing and scatter masks come from `environment-art`.

## Inputs
- World layout data: heightfield source or hand-sculpt target, biome/material list (grass, dirt, mud, sand, rock, optional snow), and the road/path network to cut in.
- Chunk size decision: 32 m chunks (2048 px at 64 px/m) or 16 m chunks (1024 px at 64 px/m).
- Budget: terrain is always visible -> one shared material, merged/chunked meshes, distant chunks LOD'd; textures POT, <= 2048 px for hero/landscape ground only.

## Workflow
1. **Choose the representation**: heightfield Grid for walkable ground (cheap, streams cleanly); sculpted mesh only where the silhouette demands it (cliff faces, rocks). Terrain data must stay reproducible from the seed — the mesh is generated from data, art passes only add authored set pieces.
2. **Base grid**: Add -> Mesh -> Plane sized to the chunk, Edit mode -> Mesh -> Subdivide to ~0.5-1.0 m vertex spacing (64-128 cuts on 32 m); set origin at chunk center, bottom at Y = 0 of the chunk datum.
3. **Macro relief**: Proportional Editing (O, Smooth falloff, radius 15-40 m) to push hills and valleys; keep playable slopes <= 35 deg where the player walks.
4. **Cliff detail**: Sculpt Mode brushes — Clay Strips for strata, Draw Sharp for fracture edges, Smooth to blend; Mask brush to protect flat areas; Dyntopo off so UVs survive.
5. **Micro breakup**: Displace modifier with a Clouds texture (Texture Properties -> New -> Clouds, size 0.3-0.6, depth 2) at strength 0.05-0.15, then a second Displace with Voronoi (crackle) at 0.05 on rock-only vertex groups; apply both before UV work.
6. **Blend masks**: paint two data layers — (a) Color Attribute masks (R = dirt, G = grass, B = rock) via Texture Paint -> Vertex Color at vertex resolution for broad transitions, (b) a painted image mask `T_Terrain_Splat` for sharp detail (paths, puddle edges). Drive both from the same brush session so they never disagree.
7. **Tiling breakup**: three stacked fixes — second UV layer scaled to 0.1x (UV -> Smart UV Project, then scale UVs in the Image Editor) multiplied as macro variation; large-scale noise on roughness; ground decals (alpha planes, Shrinkwrap Project mode) at every transition the eye rests on.
8. **Texel density**: lock 64 px/m — UV -> Cube Projection, then set the density in the Image Editor N-panel; a 32 m chunk maps to 2048 px, a 16 m chunk to 1024 px. No higher density (wasted memory), no lower (blurry close-up ground).
9. **Cliff and rock assets**: separate `SM_Rock_<Type>` meshes sunk 20-40% into the terrain (intersection is fine — surfaces are angled, not coplanar); scatter with Geometry Nodes Distribute Points on Faces restricted to a slope vertex group (dot(normal, Z) < 0.6).
10. **Chunking**: one object per chunk named `SM_Terrain_<Area>_C<X>_<Y>`; extrude border edges down 1.0 m as a skirt to hide LOD cracks; share one material across all chunks.
11. **LOD**: Decimate -> Collapse 0.5 / 0.25 / 0.1, with border vertices held at weight 1 in a `border` vertex group so chunk seams stay aligned (`lod-generation`).
12. **Export**: apply transforms, scale 1.0, per-chunk GLB or one merged area GLB via `export-pipeline`; keep masks as vertex colors (export with color attributes) or as `T_Terrain_Splat`.

## Rules
1. One shared terrain material for every chunk — per-chunk materials break batching and blow the 300 draw-call ceiling.
2. No visible tiling within 2 camera heights: macro variation layer, noise-broken roughness and decals are all mandatory, not optional.
3. No coplanar surfaces anywhere: decals are Shrinkwrapped (projected), rocks intersect at an angle, skirts hang below, never on the surface plane.
4. Blend masks are painted once and consumed by both vertex color and image mask — never hand-tuned per chunk.
5. Playable slopes <= 35 deg, roads <= 12 deg; sculpt honors those limits or gameplay breaks.
6. Chunk size is fixed at 32 m (2048 px @ 64 px/m) or 16 m (1024 px); seams are independent of the 3.0 m building grid — a foundation may cross a seam because both chunks carry geometry and the skirt hides any LOD gap.
7. Textures POT: <= 1024 typical, <= 2048 for hero ground, never 4K; names `T_Terrain_<Material>_BC/_N/_R`.
8. Distant chunks always LOD down; the horizon must not be the LOD0 mesh.

## Quality standards
- Walk the ground at eye height 1.8 m: no visible repetition, no stretching, no seam lines between chunks.
- Slope/material agreement: rock texture on steep faces, mud in hollows, grass on flats — masks follow the sculpt.
- Clay render holds: silhouette and value variation read with textures off.
- Draw call count for the whole terrain block fits inside the budget with foliage and structures still included.
- Naming `SM_Terrain_<Area>_C<X>_<Y>`, `SM_Rock_<Type>_<Variant>` per `asset-naming`.

## Output
Chunked terrain GLBs with shared material, vertex-color/image blend masks, rock and cliff asset GLBs with LODs, plus a material list (which splat channel maps to which `T_Terrain_*` set).

## Validation
Run in Blender background mode: `blender -b terrain.blend --python .blender/scripts/validate_asset.py -- --check terrain`
(script asserts chunk bounds on the chunk lattice, single shared material, border vertices identical across neighbour seams, texture sizes, tri budget per LOD).
Manual checklist:
- [ ] Neighbour chunk borders compared coordinate-by-coordinate: vertices match, skirt covers the gap
- [ ] Tiling test: top-down render of one chunk at 4x scale — no repeating pattern inside 2 camera heights
- [ ] Blend masks painted once; vertex color and image mask agree on a test overlay
- [ ] Slopes <= 35 deg on walkable areas, roads <= 12 deg
- [ ] No coplanar decals/rocks (wireframe + z-fighting check at grazing angle)
- [ ] Texture sizes POT within budget; naming passes `asset-naming`
- [ ] LOD chain passes `lod-generation`; export passes `export-pipeline`

## Common mistakes
- Per-chunk materials or per-chunk texture sets -> draw-call explosion and visible color jumps at seams.
- Scaling one UV to fix tiling without a macro variation layer -> pattern still reads from distance.
- Decals placed flat without Shrinkwrap -> z-fighting shimmer, the worst artifact on mobile.
- Sculpting with Dyntopo on -> UVs destroyed, masks unusable, full re-unwrap.
- LOD decimate without pinned borders -> chunk cracks open at the horizon.
- Ignoring the 3.0 m building grid at chunk seams -> foundations cannot span a boundary.
- Snow/dry variants rebuilt from scratch instead of a color-ramp swap on the shared material.
