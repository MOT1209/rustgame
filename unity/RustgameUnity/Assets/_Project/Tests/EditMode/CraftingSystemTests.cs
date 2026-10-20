using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using Rustgame.Crafting;
using Rustgame.Inventory;

namespace Rustgame.Tests
{
    /// <summary>
    /// Port of the crafting invariants from js/crafting/recipes.js and
    /// tests/phase1.test.mjs: validate-then-consume-then-grant, all-or-nothing,
    /// and — the fix the Unity port adds — a craft must not eat the ingredients
    /// when the result has nowhere to go.
    /// </summary>
    public class CraftingSystemTests
    {
        class FakeInventory : ICraftingInventory
        {
            readonly Dictionary<string, int> items = new Dictionary<string, int>();
            readonly int stackLimit;

            public FakeInventory(int stackLimit = 1000)
            {
                this.stackLimit = stackLimit;
            }

            public bool Has(string itemId, int amount) { return Count(itemId) >= amount; }
            public int Count(string itemId) { return items.TryGetValue(itemId, out var n) ? n : 0; }

            public bool Consume(string itemId, int amount)
            {
                if (!Has(itemId, amount)) return false;
                items[itemId] = Count(itemId) - amount;
                return true;
            }

            public int Add(string itemId, int amount)
            {
                if (amount <= 0) return 0;
                var room = stackLimit - Count(itemId);
                var actual = room < amount ? room : amount;
                if (actual <= 0) return 0;
                items[itemId] = Count(itemId) + actual;
                return actual;
            }

            public bool CanAccept(string itemId, int amount)
            {
                return amount > 0 && Count(itemId) + amount <= stackLimit;
            }
        }

        static RecipeDefinition MakeRecipe(string resultId, int resultCount, params object[] ingredientPairs)
        {
            var recipe = ScriptableObject.CreateInstance<RecipeDefinition>();
            recipe.id = "test_recipe";
            recipe.displayName = "Test Recipe";
            recipe.ingredients = new List<ItemStack>();
            for (int i = 0; i < ingredientPairs.Length; i += 2)
                recipe.ingredients.Add(new ItemStack((string)ingredientPairs[i], (int)ingredientPairs[i + 1]));
            recipe.result = new ItemStack(resultId, resultCount);
            return recipe;
        }

        [Test]
        public void MissingFor_ReportsWhatIsShort()
        {
            var recipe = MakeRecipe("axe", 1, "wood", 10, "stone", 5);
            var inv = new FakeInventory();
            inv.Add("wood", 4);

            var missing = CraftingSystem.MissingFor(recipe, inv);

            Assert.AreEqual(2, missing.Count);
            Assert.AreEqual(6, missing["wood"]);
            Assert.AreEqual(5, missing["stone"]);
        }

        [Test]
        public void CanCraft_RequiresEveryIngredient()
        {
            var recipe = MakeRecipe("axe", 1, "wood", 10);
            var inv = new FakeInventory();

            Assert.IsFalse(CraftingSystem.CanCraft(recipe, inv));

            inv.Add("wood", 10);
            Assert.IsTrue(CraftingSystem.CanCraft(recipe, inv));
        }

        [Test]
        public void Craft_ConsumesIngredients_AndGrantsResult()
        {
            var recipe = MakeRecipe("axe", 1, "wood", 10, "stone", 5);
            var inv = new FakeInventory();
            inv.Add("wood", 10);
            inv.Add("stone", 5);

            var result = CraftingSystem.Craft(recipe, inv);

            Assert.IsTrue(result.ok);
            Assert.AreEqual(1, result.crafted);
            Assert.AreEqual(1, result.granted);
            Assert.AreEqual(0, inv.Count("wood"));
            Assert.AreEqual(0, inv.Count("stone"));
            Assert.AreEqual(1, inv.Count("axe"));
        }

        [Test]
        public void Craft_FailsWithoutConsumingAnything()
        {
            var recipe = MakeRecipe("axe", 1, "wood", 10);
            var inv = new FakeInventory();
            inv.Add("wood", 3);

            var result = CraftingSystem.Craft(recipe, inv);

            Assert.IsFalse(result.ok);
            Assert.AreEqual(0, result.crafted);
            Assert.AreEqual(3, inv.Count("wood")); // nothing consumed
            Assert.AreEqual(0, inv.Count("axe"));
        }

        [Test]
        public void Craft_DoesNotEatIngredientsWhenTheResultHasNoRoom()
        {
            // The JS version ignores inv.add()'s return value, so a full stack
            // silently destroyed the materials — the Unity port checks first.
            var recipe = MakeRecipe("axe", 5, "wood", 10);
            var inv = new FakeInventory(stackLimit: 10);
            inv.Add("wood", 10);
            inv.Add("axe", 8); // only 2 free slots in the result stack

            var result = CraftingSystem.Craft(recipe, inv);

            Assert.IsFalse(result.ok);
            Assert.AreEqual(10, inv.Count("wood")); // materials untouched
            Assert.AreEqual(8, inv.Count("axe"));
        }

        [Test]
        public void Craft_ScalesWithQuantity()
        {
            var recipe = MakeRecipe("axe", 1, "wood", 10);
            var inv = new FakeInventory();
            inv.Add("wood", 30);

            var result = CraftingSystem.Craft(recipe, inv, 3);

            Assert.IsTrue(result.ok);
            Assert.AreEqual(3, result.crafted);
            Assert.AreEqual(0, inv.Count("wood"));
            Assert.AreEqual(3, inv.Count("axe"));
        }
    }
}
