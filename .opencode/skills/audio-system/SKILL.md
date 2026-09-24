---
name: audio-system
description: Game audio for rustgame — footsteps, weather, weapons, UI sounds, ambient loops, music and 3D positional audio (Web Audio / THREE.Audio). Use when adding sound effects, music, volume settings or audio feedback, or when the user mentions audio, sound, music, footstep, SFX, volume or mute. Priority: later phase.
---

# audio-system

**Status: later phase.** Design rules so audio plugs in without violating
architecture when it lands.

## Architecture

| Layer | Location | Responsibility |
|---|---|---|
| Sound definitions (data) | `js/audio/sounds.ts` (new) | `{ id, src, volume, positional, loop }` — pure data |
| Audio adapter | `js/audio/audio-engine.ts` (new) | Web Audio / `THREE.AudioListener` play/stop/volume; the ONLY file importing audio APIs |
| Triggers | system events + glue | `game.js` maps `SurvivalSystem` events, combat hits, UI clicks → `audio.play(id)` |

Core systems **never import audio** — they return events (already the
convention), and glue decides what to play.

## Hard rules

1. **Never autoplay-block**: initialize the `AudioContext` on first user
   gesture (START button) — mobile browsers suspend audio otherwise.
2. **One-shot pooling**: short SFX reuse buffers; no `new Audio()` per shot.
3. **Positional audio** only where it matters (nearby events) — cap concurrent
   voices; steal oldest on overflow (`game-performance`).
4. **Volume channels** (master / sfx / music) stored in settings + persisted
   via save or local settings key.
5. **No audio in unit tests** — adapter is mocked; triggers are tested as event
   → expected `play(id)` calls.

## Integration points (priority order)

1. UI clicks + notification sounds (cheap, immediate feel improvement)
2. Survival state changes (hunger critical, damage taken — from existing events)
3. Footsteps / movement (adaptive to surface later)
4. Gathering + building placement feedback
5. Combat hits / weapons (with `combat-system`)
6. Weather + ambient loops (with `weather-daynight`)

## Route

audio-system → game-ui-ux (volume settings) → game-testing →
browser-game-verification (audible check on desktop + mobile)
