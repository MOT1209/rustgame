using System.Collections.Generic;
using UnityEngine;
using Rustgame.Inventory;

namespace Rustgame.Building
{
    public enum BuildingTier { Twig, Wood, Stone, SheetMetal, Armored }

    /// <summary>
    /// Numbers verified against game.js BUILDING_TIERS. upgradeCost is what it
    /// costs to REACH this tier from the previous one. repairCostFraction
    /// (10%) is charged against THIS tier's own upgradeCost, not the next
    /// tier's — verified in repairStructure(); an earlier draft of the port
    /// plan had this backwards.
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Building Tier Definition", fileName = "BuildingTier_")]
    public class BuildingTierDefinition : ScriptableObject
    {
        public BuildingTier tier;
        public int maxHealth;
        public Color color = Color.white;
        public List<ItemStack> upgradeCost = new();
        [Range(0f, 1f)] public float repairCostFraction = 0.10f;
    }
}
