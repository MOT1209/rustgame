using UnityEngine;

namespace Rustgame.Inventory
{
    /// <summary>
    /// Effect data for food/medical items. Numbers copied verbatim from
    /// js/inventory/items.js FOOD_DEFS (verified against the live game) —
    /// this is the official balance, not a placeholder.
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Consumable Effect", fileName = "Consumable_")]
    public class ConsumableEffect : ScriptableObject
    {
        public ItemDefinition item;
        public float hungerRestore;
        public float thirstRestore;
        [Tooltip("Negative for risky items — raw_meat is -5 in the original game.")]
        public float healthRestore;
        [Tooltip("0 = never spoils (Phase 1 default for every item). Field exists ready for a Phase 2 food-spoilage system, matching spoilTime in items.js.")]
        public float spoilTimeSeconds;
        public bool stopsBleeding;
    }
}
