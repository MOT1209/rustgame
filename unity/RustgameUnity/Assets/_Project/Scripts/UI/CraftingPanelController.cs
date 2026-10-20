using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Rustgame.Crafting;
using Rustgame.Inventory;

namespace Rustgame.UI
{
    /// <summary>
    /// Lists RecipeDatabase.recipes, shows missing ingredients (via
    /// CraftingSystem.MissingFor) and calls CraftingSystem.Craft on confirm —
    /// same all-or-nothing guarantee as the underlying system, this class adds
    /// no extra validation of its own (single source of truth stays in
    /// CraftingSystem.cs, not duplicated in UI like the original's ITEMS_DATA/
    /// recipes.js split used to be).
    /// </summary>
    public class CraftingPanelController : MonoBehaviour
    {
        [SerializeField] RecipeDatabase recipeDatabase;
        [SerializeField] Transform recipeListContainer;
        [SerializeField] GameObject recipeEntryPrefab;
        [SerializeField] Text selectedRecipeMissingLabel;

        InventorySystem inventory;
        ICraftingInventory craftingAdapter;
        RecipeDefinition selected;
        int qty = 1;

        public void Bind(InventorySystem inv)
        {
            inventory = inv;
            craftingAdapter = new InventorySystemCraftingAdapter(inv);
            Refresh();
        }

        public void Refresh()
        {
            if (recipeListContainer == null || recipeDatabase == null) return;
            for (int i = recipeListContainer.childCount - 1; i >= 0; i--)
                Destroy(recipeListContainer.GetChild(i).gameObject);

            foreach (var recipe in recipeDatabase.recipes)
            {
                var entryGO = recipeEntryPrefab != null ? Instantiate(recipeEntryPrefab, recipeListContainer) : new GameObject(recipe.id);
                if (recipeEntryPrefab == null) entryGO.transform.SetParent(recipeListContainer, false);
                var button = entryGO.GetComponent<Button>();
                if (button != null) button.onClick.AddListener(() => Select(recipe));
            }
        }

        void Select(RecipeDefinition recipe)
        {
            selected = recipe;
            UpdateMissingLabel();
        }

        public void SetQty(int newQty)
        {
            qty = Mathf.Max(1, newQty);
            UpdateMissingLabel();
        }

        void UpdateMissingLabel()
        {
            if (selected == null || craftingAdapter == null || selectedRecipeMissingLabel == null) return;
            var missing = CraftingSystem.MissingFor(selected, craftingAdapter, qty);
            selectedRecipeMissingLabel.text = missing.Count == 0
                ? "Ready to craft"
                : "Missing: " + string.Join(", ", ToStrings(missing));
        }

        static IEnumerable<string> ToStrings(Dictionary<string, int> missing)
        {
            foreach (var kv in missing) yield return $"{kv.Value}x {kv.Key}";
        }

        public bool TryCraftSelected()
        {
            if (selected == null || craftingAdapter == null) return false;
            var result = CraftingSystem.Craft(selected, craftingAdapter, qty);
            if (result.ok) Refresh();
            UpdateMissingLabel();
            return result.ok;
        }
    }
}
