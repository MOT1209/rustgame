# RUSTGAME — Rust-like Open-World Survival

Three.js survival game (web + Android via Capacitor) plus a parallel Godot 4.x
prototype in `rust-1/`. See [PRD.md](./PRD.md) for product scope (Phase 1 done,
Phase 2 planned).

## Requirements

- Node.js 22+ (tested on 24.x) and npm 10+
- For APKs: Android Studio / SDK (only needed for `cap:build` / `cap:open`)

## Quickstart

```bash
npm install     # install web + capacitor + dev tools
npm run dev     # Vite dev server → http://localhost:5173
npm test        # Vitest suite (31 tests, ~2s)
npm run typecheck  # tsc --noEmit, must report 0 errors
npm run build   # Vite production build → www/
```

## Commands (all real, all wired)

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server (HMR, LAN access for phone testing) |
| `npm run build` | Production build into `www/` (bundles Three.js locally — no CDN at runtime) |
| `npm run preview` | Serve the `www/` build locally for a final check |
| `npm test` | Run `vitest run` — survival logic, crafting, save migration, input, HUD |
| `npm run typecheck` | `tsc --noEmit` over modules + tests (legacy `js/game.js` excluded, see below) |
| `npm run cap:sync` | `npm run build` + copy `www/` into the Android project |
| `npm run cap:build` | Build the APK (requires Android SDK) |
| `npm run cap:open` | Open the Android project in Android Studio |

## Project layout

```text
index.html          # entry (module game import + HUD DOM)
js/game.js          # legacy engine core (gameplay wiring; gradually modularizing)
js/core|player|inventory|crafting|world|interaction|save|input|ui/
                    # Phase-1 survival modules (.ts new / .js + JSDoc)
js/types/           # shared TypeScript types
public/             # static files copied verbatim (icons, manifest, sw.js, version.json, ads/update-checker)
css/                # HUD + building styles
tests/              # vitest suite (phase1.test.mjs — 31 tests)
android/            # Capacitor Android platform (committed; regenerate via cap:sync)
www/                # build output — IGNORED by git, do not edit
rust-1/             # Godot 4.x prototype (independent track, has its own smoke test)
PRD.md              # product requirements & roadmap
```

## How to play (desktop)

`WASD` move · `Shift` sprint (stamina) · `Space` jump · `LMB/F` gather/attack ·
`E` context interact (storage / drink / loot / door / cook / place) ·
`E` otherwise inventory · `Q` blueprint · `H` upgrade/repair · `T` bag ·
`1-6` belt · double-click food/meds to use.

## Survival loop

Gather (axe ×2 wood) → manage hunger/thirst/stamina/temperature → craft
(stone axe, torch, campfire, bandage, storage box) → build/upgrade (Twig→Armored)
→ store loot → cook meat at campfires → survive day/night + rain → save v2
(autosave 60s + on tab-hide + after builds/revives). Corrupt saves show a
notification and start fresh — never a crash.

## QA

- `npm test` must stay green; `npm run typecheck` must stay at 0 errors.
- Browser smoke: serve (`npm run dev`), open console — 0 JS errors; TestSprite
  MCP is configured for full E2E (restart opencode to load it).
- Capacitor: `npm run cap:sync` must exit 0 (it rebuilds `www/` first).

## Troubleshooting

- `cap sync` fails with "platform has not been added" → run `npx cap add android` once.
- Touch device testing → open the LAN URL Vite prints on your phone.
- Game shows "Save corrupted" → the save was invalid; progress resets safely.
