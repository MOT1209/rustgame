---
name: world-generation
description: Procedural terrain, biomes, mountains, forests, rivers, roads, monuments and resource spawning for rustgame. Use when generating or modifying terrain, distributing trees/rocks, adding biomes, roads or monuments, or when the user mentions world generation, terrain, biome, map, seed, landscape or spawn distribution.
---

# world-generation

## Current state (Phase 1)

World is largely hand-placed primitives around a flat play area. Resource nodes
(`js/world/resources.ts`) already have a `RespawnManager` with injectable clock
and JSON persistence — that pattern is the template for generation results.

## Design principles

1. **Seed-driven, deterministic**: `generate(seed)` must produce the identical
   world from the same seed — every random draw comes from one injected seeded
   RNG (copy the `WeatherSystem` rng pattern).
2. **Generation is pure data**: output is a description
   (`{ heightAt(x,z) → y, nodes: [...], zones: [...] }`), NOT meshes.
   `threejs-game-engine` turns that data into geometry — keeps generation
   testable without WebGL.
3. **Chunk-friendly API**: expose `heightAt(x, z)` and zone queries so terrain
   can be built/culled incrementally later (`game-performance`).
4. **Biome/zones are data**: `{ type: 'forest'|'mountain'|'river'|'radiated',
   bounds, weights }` — resource spawn tables read the zone under each point.

## Hard rules

- Never place resource nodes inside TC/building zones (feeds `building-system`).
- Radiation zones drive `SurvivalSystem` env flag `inRadiation` — generation
  only provides zone data, it never mutates stats.
- Persist: seed + player-modified state (harvested nodes) only — terrain itself
  is regenerated from seed, never serialized (keeps saves small).

## Adding generation features (checklist)

- [ ] Seeded RNG only (no `Math.random()` in generation code)
- [ ] Pure output data + unit tests (same seed → same result; node counts)
- [ ] Mesh building isolated in adapter, within `game-performance` budget
- [ ] Save format reviewed (`save-load-persistence`)

## Route

game-architecture → world-generation → threejs-game-engine → game-performance
→ save-load-persistence → game-testing → browser-game-verification
