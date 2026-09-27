using UnityEngine;

namespace Rustgame.Save
{
    /// <summary>
    /// Fires SaveManager.Save on: a fixed interval (60s, matching
    /// SURVIVAL_CONFIG.autosaveIntervalMs), OnApplicationPause(true) — the
    /// mobile equivalent of the web build's tab-hide/blur autosave — and
    /// OnApplicationQuit as a last-chance net (verified against game.js's
    /// autosave triggers: 60s + tab-hide + after builds/revives). Also expose
    /// SaveNow() for "after a build" / "after a revive" call sites.
    /// </summary>
    public class AutoSaveTimer : MonoBehaviour
    {
        [SerializeField] float intervalSeconds = 60f;
        [SerializeField] System.Func<SaveData> collectSaveData;

        float timer;

        public void Configure(System.Func<SaveData> collector, float interval)
        {
            collectSaveData = collector;
            intervalSeconds = interval;
            timer = 0f;
        }

        void Update()
        {
            if (collectSaveData == null) return;
            timer += Time.unscaledDeltaTime;
            if (timer < intervalSeconds) return;
            timer = 0f;
            SaveNow();
        }

        public void SaveNow()
        {
            if (collectSaveData == null) return;
            SaveManager.Save(collectSaveData());
        }

        void OnApplicationPause(bool paused)
        {
            if (paused) SaveNow();
        }

        void OnApplicationQuit() => SaveNow();
    }
}
