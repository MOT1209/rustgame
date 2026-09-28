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
   every `ItemDefinition`, `RecipeDefinition` (18), `ResourceNodeDefinition` (7),
   `BuildingTierDefinition` (5), `ConsumableEffect` (6), `WeatherDefinition` (4)
   and `EnemyDefinition` (3) asset — plus the database assets that reference
   them — instead of you hand-creating ~85 assets through the Inspector.
   Re-running it is safe; it updates existing assets by id rather than
   duplicating them.
5. Then run **Rustgame → Build Bootstrap Scene**. This creates
   `Assets/_Project/Scenes/World.unity` and `Assets/_Project/Prefabs/Player.prefab`
   entirely through Editor APIs (ground plane, light, a Player with camera +
   all core components wired up, a basic HUD Canvas, GameManager) — see
   `SceneBootstrapper.cs`'s doc comment for the two things it genuinely can't
   automate (NavMesh baking, and swapping the EventSystem's input module if
   your project uses the new Input System exclusively).

## What's here vs. what isn't

**Every one of the 15 systems from `docs/UNITY_PORT_PLAN.md` now has a
written C# foundation (53 scripts total).** None of it has been opened,
compiled, or run in a real Unity Editor yet — see the warning above.

- Core: `GameEvents` (event bus), `ServiceLocator`, `GameManager` (boot sequence)
- Data layer: `ItemDefinition`, `ItemStack`, `ConsumableEffect`, `RecipeDefinition`,
  `ResourceNodeDefinition`, `BuildingTierDefinition`, `SurvivalConfigSO`,
  `WeatherDefinition`, `EnemyDefinition` — plus JSON seed files and the
  editor importer that turns them into real assets
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
- World / Time-Weather: `TimeSystem` (800s day, verified phase boundaries),
  `WeatherSystem` (port of `weather.js`'s weighted random pick)
- Input: `Settings/RustgameControls.inputactions` (Desktop + Touch action
  maps), `PlayerInputReader`, `TouchInputAdapter`
- UI/HUD: `HUDController`, `InventoryPanelController` + `InventorySlotView`,
  `CraftingPanelController`, `BuildMenuController`, `InteractionPromptView`,
  `SaveNotificationView` — logic/presenters only; the actual Canvas is built
  by `SceneBootstrapper.cs`, not hand-authored as a `.prefab`
- Scenes/Prefabs: `SceneBootstrapper.cs` (Editor menu command — see above;
  this is how `.unity`/`.prefab` files get created without needing GUIDs
  this environment couldn't have generated)
- Testing: `Rustgame.Tests.EditMode` assembly with 6 test classes covering
  crafting, inventory, survival stats, building upgrade/repair, save
  corruption recovery, and the gather mechanic — mirrors `tests/phase1.test.mjs`
- Combat/NPCs: `EnemyDefinition`, `EnemyAI` (wolf/bear/scientist stats verified
  from `game.js`'s `NPC` class — **movement is a deliberate improvement**:
  the original moves enemies in a straight line with no obstacle avoidance;
  this uses a real `NavMeshAgent` instead), `LootDropper`

**Still needs manual Editor work, not code:**
- NavMesh baking (Window > AI > Navigation > Bake) once real level geometry exists
- Actual level art/geometry — `SceneBootstrapper` only makes a flat ground plane
- BuildingPlacer/BuildingGhost (placement raycasting + snap-to-grid) — the
  data model (`BuildingTierDefinition`, `BuildingInstance`) is ready, the
  placement *tool* itself isn't built yet
- Android build settings, IL2CPP/ARM64 configuration
- Verifying every EditMode test actually passes once compiled (they're
  written against the same numbers the JS tests use, but have never run)

## Known open decisions (yours to make, not assumed)

- Whether to add real pathfinding for enemies later — **now decided**: yes,
  `EnemyAI` uses `NavMeshAgent`, unlike the original's direct-line movement
- Camera: this scaffold builds first-person only; third-person was a
  render-time trick in the original, not a real second camera rig — decide
  if/how to add one
- `codelock` still has no wired-up lock logic in either codebase (JS or
  Unity) — it's defined as an item/recipe but doesn't gate any door
