---
name: inventory-system
description: Items, stacking, storage inventory, belt/hotbar, pickup, drop and containers for rustgame (Phase 2 focus). Use when adding items, changing stack limits, inventory UI behavior, storage boxes, belt/hotbar logic, or when the user mentions inventory, item, slot, hotbar, belt, stack, split, pickup or drop.
---

# inventory-system

## File map

| File | Ownership |
|---|---|
| `js/inventory/items.ts` | Item definitions: `FOOD_DEFS`, `getStackLimit(id)` — pure data |
| `js/inventory/storage.ts` | `StorageInventory` class — add/has/consume/count/transfer/serialize |
| `js/game.js` | Belt/hotbar state, pickup/drop wiring, storage box scene objects |
| `js/ui/hud.js` + `index.html` | Grid rendering (24 slots, belt grid) |

## Core invariants (never violate)

1. **No negative counts** — `consume()` fails atomically if insufficient.
2. **Stack limits enforced on add** — `add('berry', 999)` returns only the
   amount that fit (e.g. 20).
3. **Unknown item ids rejected** — `add('nuke', 5)` returns 0 (registry check).
4. **Round-trip stable**: `StorageInventory.fromJSON(inv.toJSON())` preserves counts.
5. Inventory module is **pure** — no DOM, no THREE, no localStorage.

## Serialization format (save contract)

```ts
inventory: Array<{ id: string; count: number }>   // flat, no nested objects
belt: Array<string | null>                         // item ids or empty slot
```

Any new persisted field (durability, ammo) MUST bump `SAVE_VERSION` and get a
migration branch in `save-load-persistence`.

## Adding a new item

1. Add definition to `items.ts` (id, name, stackSize, icon, category; food adds
   `hungerRestore`/`thirstRestore`/`spoilTime`)
2. Register it in the registry used by `StorageInventory` validation
3. Add/extend tests: stack limit + unknown-id rejection still pass
4. If craftable → wire a recipe via `crafting-system`
5. UI: icon added to hotbar/grid rendering (see `game-ui-ux`)

## Phase 2 roadmap (this skill owns)

- [ ] Item durability (tools/weapons) — persisted per instance
- [ ] Stack splitting (drag to split)
- [ ] Move/swap slots with validation
- [ ] Container storage UI (wooden box) using shared `StorageInventory`
- [ ] Pickup/drop flow polish with the interaction system

## Boundary with other systems

- `crafting-system` consumes/produces via the adapter interface
  (`has/consume/add/count`) — keep that interface stable
- `save-load-persistence` stores only the flat array format
- `loot-system` grants items through `StorageInventory.add()`
