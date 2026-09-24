---
name: game-ui-ux
description: HUD, stat bars, inventory and crafting screens, blueprint/radial building menus, hotbar, notifications, death screen, settings and main menu for rustgame (desktop + mobile, EN/AR). Use when modifying UI layout, HUD elements, menus, notifications, styling, or when the user mentions HUD, UI, menu, hotbar, inventory screen, buttons, notification or death screen.
---

# game-ui-ux

## File map

| File | Ownership |
|---|---|
| `index.html` | UI structure: HUD bars, blueprint/radial menus, inventory/crafting panes, death screen, instructions |
| `css/style.css` | Core HUD + inventory styling |
| `css/building.css` | Building-specific UI |
| `js/ui/hud.ts` | Pure formatters: `formatClock()`, `statPercent()` (unit-tested) |
| `js/game.js` | `showNotification()` + wiring updates to DOM elements |

## Hard rules

1. **UI reads state, never mutates gameplay state** — HUD updates are one-way
   (`state → DOM`). Any change to gameplay from UI goes through the proper
   system call (e.g. craft → `craft()`, equip → inventory methods).
2. **Pure formatting in `js/ui/hud.ts`** — anything with string/number logic is
   unit-tested; DOM manipulation stays thin.
3. **Never re-derive game rules in the UI** — reuse `hungerState()`,
   `statPercent()`, `canCraft()`/`missingFor()` from core systems.
4. **Identifiers are stable** — HUD element ids (`health-fill`, `hunger-fill`,
   `slot-1`...) are a contract with `game.js`; renaming requires updating both.
5. **Bilingual strings**: death screen is Arabic (RTL `direction:rtl`); keep new
   user-facing strings consistent — prefer a small string table so copy can be
   centralized later.
6. **Responsive first**: every interactive target ≥ 44px on touch; hotbar and
   inventory must work at 360px width (see `mobile-game-controls`).

## Updating the HUD (checklist)

- [ ] New stat → bar in `index.html` + CSS + updater reading state each frame
- [ ] State bands shown via `hungerState()`/`thirstState()`, not raw thresholds
- [ ] Notifications use `showNotification()` — no ad-hoc alert() calls
- [ ] Works in inventory open/closed states (pointer lock interplay)
- [ ] Verified via `browser-game-verification` screenshots (desktop + mobile width)

## Anti-patterns (reject in review)

- Querying DOM inside render loops without caching element references
- Inline `style` writes for values CSS should own (use classes for states)
- Logic in click handlers beyond a single system call
