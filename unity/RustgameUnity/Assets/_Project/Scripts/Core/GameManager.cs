using UnityEngine;
using Rustgame.Player;
using Rustgame.Save;

namespace Rustgame.Core
{
    /// <summary>
    /// Boot sequence: register core services, load the save (or start fresh —
    /// SaveManager.Load() never throws), start the autosave timer at the
    /// verified 60s interval. Deliberately thin — this is NOT meant to grow
    /// into a Unity version of game.js's 2700-line do-everything file; each
    /// system (inventory, crafting, building, ...) owns its own logic and only
    /// registers itself here.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [SerializeField] SurvivalConfigSO survivalConfig;
        [SerializeField] SurvivalStats playerStats;
        [SerializeField] AutoSaveTimer autoSaveTimer;

        public SurvivalConfigSO SurvivalConfig => survivalConfig;
        public SaveData CurrentSave { get; private set; }

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            ServiceLocator.Register(this);
        }

        void Start()
        {
            CurrentSave = SaveManager.Load();
            if (SaveManager.LastReadStatus == SaveReadStatus.Corrupt)
                GameEvents.RaiseSaveCorrupted();

            if (playerStats != null)
            {
                playerStats.transform.position = new Vector3(
                    CurrentSave.player.posX, CurrentSave.player.posY, CurrentSave.player.posZ);
            }

            if (autoSaveTimer != null)
                autoSaveTimer.Configure(CollectSaveData, survivalConfig != null ? survivalConfig.autosaveIntervalSeconds : 60f);
        }

        /// <summary>Called by AutoSaveTimer and by anything that wants to force a
        /// save (after building, after revive — matching the verified triggers).</summary>
        SaveData CollectSaveData()
        {
            // Fill in from the live systems as they come online; returning the
            // last loaded save keeps this compilable/testable in the meantime.
            return CurrentSave ?? SaveData.Blank();
        }

        public void SaveNow() => autoSaveTimer?.SaveNow();
    }
}
