# RUSTGAME — Unity port (foundation layer)

This is the start of a from-scratch Unity reimplementation of the game in
`../js/`. It is **not** a Three.js-to-Unity conversion — it's a clean C#
rebuild of the same gameplay logic, using the *verified, live* numbers from
the JS codebase (not the design doc's original guesses — see
`../docs/UNITY_PORT_PLAN.md` §24 for the full audit that found and fixed
several mismatches between what the docs assumed and what `game.js` actually
does).

## ⚠️ Built without a Unity Editor

This was written in a cloud sandbox with no Unity Editor installed. Every
`.cs` file here is real, hand-written C# — not a placeholder — but **none of
it has been opened, compiled, or run in the Editor yet.** Expect the first
open to surface small things a compiler would have caught immediately
(a typo, a missing `using`, an API name that drifted between Unity
versions). Budget time for that first-open pass before building on top of
this.

## Opening the project

1. Install **Unity 6000.0.35f1** (or retarget via Unity Hub to whatever 6000.0
   LTS patch you have — `ProjectSettings/ProjectVersion.txt` names this one
   because it's a recent LTS at the time of writing, not because the code
   depends on that exact patch).
2. Unity Hub → **Add** → point it at `unity/RustgameUnity/`.
3. First open will be slow — Unity generates `Library/` from scratch and
   re-imports every script, which is also when any compile errors surface.
4. Once it opens clean, run **Rustgame → Import Seed Data** from the menu bar.
   This reads the JSON files under `Assets/_Project/Data/Seed/` and creates
   every `ItemDefinition`, `RecipeDefinition` (18 of them), `ResourceNodeDefinition`
   (7), `BuildingTierDefinition` (5), and `ConsumableEffect` asset — plus the
   three database assets that reference them — instead of you hand-creating
   ~70 assets through the Inspector. Re-running it is safe; it updates
   existing assets by id rather than duplicating them.

## What's here vs. what isn't

**Implemented (foundation layer):**
- Core: `GameEvents` (event bus), `ServiceLocator`, `GameManager` (boot sequence)
- Data layer: `ItemDefinition`, `ItemStack`, `ConsumableEffect`, `RecipeDefinition`,
  `ResourceNodeDefinition`, `BuildingTierDefinition`, `SurvivalConfigSO` — plus
  the JSON seed files and the editor importer that turns them into real assets
- Inventory: `InventorySystem` (port of `StorageInventory`, including the
  `maxSlots` fix)
- Crafting: `CraftingSystem` (port of `recipes.js` canCraft/craft/missingFor,
  validate-then-consume-then-grant, all-or-nothing)
- Survival: `SurvivalStats.Tick()` (line-for-line port of `survival.ts`),
  `StaminaSystem`, `DamageSystem`, death/revive matching the verified
  no-item-loss, full-stat-reset, spawn-at-origin behavior
- Player: `PlayerController` (CharacterController, first-person by default —
  verified as the original's actual default, not an assumption)
- Interaction: `IInteractable`, `InteractionController`, `ResourceNode` +
  `ResourceRespawnService` (with the hemp/berry_bush respawn bug **fixed**,
  not ported as-is), `StorageBox`, `Campfire` (instant cook, verified —
  no fuel/cook-time in the original)
- Building: `BuildingInstance`, `BuildingUpgradeRepairSystem` (repair cost
  basis and TC radius corrected per the JS audit)
- Save: `SaveData` (matches the verified v3 JSON shape), `SaveManager`
  (A/B-slot, never-throws port of `save-system.ts`), `AutoSaveTimer`

**Not started yet** (see `../docs/UNITY_PORT_PLAN.md` for the full plan):
- Scenes, prefabs, materials, any art/audio — there is no playable scene yet,
  just scripts and data
- Input System actions asset (PC + touch action maps)
- UI/HUD (UGUI)
- BuildingPlacer/BuildingGhost (placement raycasting + snap-to-grid)
- Mobile touch controls
- Android build settings
- EditMode/PlayMode test suite (the plan's §18 lays out what to port from
  `tests/phase1.test.mjs`)
- Combat/NPCs (Phase 2 in the original PRD too — game.js has a partially-built
  wolf/bear/scientist prototype worth using as a behavior reference, see plan §24.7)

## Known open decisions (yours to make, not assumed)

- Whether to add real pathfinding for enemies later (the original NPC
  prototype just does direct-line movement)
- Camera: this scaffold builds first-person only; third-person was a
  render-time trick in the original, not a real second camera rig — decide
  if/how to add one
