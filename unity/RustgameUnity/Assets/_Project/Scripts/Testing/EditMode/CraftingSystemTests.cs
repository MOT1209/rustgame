using System.Collections.Generic;
using NUnit.Framework;
using Rustgame.Crafting;
using Rustgame.Inventory;

namespace Rustgame.Tests.EditMode
{
    /// <summary>Mirrors tests/phase1.test.mjs's crafting suite (success consumes
    /// + grants, failure never goes negative, qty multiplies cost).</summary>
    public class CraftingSystemTests
    {
        static RecipeDefinition MakeStoneAxeRecipe()
        {
            var recipe = UnityEngine.ScriptableObject.CreateInstance<RecipeDefinition>();
            recipe.id = "stone_axe";
            recipe.ingredients = new List<ItemStack> { new("wood", 200), new("stone", 100) };
            recipe.result = new ItemStack("stone_hatchet", 1);
            return recipe;
        }

        static InventorySystem MakeInventory() => new InventorySystem(_ => 999, _ => true);

        [Test]
        public void Craft_Success_ConsumesAndGrants()
        {
            var inv = MakeInventory();
            inv.Add("wood", 200);
            inv.Add("stone", 100);
            var adapter = new InventorySystemCraftingAdapter(inv);

            var result = CraftingSystem.Craft(MakeStoneAxeRecipe(), adapter, 1);

            Assert.IsTrue(result.ok);
            Assert.AreEqual(0, inv.Count("wood"));
            Assert.AreEqual(0, inv.Count("stone"));
            Assert.AreEqual(1, inv.Count("stone_hatchet"));
        }

        [Test]
        public void Craft_Failure_NeverGoesNegative()
        {
            var inv = MakeInventory();
            inv.Add("wood", 10);
            var adapter = new InventorySystemCraftingAdapter(inv);

            var result = CraftingSystem.Craft(MakeStoneAxeRecipe(), adapter, 1);

            Assert.IsFalse(result.ok);
            Assert.Greater(result.missing["wood"], 0);
            Assert.AreEqual(10, inv.Count("wood")); // untouched — validated before consuming
        }

        [Test]
        public void CanCraft_QtyMultipliesCost()
        {
            var inv = MakeInventory();
            inv.Add("wood", 120);
            inv.Add("stone", 100); // enough stone for 1x but not enough wood for 2x at 200 each... use torch-like scaling instead
            var recipe = UnityEngine.ScriptableObject.CreateInstance<RecipeDefinition>();
            recipe.id = "torch";
            recipe.ingredients = new List<ItemStack> { new("wood", 50) };
            recipe.result = new ItemStack("torch", 1);
            var adapter = new InventorySystemCraftingAdapter(inv);

            Assert.IsTrue(CraftingSystem.CanCraft(recipe, adapter, 2));  // needs 100 wood, have 120
            Assert.IsFalse(CraftingSystem.CanCraft(recipe, adapter, 3)); // needs 150 wood, have 120
        }
    }
}
