using System.Collections.Generic;
using UnityEngine;
using Rustgame.Inventory;

namespace Rustgame.Crafting
{
    /// <summary>
    /// craftTime/workbenchRequired are metadata only for now — the original
    /// game crafts instantly with no workbench gate (verified in game.js
    /// performCraft/showCraftingDetail). Fields are ready for a Phase 2
    /// queued-crafting / crafting-station feature.
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Recipe Definition", fileName = "Recipe_")]
    public class RecipeDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        public string category;
        public List<ItemStack> ingredients = new();
        public ItemStack result;
        public float craftTimeSeconds;
        public bool workbenchRequired;
        [TextArea] public string description;
    }
}
