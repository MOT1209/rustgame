---
name: asset-pipeline
description: Managing 3D models (GLB/glTF), textures, animations, icons and audio for rustgame — loading, optimization, LOD and replacing primitive placeholder meshes. Use when importing models, optimizing asset size, adding animations/textures, or when the user mentions asset, model, GLB, glTF, texture, mesh, placeholder cubes, loader or import model.
---

# asset-pipeline

## Current state

- World built from **primitive placeholders** (boxes/cylinders) — the main
  upgrade target for this skill
- Icons: `icons/` (PWA), `icon.svg`
- GLB assets exist in the repo's `rust-1/assets/models/` (Godot subproject) —
  candidates to reuse, but they must be validated/licensed for the web build
  before shipping

## Loading conventions

1. Load models with `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`
   (local npm three — no CDN)
2. **Async + progress**: report progress to the loading screen
   (`#loading-status` in `index.html`); never block the main thread on parse
   bursts for many assets
3. **Load failures must not crash the game** — fall back to a placeholder mesh
   and log a warning (same philosophy as save fallbacks)
4. Centralize the loader in one module (e.g. `js/assets/loader.ts`) — `game.js`
   requests assets by id, it does not embed URLs

## Optimization rules

- Texture: power-of-two, compressed where possible (KTX2/basis later), max
  1024–2048px on mobile profiles
- Model: ≤ reasonable triangle budget for mobile; **draco/meshopt** compression
  when the pipeline supports it
- **LOD** for hero assets; low-poly variants for mobile profile
- Animations: only import clips actually used; share skeletons where possible
- Every asset added: record source, license, size in the PR summary

## Replacing a placeholder (checklist)

1. Asset imported + license verified
2. Loaded via central loader with placeholder fallback
3. Scale/orientation matched to existing collider dimensions (collision must
   still line up — verify in browser)
4. Old geometry/material disposed or pooled correctly (`threejs-game-engine`)
5. Draw calls/triangles re-measured (`game-performance`)
6. Screenshot verification (`browser-game-verification`)

## Boundary

Asset work never touches core systems — gameplay reads ids and stats, not meshes.
