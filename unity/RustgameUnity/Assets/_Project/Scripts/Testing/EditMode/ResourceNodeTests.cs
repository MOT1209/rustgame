using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using Rustgame.Interaction;
using Rustgame.World;

namespace Rustgame.Tests.EditMode
{
    /// <summary>Verifies the verified game.js gather mechanic: every hit reduces
    /// node health by exactly 1 regardless of tool; the correct tool doubles
    /// yield per hit instead of reducing hit count.</summary>
    public class ResourceNodeTests
    {
        static ResourceNode MakeTreeNode()
        {
            var def = ScriptableObject.CreateInstance<ResourceNodeDefinition>();
            def.nodeType = "tree";
            def.resourceItemId = "wood";
            def.nodeHealth = 5;
            def.yieldPerHit = 12;
            def.respawnTimeSeconds = 120;
            def.requiredTool = ToolType.Axe;
            def.correctToolMultiplier = 2f;

            var go = new GameObject("TestTree", typeof(BoxCollider));
            var node = go.AddComponent<ResourceNode>();
            node.Configure(def);
            return node;
        }

        [Test]
        public void WrongTool_YieldsBaseAmount_TakesFiveHitsToDeplete()
        {
            var node = MakeTreeNode();
            var harvested = new List<int>();
            node.OnHarvested += (_, id, amount) => { if (id == "wood") harvested.Add(amount); };
            var depletedCount = 0;
            node.OnDepleted += _ => depletedCount++;

            var ctx = new InteractionContext { equippedToolId = "stone_pickaxe" }; // wrong tool for a tree
            for (int i = 0; i < 5; i++) Assert.IsTrue(node.Interact(ctx));

            Assert.AreEqual(5, harvested.Count);
            Assert.IsTrue(harvested.TrueForAll(a => a == 12));
            Assert.AreEqual(1, depletedCount);
            Assert.IsFalse(node.Interact(ctx)); // depleted — no more hits accepted
            Object.DestroyImmediate(node.gameObject);
        }

        [Test]
        public void CorrectTool_DoublesYield_StillFiveHitsToDeplete()
        {
            var node = MakeTreeNode();
            var harvested = new List<int>();
            node.OnHarvested += (_, id, amount) => { if (id == "wood") harvested.Add(amount); };

            var ctx = new InteractionContext { equippedToolId = "stone_hatchet" }; // correct tool
            for (int i = 0; i < 5; i++) node.Interact(ctx);

            Assert.AreEqual(5, harvested.Count); // hit count unchanged by tool
            Assert.IsTrue(harvested.TrueForAll(a => a == 24)); // yield doubled, not hit count reduced
            Object.DestroyImmediate(node.gameObject);
        }
    }
}
