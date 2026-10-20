using System.Collections.Generic;
using UnityEngine;
using Rustgame.Inventory;
using Rustgame.Player;
using Rustgame.Save;
using Rustgame.World;

namespace Rustgame.Core
{
    /// <summary>
    /// Boot sequence: register core services, load the save (or start fresh —
    /// SaveManager.Load() never throws), start the autosave timer at the
    /// verified 60s interval. Deliberately thin — this is NOT meant to grow
    /// into a Unity version of game.js's 2700-line do-everything file; each
    /// system (inventory, crafting, building, ...) owns its own logic and only
    /// registers itself here.
    ///
    /// It also owns the *player's* inventory, because the inventory is the one
    /// piece of state every system writes to: harvesting, crafting and looting
    /// all funnel through here (via GameEvents.ItemGained) instead of each
    /// system holding its own copy.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [SerializeField] SurvivalConfigSO survivalConfig;
        [SerializeField] SurvivalStats playerStats;
        [SerializeField] AutoSaveTimer autoSaveTimer;
        [SerializeField] ItemDatabase itemDatabase;

        InventorySystem playerInventory;
        string equippedToolId;

        public SurvivalConfigSO SurvivalConfig { get { return survivalConfig; } }
        public SurvivalStats PlayerStats { get { return playerStats; } }
        public ItemDatabase ItemDatabase { get { return itemDatabase; } }
        public InventorySystem PlayerInventory { get { return playerInventory; } }
        public string EquippedToolId { get { return equippedToolId; } }
        public SaveData CurrentSave { get; private set; }

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            ServiceLocator.Register(this);

            playerInventory = new InventorySystem(StackLimitFor, IsKnownItem, 0);
            GameEvents.ItemGained += OnItemGained;
        }

        void Start()
        {
            CurrentSave = SaveManager.Load();
            // NOTE: SaveManager raises SaveCorrupted itself — raising it again
            // here would show the player two "save corrupted" notices.

            if (SaveManager.LastReadStatus == SaveReadStatus.Ok)
                ApplySave(CurrentSave);
            else if (SaveManager.LastReadStatus == SaveReadStatus.FutureVersion)
                Debug.LogWarning("[GameManager] Save was written by a newer game version — starting fresh.");

            if (autoSaveTimer != null)
                autoSaveTimer.Configure(CollectSaveData, survivalConfig != null ? survivalConfig.autosaveIntervalSeconds : 60f);
        }

        void OnDestroy()
        {
            if (Instance != this) return;
            GameEvents.ItemGained -= OnItemGained;
            ServiceLocator.Unregister<GameManager>();
            GameEvents.Reset();
            Instance = null;
        }

        // ---- inventory ----------------------------------------------------

        /// <summary>Adds an item to the player's inventory. Returns the amount
        /// actually stored (0 when the stack is full or the id is unknown).</summary>
        public int AddItem(string itemId, int amount)
        {
            if (playerInventory == null || amount <= 0) return 0;
            var added = playerInventory.Add(itemId, amount);
            if (added > 0) GameEvents.RaiseInventoryChanged(itemId, playerInventory.Count(itemId));
            return added;
        }

        void OnItemGained(string itemId, int amount)
        {
            AddItem(itemId, amount);
        }

        /// <summary>The tool id currently in the player's hands. The gather
        /// bonus (×2 yield) keys off this — the interaction controller used to
        /// hardcode null, which silently disabled the whole bonus.</summary>
        public void SetEquippedTool(string toolId)
        {
            equippedToolId = toolId;
        }

        int StackLimitFor(string itemId)
        {
            return itemDatabase != null ? itemDatabase.GetStackLimit(itemId) : 999;
        }

        bool IsKnownItem(string itemId)
        {
            // No database wired yet (bootstrap scene before seeding) must not
            // block pickups — fall back to accepting anything.
            return itemDatabase == null || itemDatabase.IsKnownItem(itemId);
        }

        // ---- save ---------------------------------------------------------

        void ApplySave(SaveData data)
        {
            if (data == null) return;

            if (playerStats != null)
            {
                playerStats.RestoreStats(
                    data.player.stats.health, data.player.stats.hunger, data.player.stats.thirst,
                    data.player.stats.stamina, data.player.stats.temperature,
                    data.player.stats.radiation, data.player.stats.bleeding, data.player.dead);

                var t = playerStats.transform;
                t.position = new Vector3(data.player.posX, data.player.posY, data.player.posZ);
                t.rotation = Quaternion.Euler(0f, data.player.rotationY, 0f);
            }

            if (playerInventory != null)
            {
                foreach (var entry in data.inventory)
                {
                    if (entry == null) continue;
                    playerInventory.Add(entry.id, entry.count);
                }
            }

            var respawn = ServiceLocator.Get<ResourceRespawnService>();
            if (respawn != null) respawn.Restore(data.world.respawns);
        }

        /// <summary>Builds the save payload from the LIVE systems. The previous
        /// version returned the save it had loaded at boot, so every autosave
        /// overwrote the file with a snapshot from session start and nothing the
        /// player did was ever persisted.</summary>
        SaveData CollectSaveData()
        {
            var data = new SaveData();

            if (playerStats != null)
            {
                var pos = playerStats.transform.position;
                data.player.posX = pos.x;
                data.player.posY = pos.y;
                data.player.posZ = pos.z;
                data.player.rotationY = playerStats.transform.eulerAngles.y;
                data.player.stats.health = playerStats.Health;
                data.player.stats.hunger = playerStats.Hunger;
                data.player.stats.thirst = playerStats.Thirst;
                data.player.stats.stamina = playerStats.Stamina;
                data.player.stats.temperature = playerStats.Temperature;
                data.player.stats.radiation = playerStats.Radiation;
                data.player.stats.bleeding = playerStats.Bleeding;
                data.player.dead = playerStats.IsDead;
            }

            data.inventory.Clear();
            if (playerInventory != null)
            {
                foreach (var stack in playerInventory.Items)
                {
                    if (stack.IsEmpty) continue;
                    data.inventory.Add(new InventoryEntry { id = stack.itemId, count = stack.count });
                }
            }

            var respawn = ServiceLocator.Get<ResourceRespawnService>();
            data.world.respawns = respawn != null ? respawn.CollectPending() : new List<RespawnEntry>();

            return data;
        }

        /// <summary>Called by AutoSaveTimer and by anything that wants to force a
        /// save (after building, after revive — matching the verified triggers).</summary>
        public void SaveNow()
        {
            if (autoSaveTimer != null) autoSaveTimer.SaveNow();
            else SaveManager.Save(CollectSaveData());
        }
    }
}
