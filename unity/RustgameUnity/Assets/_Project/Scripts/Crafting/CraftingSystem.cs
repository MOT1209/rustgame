using System.Collections.Generic;
using UnityEngine;
using Rustgame.Inventory;

namespace Rustgame.Crafting
{
    /// <summary>Minimal surface CraftingSystem needs from an inventory — lets this
    /// whole file be unit-tested against a fake, no MonoBehaviour required.</summary>
    public interface ICraftingInventory
    {
        bool Has(string itemId, int amount);
        int Count(string itemId);
        bool Consume(string itemId, int amount);
        int Add(string itemId, int amount);
    }

    /// <summary>Adapter over the real InventorySystem for production use.</summary>
    public class InventorySystemCraftingAdapter : ICraftingInventory
    {
        readonly InventorySystem inv;
        public InventorySystemCraftingAdapter(InventorySystem inv) => this.inv = inv;
        public bool Has(string itemId, int amount) => inv.Has(itemId, amount);
        public int Count(string itemId) => inv.Count(itemId);
        public bool Consume(string itemId, int amount) => inv.Consume(itemId, amount);
        public int Add(string itemId, int amount) => inv.Add(itemId, amount);
    }

    public struct CraftResult
    {
        public bool ok;
        public int crafted;
        public Dictionary<string, int> missing;

        public static CraftResult Success(int qty) => new CraftResult { ok = true, crafted = qty, missing = new Dictionary<string, int>() };
        public static CraftResult Fail(Dictionary<string, int> missing) => new CraftResult { ok = false, crafted = 0, missing = missing };
    }

    /// <summary>
    /// Pure port of js/crafting/recipes.js (canCraft/craft/missingFor) — validate
    /// fully BEFORE consuming anything, then consume, then grant. All-or-nothing:
    /// inventory can never go negative and a craft never partially consumes.
    /// </summary>
    public static class CraftingSystem
    {
        public static Dictionary<string, int> MissingFor(RecipeDefinition recipe, ICraftingInventory inv, int qty = 1)
        {
            var missing = new Dictionary<string, int>();
            if (recipe == null || inv == null) return missing;
            qty = Mathf.Max(1, qty);
            foreach (var ing in recipe.ingredients)
            {
                var need = ing.count * qty;
                var have = inv.Has(ing.itemId, need) ? need : inv.Count(ing.itemId);
                if (have < need) missing[ing.itemId] = need - have;
            }
            return missing;
        }

        public static bool CanCraft(RecipeDefinition recipe, ICraftingInventory inv, int qty = 1)
            => MissingFor(recipe, inv, qty).Count == 0;

        public static CraftResult Craft(RecipeDefinition recipe, ICraftingInventory inv, int qty = 1)
        {
            var missing = MissingFor(recipe, inv, qty);
            if (missing.Count > 0) return CraftResult.Fail(missing);

            qty = Mathf.Max(1, qty);
            foreach (var ing in recipe.ingredients)
            {
                if (!inv.Consume(ing.itemId, ing.count * qty))
                {
                    // Should never happen after validation above; abort without granting.
                    return CraftResult.Fail(new Dictionary<string, int> { [ing.itemId] = ing.count * qty });
                }
            }
            inv.Add(recipe.result.itemId, recipe.result.count * qty);
            return CraftResult.Success(qty);
        }
    }
}
