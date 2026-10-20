using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using Rustgame.Core;
using Rustgame.Inventory;
using Rustgame.Interaction;
using Rustgame.Player;
using Rustgame.World;
using SaveData = Rustgame.Save.SaveData;

namespace Rustgame.Tests
{
    /// <summary>
    /// End-to-end check of the wiring that the EditMode tests cannot prove:
    /// the scene objects actually talk to each other at runtime. Gathering a
    /// node must credit the player's inventory (through the event bus) and the
    /// autosave payload must carry the item — the two links that were dead
    /// before the port was fixed.
    /// </summary>
    public class GatheringPlayModeTests
    {
        GameObject playerGo;
        GameObject managerGo;
        GameObject serviceGo;
        GameObject nodeGo;

        [TearDown]
        public void TearDown()
        {
            DestroyNow(playerGo);
            DestroyNow(managerGo);
            DestroyNow(serviceGo);
            DestroyNow(nodeGo);
            GameEvents.Reset();
        }

        static void DestroyNow(GameObject go)
        {
            if (go != null) Object.DestroyImmediate(go);
        }

        static void SetPrivate(Object target, string field, object value)
        {
            var info = target.GetType().GetField(field, BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(info, "field not found: " + field);
            info.SetValue(target, value);
        }

        [Test]
        public void Gathering_CreditsThePlayerInventory_AndTheSavePayload()
        {
            // ---- config + item database ------------------------------------
            var config = ScriptableObject.CreateInstance<SurvivalConfigSO>();

            var wood = ScriptableObject.CreateInstance<ItemDefinition>();
            wood.id = "wood";
            wood.stackLimit = 1000;

            var itemDb = ScriptableObject.CreateInstance<ItemDatabase>();
            itemDb.items = new List<ItemDefinition> { wood };

            var nodeDef = ScriptableObject.CreateInstance<ResourceNodeDefinition>();
            nodeDef.nodeType = "tree";
            nodeDef.resourceItemId = "wood";
            nodeDef.nodeHealth = 5;
            nodeDef.yieldPerHit = 12;
            nodeDef.respawnTimeSeconds = 120f;
            nodeDef.requiredTool = ToolType.Axe;

            // ---- player (inactive so the config is set before Awake) -------
            playerGo = new GameObject("Player");
            playerGo.SetActive(false);
            var stats = playerGo.AddComponent<SurvivalStats>();
            SetPrivate(stats, "config", config);
            playerGo.SetActive(true);

            // ---- GameManager (owns the player's inventory) -----------------
            managerGo = new GameObject("GameManager");
            var manager = managerGo.AddComponent<GameManager>();
            SetPrivate(manager, "survivalConfig", config);
            SetPrivate(manager, "playerStats", stats);
            SetPrivate(manager, "itemDatabase", itemDb);

            // ---- respawn service (nodes look it up through the locator) ---
            serviceGo = new GameObject("ResourceRespawnService");
            serviceGo.AddComponent<ResourceRespawnService>();

            // ---- the node ---------------------------------------------------
            nodeGo = new GameObject("Tree", typeof(BoxCollider));
            var node = nodeGo.AddComponent<ResourceNode>();
            node.Configure(nodeDef);

            // ---- gather with the CORRECT tool -------------------------------
            var ctx = new InteractionContext { player = playerGo, equippedToolId = "stone_hatchet" };
            Assert.IsTrue(node.Interact(ctx), "the gather hit must be accepted");

            // 12 base yield doubled by the correct tool
            Assert.AreEqual(24, manager.PlayerInventory.Count("wood"),
                "gathering must credit the player's inventory through the event bus");

            // ---- the save payload must carry it ---------------------------
            var payload = InvokeCollectSaveData(manager);
            Assert.IsNotNull(payload);
            int saved = 0;
            foreach (var entry in payload.inventory)
                if (entry.id == "wood") saved = entry.count;
            Assert.AreEqual(24, saved, "the autosave payload must contain the gathered wood");
        }

        [Test]
        public void Gathering_WithTheWrongTool_YieldsTheBaseAmount()
        {
            var config = ScriptableObject.CreateInstance<SurvivalConfigSO>();
            var nodeDef = ScriptableObject.CreateInstance<ResourceNodeDefinition>();
            nodeDef.nodeType = "tree";
            nodeDef.resourceItemId = "wood";
            nodeDef.nodeHealth = 5;
            nodeDef.yieldPerHit = 12;
            nodeDef.requiredTool = ToolType.Axe;

            playerGo = new GameObject("Player");
            playerGo.SetActive(false);
            var stats = playerGo.AddComponent<SurvivalStats>();
            SetPrivate(stats, "config", config);
            playerGo.SetActive(true);

            managerGo = new GameObject("GameManager");
            var manager = managerGo.AddComponent<GameManager>();
            SetPrivate(manager, "survivalConfig", config);
            SetPrivate(manager, "playerStats", stats);

            serviceGo = new GameObject("ResourceRespawnService");
            serviceGo.AddComponent<ResourceRespawnService>();

            nodeGo = new GameObject("Tree", typeof(BoxCollider));
            var node = nodeGo.AddComponent<ResourceNode>();
            node.Configure(nodeDef);

            // A pickaxe is not an axe: "stone_pickaxe".Contains("axe") is true,
            // which used to hand out the axe bonus.
            var ctx = new InteractionContext { player = playerGo, equippedToolId = "stone_pickaxe" };
            Assert.IsTrue(node.Interact(ctx));

            Assert.AreEqual(12, manager.PlayerInventory.Count("wood"),
                "the wrong tool must yield the base amount");
        }

        static SaveData InvokeCollectSaveData(GameManager manager)
        {
            var method = typeof(GameManager).GetMethod("CollectSaveData",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(method, "CollectSaveData not found");
            return (SaveData)method.Invoke(manager, null);
        }
    }
}
