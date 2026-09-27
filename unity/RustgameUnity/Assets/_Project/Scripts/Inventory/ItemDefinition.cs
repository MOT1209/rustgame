using UnityEngine;

namespace Rustgame.Inventory
{
    public enum ItemCategory { Resource, Tool, Weapon, Medical, Survival, Construction, Food, Item }

    /// <summary>
    /// Display-only metadata for one item id. Deliberately does NOT hold crafting
    /// costs — see RecipeDefinition. The original game.js had costs duplicated
    /// here (ITEMS_DATA[id].recipe) and in js/crafting/recipes.js with different,
    /// disagreeing numbers; don't repeat that mistake in Unity.
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Item Definition", fileName = "Item_")]
    public class ItemDefinition : ScriptableObject
    {
        [Tooltip("Stable id matching the original web game exactly (e.g. \"wood\", \"stone_hatchet\", \"cooked_meat\").")]
        public string id;
        public string displayName;
        public ItemCategory category;
        [Min(1)] public int stackLimit = 999;
        public Sprite icon;
        public Color tintColor = Color.white;
        public GameObject worldPrefab;
        [TextArea] public string description;
    }
}
