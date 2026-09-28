using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using Rustgame.Inventory;
using Rustgame.Crafting;
using Rustgame.World;
using Rustgame.Building;
using Rustgame.Combat;

namespace Rustgame.EditorTools
{
    /// <summary>
    /// One-click importer: reads the JSON seed files under
    /// Assets/_Project/Data/Seed/ (numbers verified against the original
    /// game.js / recipes.js / resources.js) and creates/updates the matching
    /// ScriptableObject assets, plus the three database assets that reference
    /// them. Re-running it is safe — existing assets are updated in place by
    /// id, nothing is duplicated.
    ///
    /// Menu: Rustgame > Import Seed Data
    /// </summary>
    public static class DataSeeder
    {
        const string SeedDir = "Assets/_Project/Data/Seed";
        const string ItemsDir = "Assets/_Project/Data/Items";
        const string RecipesDir = "Assets/_Project/Data/Recipes";
        const string WorldDir = "Assets/_Project/Data/World";
        const string BuildingsDir = "Assets/_Project/Data/Buildings";
        const string SurvivalDir = "Assets/_Project/Data/Survival";
        const string CombatDir = "Assets/_Project/Data/Combat";

        [MenuItem("Rustgame/Import Seed Data")]
        public static void ImportAll()
        {
            EnsureFolders();

            var items = ImportItems();
            var consumables = ImportConsumables(items);
            var recipes = ImportRecipes();
            ImportResourceNodes();
            var tiers = ImportBuildingTiers();
            var weatherStates = ImportWeatherStates();
            var enemies = ImportEnemies();

            var itemDb = LoadOrCreate<ItemDatabase>($"{ItemsDir}/ItemDatabase.asset");
            itemDb.items = items;
            itemDb.consumableEffects = consumables;
            EditorUtility.SetDirty(itemDb);

            var recipeDb = LoadOrCreate<RecipeDatabase>($"{RecipesDir}/RecipeDatabase.asset");
            recipeDb.recipes = recipes;
            EditorUtility.SetDirty(recipeDb);

            var tierDb = LoadOrCreate<BuildingTierDatabase>($"{BuildingsDir}/BuildingTierDatabase.asset");
            tierDb.tiers = tiers;
            var tierJson = ReadSeedJson<BuildingTierSeedFile>("building_tiers.json");
            tierDb.toolCupboardRadius = tierJson.toolCupboardRadius;
            EditorUtility.SetDirty(tierDb);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"[DataSeeder] Imported {items.Count} items, {consumables.Count} consumables, " +
                      $"{recipes.Count} recipes, {tiers.Count} building tiers, {weatherStates.Count} weather states, " +
                      $"{enemies.Count} enemy definitions, and every resource node definition.");
        }

        static void EnsureFolders()
        {
            foreach (var dir in new[] { ItemsDir, RecipesDir, WorldDir, BuildingsDir, SurvivalDir, CombatDir })
                if (!AssetDatabase.IsValidFolder(dir))
                    Directory.CreateDirectory(dir);
            AssetDatabase.Refresh();
        }

        static List<ItemDefinition> ImportItems()
        {
            var seed = ReadSeedJson<ItemSeedFile>("items.json");
            var result = new List<ItemDefinition>();
            foreach (var e in seed.items)
            {
                var asset = LoadOrCreate<ItemDefinition>($"{ItemsDir}/Item_{e.id}.asset");
                asset.id = e.id;
                asset.displayName = e.displayName;
                asset.category = Enum.TryParse<ItemCategory>(e.category, out var cat) ? cat : ItemCategory.Item;
                asset.stackLimit = e.stackLimit;
                asset.description = e.description;
                EditorUtility.SetDirty(asset);
                result.Add(asset);
            }
            return result;
        }

        static List<ConsumableEffect> ImportConsumables(List<ItemDefinition> items)
        {
            var seed = ReadSeedJson<ConsumableSeedFile>("consumables.json");
            var result = new List<ConsumableEffect>();
            foreach (var e in seed.consumables)
            {
                var asset = LoadOrCreate<ConsumableEffect>($"{ItemsDir}/Consumable_{e.itemId}.asset");
                asset.item = items.Find(i => i.id == e.itemId);
                asset.hungerRestore = e.hungerRestore;
                asset.thirstRestore = e.thirstRestore;
                asset.healthRestore = e.healthRestore;
                asset.spoilTimeSeconds = e.spoilTimeSeconds;
                asset.stopsBleeding = e.stopsBleeding;
                EditorUtility.SetDirty(asset);
                result.Add(asset);
            }
            return result;
        }

        static List<RecipeDefinition> ImportRecipes()
        {
            var seed = ReadSeedJson<RecipeSeedFile>("recipes.json");
            var result = new List<RecipeDefinition>();
            foreach (var e in seed.recipes)
            {
                var asset = LoadOrCreate<RecipeDefinition>($"{RecipesDir}/Recipe_{e.id}.asset");
                asset.id = e.id;
                asset.displayName = e.displayName;
                asset.category = e.category;
                asset.craftTimeSeconds = e.craftTime;
                asset.workbenchRequired = e.workbenchRequired;
                asset.description = e.description;
                asset.ingredients = new List<ItemStack>();
                foreach (var ing in e.ingredients)
                    asset.ingredients.Add(new ItemStack(ing.itemId, ing.count));
                asset.result = new ItemStack(e.result.itemId, e.result.count);
                EditorUtility.SetDirty(asset);
                result.Add(asset);
            }
            return result;
        }

        static void ImportResourceNodes()
        {
            var seed = ReadSeedJson<ResourceNodeSeedFile>("resource_nodes.json");
            foreach (var e in seed.nodes)
            {
                var asset = LoadOrCreate<ResourceNodeDefinition>($"{WorldDir}/Node_{e.nodeType}.asset");
                asset.nodeType = e.nodeType;
                asset.resourceItemId = e.resourceItemId;
                asset.nodeHealth = e.nodeHealth;
                asset.yieldPerHit = e.yieldPerHit;
                asset.respawnTimeSeconds = e.respawnTimeSeconds;
                asset.requiredTool = Enum.TryParse<ToolType>(e.requiredTool, out var t) ? t : ToolType.None;
                asset.correctToolMultiplier = 2f;
                asset.bonusResourceId = e.bonusResourceId;
                asset.bonusYield = e.bonusYield;
                EditorUtility.SetDirty(asset);
            }
        }

        static List<BuildingTierDefinition> ImportBuildingTiers()
        {
            var seed = ReadSeedJson<BuildingTierSeedFile>("building_tiers.json");
            var result = new List<BuildingTierDefinition>();
            foreach (var e in seed.tiers)
            {
                var asset = LoadOrCreate<BuildingTierDefinition>($"{BuildingsDir}/BuildingTier_{e.tier}.asset");
                asset.tier = Enum.Parse<BuildingTier>(e.tier);
                asset.maxHealth = e.maxHealth;
                asset.color = ParseHexColor(e.colorHex);
                asset.repairCostFraction = 0.10f;
                asset.upgradeCost = new List<ItemStack>();
                foreach (var cost in e.upgradeCost)
                    asset.upgradeCost.Add(new ItemStack(cost.itemId, cost.count));
                EditorUtility.SetDirty(asset);
                result.Add(asset);
            }
            return result;
        }

        static List<WeatherDefinition> ImportWeatherStates()
        {
            var seed = ReadSeedJson<WeatherSeedFile>("weather_states.json");
            var result = new List<WeatherDefinition>();
            foreach (var e in seed.states)
            {
                var asset = LoadOrCreate<WeatherDefinition>($"{WorldDir}/Weather_{e.id}.asset");
                asset.id = e.id;
                asset.displayName = e.displayName;
                asset.tempMod = e.tempMod;
                asset.lightMod = e.lightMod;
                asset.fogMod = e.fogMod;
                asset.weight = e.weight;
                EditorUtility.SetDirty(asset);
                result.Add(asset);
            }
            return result;
        }

        static List<EnemyDefinition> ImportEnemies()
        {
            var seed = ReadSeedJson<EnemySeedFile>("enemies.json");
            var result = new List<EnemyDefinition>();
            foreach (var e in seed.enemies)
            {
                var asset = LoadOrCreate<EnemyDefinition>($"{CombatDir}/Enemy_{e.enemyType}.asset");
                asset.enemyType = e.enemyType;
                asset.maxHealth = e.maxHealth;
                asset.damage = e.damage;
                asset.agroRange = e.agroRange;
                asset.attackRange = e.attackRange;
                asset.attackCooldownSeconds = e.attackCooldownSeconds;
                asset.moveSpeed = e.moveSpeed;
                asset.bleedChance = e.bleedChance;
                asset.lootTable = new List<ItemStack>();
                foreach (var loot in e.lootTable)
                    asset.lootTable.Add(new ItemStack(loot.itemId, loot.count));
                EditorUtility.SetDirty(asset);
                result.Add(asset);
            }
            return result;
        }

        static Color ParseHexColor(string hex)
        {
            return ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.white;
        }

        static T ReadSeedJson<T>(string fileName)
        {
            var path = $"{SeedDir}/{fileName}";
            if (!File.Exists(path)) throw new FileNotFoundException($"Seed file not found: {path}");
            return JsonUtility.FromJson<T>(File.ReadAllText(path));
        }

        static T LoadOrCreate<T>(string path) where T : ScriptableObject
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset != null) return asset;
            asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }

        // ---- JSON DTOs (mirror the seed file shapes exactly; JsonUtility needs
        // concrete fields, no dictionaries) ----

        [Serializable] class ItemSeedEntry { public string id, displayName, category, description; public int stackLimit; }
        [Serializable] class ItemSeedFile { public List<ItemSeedEntry> items; }

        [Serializable] class ConsumableSeedEntry { public string itemId; public float hungerRestore, thirstRestore, healthRestore, spoilTimeSeconds; public bool stopsBleeding; }
        [Serializable] class ConsumableSeedFile { public List<ConsumableSeedEntry> consumables; }

        [Serializable] class IngredientEntry { public string itemId; public int count; }
        [Serializable] class RecipeSeedEntry { public string id, displayName, category, description; public float craftTime; public bool workbenchRequired; public List<IngredientEntry> ingredients; public IngredientEntry result; }
        [Serializable] class RecipeSeedFile { public List<RecipeSeedEntry> recipes; }

        [Serializable] class ResourceNodeSeedEntry { public string nodeType, resourceItemId, requiredTool, bonusResourceId; public int nodeHealth, yieldPerHit, bonusYield; public float respawnTimeSeconds; }
        [Serializable] class ResourceNodeSeedFile { public List<ResourceNodeSeedEntry> nodes; }

        [Serializable] class BuildingTierSeedEntry { public string tier, colorHex; public int maxHealth; public List<IngredientEntry> upgradeCost; }
        [Serializable] class BuildingTierSeedFile { public int toolCupboardRadius; public List<BuildingTierSeedEntry> tiers; }

        [Serializable] class WeatherSeedEntry { public string id, displayName; public float tempMod, lightMod, fogMod; public int weight; }
        [Serializable] class WeatherSeedFile { public List<WeatherSeedEntry> states; public float minDuration, maxDuration; }

        [Serializable] class EnemySeedEntry { public string enemyType; public float maxHealth, damage, agroRange, attackRange, attackCooldownSeconds, moveSpeed, bleedChance; public List<IngredientEntry> lootTable; }
        [Serializable] class EnemySeedFile { public List<EnemySeedEntry> enemies; }
    }
}
