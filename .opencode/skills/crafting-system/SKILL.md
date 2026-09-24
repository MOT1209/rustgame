---
name: crafting-system
description: Recipes, ingredient checks, craft queue, craft time and validation for rustgame. Use when adding or balancing recipes, changing crafting UI or queue behavior, or when the user mentions crafting, recipe, ingredients, craft queue, craft time or cannot craft.
---

# crafting-system

## File map

| File | Ownership |
|---|---|
| `js/crafting/recipes.ts` | `PHASE1_RECIPES`, `canCraft()`, `craft()`, `missingFor()` — pure |
| `js/inventory/storage.ts` | Backing storage (via adapter) |
| `js/game.js` + `js/ui/hud.js` | Craft queue UI, progress, timers |

## Core contract

`craft(recipe, adapter, qty)` receives an **adapter**, not the inventory:

```js
{ has(id, n), consume(id, n), add(id, n), count(id) }
```

This decouples crafting from storage implementation (player inventory,
storage box, future chest) and keeps it trivially testable.

## Hard rules

1. **Craft never goes negative**: consume happens only after `canCraft` passes;
   on failure the inventory is untouched (`missingFor` reports shortfalls).
2. **Qty multiplies cost**: `craft(recipe, adapter, 3)` costs 3× each ingredient.
3. **Validation is the recipe's job** — UI must call `canCraft`/`missingFor`,
   never re-implement cost math.
4. Recipe data is pure data (id, output, cost, time) — no THREE/DOM.

## Adding a recipe (checklist)

1. Ensure output item exists in `inventory-system` (`items.ts`)
2. Add entry to `PHASE1_RECIPES` (ingredients, qty, craftTimeMs, category)
3. Unit test: success path consumes exact amounts + grants output;
   failure path grants nothing and reports `missing`
4. Verify UI shows it under the right category (`game-ui-ux`)

## Craft queue (Phase 2)

- Queue model: `[{ recipeId, qty, remainingMs }]`, ticked by dt in `game.js`
- Cancellation must refund **only unfinished** items (decide policy, test it)
- Queue is persisted state → coordinate with `save-load-persistence`
  (SAVE_VERSION bump + migration)
