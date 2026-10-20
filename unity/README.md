# RUSTGAME — Unity port (foundation layer)

This is the start of a from-scratch Unity reimplementation of the game in
`../js/`. It is **not** a Three.js-to-Unity conversion — it's a clean C#
rebuild of the same gameplay logic, using the *verified, live* numbers from
the JS codebase (not the design doc's original guesses — see
`../docs/UNITY_PORT_PLAN.md` §24 for the full audit that found and fixed
several mismatches between what the docs assumed and what `game.js` actually
does).

## ⚠️ Editor version — read this first

The project was originally authored for **Unity 6000.0.35f1**, but that editor
could not be installed on this machine (the Unity installer aborts during its
validation phase, leaving a broken `6000.5.4f1` behind). The **only complete
editor available here is 2019.4.41f2**, so the project now targets that and
**has been verified to compile, seed its data and build its scene with it**.

The source is deliberately kept inside the **C# 7.3 subset** (no target-typed
`new()`, no switch expressions), so the same code compiles on 2019.4 *and* on
Unity 6 — retargeting is a manifest change, not a code change:

| Package | 2019.4 (current) | Unity 6 (target) |
|---|---|---|
| com.unity.render-pipelines.universal | 7.3.1 | 17.0.3 |
| com.unity.textmeshpro | 2.1.6 | 3.0.9 |
| com.unity.inputsystem | 1.4.4 | 1.11.2 |
| com.unity.test-framework | 1.1.33 | 1.4.5 |
| com.unity.ugui | 1.0.0 | 2.0.0 |
| com.unity.cinemachine | 2.6.4 | 3.1.2 |

## Opening the project

1. Open **2019.4.41f2** (or newer — the code is version-agnostic, but the
   package pins above match 2019.4).
2. Unity Hub → **Add** → point it at `unity/RustgameUnity/`.
3. First open will be slow — Unity generates `Library/` from scratch and
   re-imports every script, which is also when any compile errors surface.
4. Run **Rustgame → Build Bootstrap Scene** from the menu bar. It
   (a) imports the seed JSON into real assets and (b) generates
   `Assets/_Project/Scenes/Main.unity` with the player rig, GameManager, the
   respawn service and two gatherable nodes.
   The same thing headless:
   ```
   Unity.exe -batchmode -nographics -quit -projectPath <project> \
             -executeMethod Rustgame.EditorTools.SceneBuilder.Build
   ```

### Verified state (2026-10-20)

* `Rustgame.Runtime.dll`, `Rustgame.Editor.dll`, `Rustgame.Tests.EditMode.dll`
  all compile with **zero errors**.
* `DataSeeder` imports 37 items, 6 consumables, 18 recipes, 5 building tiers
  and 7 resource-node definitions.
* `SceneBuilder` writes `Assets/_Project/Scenes/Main.unity`.
* EditMode tests live in `Assets/_Project/Tests/EditMode/` and run with:
  ```
  Unity.exe -batchmode -nographics -runTests -projectPath <project> \
            -testPlatform EditMode -testResults <out.xml>
  ```

## Opening the project (legacy notes)

The rest of this file describes the original scaffold as it was written in a
sandbox with no Unity Editor available. Everything below has now been run in a
real editor — see "Verified state" above.

## What's here vs. what isn't

**Implemented (foundation layer):**
- Core: `GameEvents` (event bus), `ServiceLocator`, `GameManager` (boot
  sequence + the player's inventory, so every system writes to one place)
- Data layer: `ItemDefinition`, `ItemStack`, `ConsumableEffect`, `RecipeDefinition`,
  `ResourceNodeDefinition`, `BuildingTierDefinition`, `SurvivalConfigSO` — plus the
  JSON seed files and the editor importer that turns them into real assets
- Inventory: `InventorySystem` (port of `StorageInventory`, including the
  `maxSlots` fix)
- Crafting: `CraftingSystem` (port of `recipes.js` canCraft/craft/missingFor,
  validate-then-consume-then-grant, all-or-nothing, and the result is checked
  for room *before* the ingredients are eaten)
- Survival: `SurvivalStats.Tick()` (line-for-line port of `survival.ts`),
  `StaminaSystem`, `DamageSystem`, death/revive matching the verified
  no-item-loss, full-stat-reset, spawn-at-origin behavior
- Player: `PlayerController` (CharacterController, first-person by default —
  verified as the original's actual default, not an assumption) and `PlayerRig`
  (bootstrap input: WASD/Shift/Space, LMB gathers, E interacts, Esc frees the
  cursor)
- Interaction: `IInteractable`, `InteractionController`, `ResourceNode` +
  `ResourceRespawnService` (with the hemp/berry_bush respawn bug **fixed**,
  not ported as-is), `StorageBox`, `Campfire` (instant cook, verified —
  no fuel/cook-time in the original)
- Building: `BuildingInstance`, `BuildingUpgradeRepairSystem` (repair cost
  basis and TC radius corrected per the JS audit)
- Save: `SaveData` (matches the verified v3 JSON shape), `SaveManager`
  (A/B-slot, never-throws port of `save-system.ts`), `AutoSaveTimer` — the
  autosave now writes the **live** player state (position, stats, inventory,
  pending respawns), not the snapshot loaded at boot
- Assemblies: `Rustgame.Runtime`, `Rustgame.Editor`, `Rustgame.Tests.EditMode`
  (asmdef) — the pure logic is MonoBehaviour-free and unit-tested


**Not started yet** (see `../docs/UNITY_PORT_PLAN.md` for the full plan):
- Prefabs, materials, any art/audio — the bootstrap scene uses Unity primitives
  as placeholders
- Input System actions asset (PC + touch action maps) — the bootstrap rig uses
  the legacy Input API on purpose
- UI/HUD (UGUI) — the bootstrap rig draws a debug HUD with OnGUI
- Inventory panel / crafting panel / belt (the data layer exists, the UI does not)
- BuildingPlacer/BuildingGhost (placement raycasting + snap-to-grid)
- Mobile touch controls
- Android build settings
- Combat/NPCs (Phase 2 in the original PRD too — game.js has a partially-built
  wolf/bear/scientist prototype worth using as a behavior reference, see plan §24.7)

## Known open decisions (yours to make, not assumed)

- Whether to add real pathfinding for enemies later (the original NPC
  prototype just does direct-line movement)
- Camera: this scaffold builds first-person only; third-person was a
  render-time trick in the original, not a real second camera rig — decide
  if/how to add one
