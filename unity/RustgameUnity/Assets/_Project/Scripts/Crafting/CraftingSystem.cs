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

        /// <summary>True when the amount would fit. Checked BEFORE the
        /// ingredients are consumed so a full stack never eats the materials.</summary>
        bool CanAccept(string itemId, int amount);
    }

    /// <summary>Adapter over the real InventorySystem for production use.</summary>
    public class InventorySystemCraftingAdapter : ICraftingInventory
    {
        readonly InventorySystem inv;
        public InventorySystemCraftingAdapter(InventorySystem inv) { this.inv = inv; }
        public bool Has(string itemId, int amount) { return inv.Has(itemId, amount); }
        public int Count(string itemId) { return inv.Count(itemId); }
        public bool Consume(string itemId, int amount) { return inv.Consume(itemId, amount); }
        public int Add(string itemId, int amount) { return inv.Add(itemId, amount); }
        public bool CanAccept(string itemId, int amount) { return inv.CanAccept(itemId, amount); }
    }

    public struct CraftResult
    {
        public bool ok;
        public int crafted;
        public int granted;
        public Dictionary<string, int> missing;
        public string error;

        public static CraftResult Success(int qty, int granted)
        {
            return new CraftResult
            {
                ok = true,
                crafted = qty,
                granted = granted,
                missing = new Dictionary<string, int>(),
            };
        }

        public static CraftResult Fail(Dictionary<string, int> missing, string error = null)
        {
            return new CraftResult
            {
                ok = false,
                crafted = 0,
                granted = 0,
                missing = missing ?? new Dictionary<string, int>(),
                error = error,
            };
        }
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
        {
            return MissingFor(recipe, inv, qty).Count == 0;
        }

        public static CraftResult Craft(RecipeDefinition recipe, ICraftingInventory inv, int qty = 1)
        {
            if (recipe == null || inv == null) return CraftResult.Fail(null, "no recipe");

            var missing = MissingFor(recipe, inv, qty);
            if (missing.Count > 0) return CraftResult.Fail(missing, "missing ingredients");

            qty = Mathf.Max(1, qty);

            // The result has to fit BEFORE the ingredients are consumed —
            // otherwise a full stack silently eats the materials.
            var wanted = recipe.result.count * qty;
            if (!inv.CanAccept(recipe.result.itemId, wanted))
                return CraftResult.Fail(null, "no room for " + recipe.result.itemId);

            foreach (var ing in recipe.ingredients)
            {
                if (!inv.Consume(ing.itemId, ing.count * qty))
                {
                    // Should never happen after validation above; abort without granting.
                    return CraftResult.Fail(new Dictionary<string, int> { { ing.itemId, ing.count * qty } }, "consume failed");
                }
            }

            var granted = inv.Add(recipe.result.itemId, wanted);
            return CraftResult.Success(qty, granted);
        }
    }
}
