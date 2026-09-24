---
name: mobile-game-controls
description: Virtual joystick, touch buttons, touch camera controls, mobile inventory/building UI and device performance profiles for rustgame. Use when adding or fixing touch controls, phone layout, orientation, or when the user mentions mobile, touch, joystick, swipe, phone, tablet, Android or on-screen buttons.
---

# mobile-game-controls

## Current state

- Input abstraction already exists: `js/input/input.ts` — `InputSystem` with
  pluggable providers (`keyboardProvider`, `touchProvider`) polling into unified
  `Actions` (FORWARD, JUMP, ATTACK...)
- Mobile UI is handled by `unified-game-controls.js` (external script loaded in
  `index.html`)

## Hard rules

1. **All input flows through `InputSystem`** — game code reads `Actions`, never
   raw `keydown`/`touch*` events. Adding a new control = add to the provider
   mapping, not a new listener in `game.js`.
2. **Touch never emulates desktop assumptions**: no hover states, no right-click
   reliance — every critical action needs a touch affordance (button/gesture).
3. **HUD/build/inventory UI must be responsive** (see `game-ui-ux`): tap targets
   ≥ 44px, hotbar reachable with thumb, blueprint/radial menu works with tap.
4. **Layout is CSS-first** — JS only toggles state classes; test portrait and
   landscape.

## Adding a new control (checklist)

1. Define/extend the `Action` in `js/input/input.ts`
2. Map it in `keyboardProvider` (desktop) AND `touchProvider` (mobile)
3. Consume it only via `input.isDown(action)` / edge-trigger helpers
4. Add/extend unit test in `tests/` (existing pattern: providers → poll → assert)
5. Visual affordance added for mobile (button/joystick) + responsive CSS
6. Verify on device/emulation via `browser-game-verification`

## Device performance profiles

- Low-end detection (deviceMemory / hardwareConcurrency) feeds
  `game-performance` settings: DPR cap, shadow quality, particle counts
- Keep profiles as data (config), not scattered `if (isMobile)` checks

## Common bugs to guard against

- Touch events firing through UI panels → check `event.target` / overlay flags
- Camera drift after touchend → always clear touch state on cancel/leave
- Zoom/pinch interfering with browser gestures → `touch-action: none` on canvas
