---
name: combat-system
description: Weapons, melee and ranged damage, hit detection, recoil, reload, ammo and headshots for rustgame. Use when adding weapons, damage types, hit registration, ammo, melee or shooting logic, or when the user mentions combat, weapon, gun, rifle, melee, shoot, hit, damage, headshot, recoil or reload.
---

# combat-system

**Status: partial (Phase 1 has damage centralization only; weapons come in Phase 2).**

## Existing foundation (do not rebuild)

- `js/player/damage.ts` — `DamageSystem.applyDamage(stats, amount, type)` is the
  **only** gateway to HP. `DamageTypes` already includes `ANIMAL`, `GENERIC`,
  etc.
- Fall damage and environmental damage already flow through it.

## Architecture for weapons

| Piece | Location | Notes |
|---|---|---|
| Weapon definitions (data) | `js/combat/weapons.ts` (new) | `{ id, kind: 'melee'|'ranged', damage, headshotMult, rpm, range, ammoType, recoil }` — pure data |
| Hit resolution (pure) | `js/combat/hit.ts` (new) | `resolveHit(attacker, targetBody, weapon)` → damage incl. headshot multiplier — unit-testable |
| Hit detection (adapter) | `js/game.js` glue | Raycast/projection from camera → produces a `targetBody` `{ part: 'head'|'body', dist }` fed to `resolveHit` |
| Ammo/recoil state | `js/combat/` + inventory | Ammo is an inventory item; recoil is camera offset (rendering concern) |

## Hard rules

1. **All weapon damage goes through `DamageSystem`** with the correct
   `DamageType` — no direct `stats.health` writes, ever.
2. **Headshot/recoil math lives in pure functions** with unit tests; the
   raycast in glue code only reports *what* was hit, not *how much* it hurts.
3. **Weapon definitions are data** — balancing (damage, rpm) never requires
   logic changes; tests assert from the table.
4. Melee vs ranged share one `attack()` entry point so input glue stays thin.
5. New persisted weapon state (ammo in magazine) → SAVE_VERSION + migration.

## Unit tests (minimum)

- Headshot multiplier applied exactly once
- Damage clamps at 0 HP; `lastDamageType` set to weapon type
- Reload blocked when ammo insufficient / magazine full

## Route

game-architecture → combat-system → inventory-system (weapons/ammo) →
vfx-system + audio-system (feedback) → save-load-persistence → game-testing →
browser-game-verification
