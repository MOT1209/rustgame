using System.Collections.Generic;
using UnityEngine;
using Rustgame.Crafting;

namespace Rustgame.Building
{
    /// <summary>
    /// Port of upgradeStructure()/repairStructure() from game.js, verified
    /// including the two corrections found during the JS audit:
    ///   1. Repair costs 10% of the CURRENT tier's own upgradeCost (not the
    ///      next tier's).
    ///   2. Twig repairs for free (its upgradeCost is empty), matching the
    ///      original's `if (tier !== 'twig')` skip.
    /// </summary>
    public static class BuildingUpgradeRepairSystem
    {
        static readonly BuildingTier[] TierOrder =
        {
            BuildingTier.Twig, BuildingTier.Wood, BuildingTier.Stone, BuildingTier.SheetMetal, BuildingTier.Armored,
        };

        public static bool CanUpgrade(BuildingInstance building, IReadOnlyDictionary<BuildingTier, BuildingTierDefinition> tiers, ICraftingInventory inv)
        {
            var nextTier = GetNextTier(building.CurrentTier.tier);
            if (nextTier == null) return false;
            var nextDef = tiers[nextTier.Value];
            foreach (var cost in nextDef.upgradeCost)
                if (!inv.Has(cost.itemId, cost.count)) return false;
            return true;
        }

        public static bool TryUpgrade(BuildingInstance building, IReadOnlyDictionary<BuildingTier, BuildingTierDefinition> tiers, ICraftingInventory inv)
        {
            var nextTier = GetNextTier(building.CurrentTier.tier);
            if (nextTier == null) return false;
            var nextDef = tiers[nextTier.Value];

            foreach (var cost in nextDef.upgradeCost)
                if (!inv.Has(cost.itemId, cost.count)) return false;
            foreach (var cost in nextDef.upgradeCost)
                inv.Consume(cost.itemId, cost.count);

            building.SetTier(nextDef);
            return true;
        }

        public static bool TryRepair(BuildingInstance building, ICraftingInventory inv)
        {
            if (building.Health >= building.MaxHealth) return false;

            var tierDef = building.CurrentTier;
            var repairAmount = building.MaxHealth * tierDef.repairCostFraction;

            if (tierDef.tier != BuildingTier.Twig)
            {
                var needed = new List<(string id, int amount)>();
                foreach (var cost in tierDef.upgradeCost)
                {
                    var amt = Mathf.CeilToInt(cost.count * tierDef.repairCostFraction);
                    needed.Add((cost.itemId, amt));
                    if (!inv.Has(cost.itemId, amt)) return false;
                }
                foreach (var (id, amount) in needed) inv.Consume(id, amount);
            }

            building.Repair(repairAmount);
            return true;
        }

        static BuildingTier? GetNextTier(BuildingTier current)
        {
            var idx = System.Array.IndexOf(TierOrder, current);
            return idx >= 0 && idx < TierOrder.Length - 1 ? TierOrder[idx + 1] : null;
        }
    }
}
