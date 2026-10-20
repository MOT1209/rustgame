using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using Rustgame.Building;
using Rustgame.Crafting;
using Rustgame.Inventory;

namespace Rustgame.Tests
{
    /// <summary>
    /// Port of the building upgrade/repair rules the JS audit corrected:
    /// upgrade costs are the cost of REACHING the next tier, and repair is
    /// charged against the CURRENT tier's own cost (10%), with twig repairs
    /// being free.
    /// </summary>
    public class BuildingUpgradeRepairSystemTests
    {
        class FakeInventory : ICraftingInventory
        {
            readonly Dictionary<string, int> items = new Dictionary<string, int>();

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
                items[itemId] = Count(itemId) + amount;
                return amount;
            }

            public bool CanAccept(string itemId, int amount) { return true; }
        }

        static BuildingTierDefinition MakeTier(BuildingTier tier, int maxHealth, float repairFraction, params object[] costPairs)
        {
            var def = ScriptableObject.CreateInstance<BuildingTierDefinition>();
            def.tier = tier;
            def.maxHealth = maxHealth;
            def.repairCostFraction = repairFraction;
            def.upgradeCost = new List<ItemStack>();
            for (int i = 0; i < costPairs.Length; i += 2)
                def.upgradeCost.Add(new ItemStack((string)costPairs[i], (int)costPairs[i + 1]));
            return def;
        }

        static IReadOnlyDictionary<BuildingTier, BuildingTierDefinition> MakeTiers()
        {
            return new Dictionary<BuildingTier, BuildingTierDefinition>
            {
                { BuildingTier.Twig, MakeTier(BuildingTier.Twig, 10, 0.10f) },
                { BuildingTier.Wood, MakeTier(BuildingTier.Wood, 250, 0.10f, "wood", 300) },
                { BuildingTier.Stone, MakeTier(BuildingTier.Stone, 500, 0.10f, "stone", 300) },
            };
        }

        static BuildingInstance MakeBuilding(BuildingTier tier, BuildingTierDefinition def)
        {
            var go = new GameObject("building");
            var building = go.AddComponent<BuildingInstance>();
            building.Initialize(tier == BuildingTier.Twig ? BuildingType.Wall : BuildingType.Wall, def);
            Object.DestroyImmediate(go);
            return building;
        }

        [Test]
        public void CanUpgrade_RequiresTheNextTierCost()
        {
            var tiers = MakeTiers();
            var building = MakeBuilding(BuildingTier.Twig, tiers[BuildingTier.Twig]);
            var inv = new FakeInventory();

            Assert.IsFalse(BuildingUpgradeRepairSystem.CanUpgrade(building, tiers, inv));

            inv.Add("wood", 300);
            Assert.IsTrue(BuildingUpgradeRepairSystem.CanUpgrade(building, tiers, inv));
        }

        [Test]
        public void TryUpgrade_ConsumesCostAndSwapsTier()
        {
            var tiers = MakeTiers();
            var building = MakeBuilding(BuildingTier.Twig, tiers[BuildingTier.Twig]);
            var inv = new FakeInventory();
            inv.Add("wood", 300);

            Assert.IsTrue(BuildingUpgradeRepairSystem.TryUpgrade(building, tiers, inv));
            Assert.AreEqual(0, inv.Count("wood"));
            Assert.AreEqual(BuildingTier.Wood, building.CurrentTier.tier);
            Assert.AreEqual(250f, building.Health);
        }

        [Test]
        public void TryUpgrade_FailsWithoutEnoughMaterial()
        {
            var tiers = MakeTiers();
            var building = MakeBuilding(BuildingTier.Twig, tiers[BuildingTier.Twig]);
            var inv = new FakeInventory();
            inv.Add("wood", 10);

            Assert.IsFalse(BuildingUpgradeRepairSystem.TryUpgrade(building, tiers, inv));
            Assert.AreEqual(10, inv.Count("wood"));
            Assert.AreEqual(BuildingTier.Twig, building.CurrentTier.tier);
        }

        [Test]
        public void TryRepair_ChargesTenPercentOfTheCurrentTierCost()
        {
            var tiers = MakeTiers();
            var building = MakeBuilding(BuildingTier.Wood, tiers[BuildingTier.Wood]);
            building.Damage(100f); // 250 → 150

            var inv = new FakeInventory();
            inv.Add("wood", 30); // 10% of 300

            Assert.IsTrue(BuildingUpgradeRepairSystem.TryRepair(building, inv));
            Assert.AreEqual(0, inv.Count("wood"));
            Assert.AreEqual(175f, building.Health); // 150 + 250 * 0.10
        }

        [Test]
        public void TryRepair_OnTwigIsFree()
        {
            var tiers = MakeTiers();
            var building = MakeBuilding(BuildingTier.Twig, tiers[BuildingTier.Twig]);
            building.Damage(5f); // 10 → 5

            var inv = new FakeInventory();

            Assert.IsTrue(BuildingUpgradeRepairSystem.TryRepair(building, inv));
            Assert.AreEqual(6f, building.Health); // 5 + 10 * 0.10
        }

        [Test]
        public void TryRepair_DoesNothingAtFullHealth()
        {
            var tiers = MakeTiers();
            var building = MakeBuilding(BuildingTier.Wood, tiers[BuildingTier.Wood]);
            var inv = new FakeInventory();

            Assert.IsFalse(BuildingUpgradeRepairSystem.TryRepair(building, inv));
        }
    }
}
