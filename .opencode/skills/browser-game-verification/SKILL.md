---
name: browser-game-verification
description: Verify rustgame in a real browser with the agent-browser CLI — launch the game, exercise features, capture screenshots, inspect console errors. Use after every feature or fix before reporting done, or when the user asks to check the game, run it, screenshot it, or debug a browser/visual issue.
---

# browser-game-verification

Rustgame is a Web/WebGL game — unit tests alone never prove it works.
**No change is "done" until the game has been opened and exercised in a browser.**

## Prerequisites

1. Dev server running: `npm run dev` (Vite, note the printed local URL, usually
   `http://localhost:5173`)
2. Use the **agent-browser** skill/CLI for automation (it handles navigation,
   clicks, screenshots, console extraction). Playwright MCP tools are an
   equivalent fallback.

## Standard verification flow

1. **Open** the game URL; wait for the loading screen to finish
2. **Console check** — collect console messages; fail on uncaught errors
   (warnings noted, not fatal)
3. **Start the game** — click `START SURVIVAL` (pointer-lock may require a
   trusted click; fall back to asserting UI state if lock is unavailable)
4. **Exercise the feature** under test:
   - HUD visible (health/hunger bars, clock)
   - Open inventory (`E`), open blueprint (`Q`) — for UI changes
   - Trigger the new behavior (craft, build, save/load, damage...)
5. **Screenshot** before/after states — save as evidence
6. **Persist check** (if state changed): reload page → verify state restored
7. **Report**: PASS/FAIL + screenshots + console excerpt

## Mobile check (when UI/touch changed)

- Emulate 360×740 viewport (or device emulation)
- Verify touch controls visible, tap targets usable, no overflow scroll traps

## Failure triage

| Symptom | Likely layer |
|---|---|
| Blank/black screen | module import error, WebGL init — read console first |
| Feature works in test but not in browser | glue wiring in `game.js`, missing registration |
| Visual misplacement | CSS/layout (`game-ui-ux`) |
| Works desktop, broken mobile | `mobile-game-controls` / responsive CSS |
| Save not restored | `save-load-persistence` |

## Reporting template

```
Browser verification: PASS/FAIL
- URL / viewport:
- Steps exercised:
- Screenshots: (paths)
- Console: clean | errors: ...
```
