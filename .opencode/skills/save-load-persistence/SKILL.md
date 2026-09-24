---
name: save-load-persistence
description: Save/load, schema versioning, migration, autosave and corruption recovery for rustgame. Use when changing persisted state, save format, migration, autosave timing, localStorage handling, or when the user mentions save, load, localStorage, corruption, migration, autosave, saveVersion or persistence.
---

# save-load-persistence

## File map

| File | Ownership |
|---|---|
| `js/core/config.ts` | `SAVE_VERSION`, `SAVE_KEY` |
| `js/save/save-system.ts` | `blank()`, `migrate()`, `loadFromString()`, `read/write`, `createAutosaver()` — pure, storage backend injected |
| `js/game.js` | Calls read/write with `localStorage`; shows notifications |

## Save shape (v2)

```ts
{ saveVersion, timestamp,
  player: { position, rotation, stats, belt, dead },
  inventory: [{ id, count }],
  world: { respawns[], storages[], day, weather },
  buildings: { structures[], toolCupboards[] },
  time }
```

## Hard rules

1. **Never throw.** Every public function returns `null`/`false` on failure —
   a corrupt save must never crash the game.
2. **Distinguish empty vs corrupt**: `read()` returning `null` alone is not
   enough for UX — use the status API (`readWithStatus` → `'ok'|'empty'|'corrupt'`)
   so `game.js` can notify the user ("save corrupted — starting fresh") and fall
   back to `blank()` instead of silently resetting.
3. **Validation before trust**: `validateSave(data)` checks the expected schema
   (types of `saveVersion`, `player.position.*`, `inventory[]` entries, `stats`
   numbers) after `migrate()` — reject or repair with defaults.
4. **Migration is mandatory**: bump `SAVE_VERSION` in config for ANY shape
   change and add a branch in `migrate()` — old saves must keep loading.
5. **Defaults come from one place**: `blank()` + `cleanStats()` reuse config
   defaults; survival fields are re-normalized by `SurvivalSystem.normalize()`
   on load.
6. Storage backend is injected — tests use a memory Map (see existing tests).

## Changing the save format (checklist)

- [ ] `SAVE_VERSION` bumped
- [ ] `migrate()` branch added for the previous version
- [ ] `blank()` updated with the new field
- [ ] `validateSave()` covers the new field
- [ ] Tests: old-version fixture loads; corrupted fixture → status corrupt +
      fallback; round-trip write/read equal
- [ ] Autosave still flushes (`createAutosaver.markDirty/flush`)

## Autosave contract

`createAutosaver(saveFn, intervalMs)` — flush on interval + explicit `flush()`
on page hide/major events. Save failures are logged, never user-fatal.
