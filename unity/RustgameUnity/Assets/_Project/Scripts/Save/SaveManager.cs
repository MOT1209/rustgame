using System;
using UnityEngine;
using Rustgame.Core;

namespace Rustgame.Save
{
    public enum SaveReadStatus { Ok, Missing, Corrupt, FutureVersion, Error }

    /// <summary>
    /// Port of js/save/save-system.ts — A/B alternating slots (`key:a`/`key:b` +
    /// `key:active` pointer) so a write that dies mid-flight never destroys the
    /// only copy of the save. Read NEVER throws: any failure becomes a
    /// SaveReadStatus and SaveData.Blank(), matching the verified invariant in
    /// the original game (corrupt saves show a notice and start fresh, never a
    /// crash). Uses PlayerPrefs for now — swap for a file under
    /// Application.persistentDataPath if the save grows large.
    /// </summary>
    public static class SaveManager
    {
        const string KeyBase = "rustgame_save";

        public static SaveReadStatus LastReadStatus { get; private set; } = SaveReadStatus.Missing;
        public static string LastWriteError { get; private set; }

        public static void Save(SaveData data)
        {
            try
            {
                data.saveVersion = SaveData.CurrentVersion;
                data.timestampUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var json = JsonUtility.ToJson(data);

                var nextSlot = GetInactiveSlot();
                PlayerPrefs.SetString(SlotKey(nextSlot), json);
                PlayerPrefs.SetString(PointerKey(), nextSlot);
                PlayerPrefs.Save();

                LastWriteError = null;
                GameEvents.RaiseSaveCompleted();
            }
            catch (Exception e)
            {
                LastWriteError = e.GetType().Name;
                Debug.LogError($"[SaveManager] Save failed: {e}");
            }
        }

        public static SaveData Load()
        {
            try
            {
                var active = PlayerPrefs.GetString(PointerKey(), string.Empty);
                if (string.IsNullOrEmpty(active))
                {
                    LastReadStatus = SaveReadStatus.Missing;
                    return SaveData.Blank();
                }

                var raw = PlayerPrefs.GetString(SlotKey(active), string.Empty);
                if (string.IsNullOrEmpty(raw))
                {
                    LastReadStatus = SaveReadStatus.Corrupt;
                    GameEvents.RaiseSaveCorrupted();
                    return SaveData.Blank();
                }

                var data = JsonUtility.FromJson<SaveData>(raw);
                if (data == null)
                {
                    LastReadStatus = SaveReadStatus.Corrupt;
                    GameEvents.RaiseSaveCorrupted();
                    return SaveData.Blank();
                }

                if (data.saveVersion > SaveData.CurrentVersion)
                {
                    LastReadStatus = SaveReadStatus.FutureVersion;
                    return SaveData.Blank();
                }

                var migrated = SaveMigrationService.MigrateToLatest(data);
                LastReadStatus = SaveReadStatus.Ok;
                return migrated;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveManager] Load failed, starting fresh: {e}");
                LastReadStatus = SaveReadStatus.Corrupt;
                GameEvents.RaiseSaveCorrupted();
                return SaveData.Blank();
            }
        }

        static string GetInactiveSlot()
        {
            var active = PlayerPrefs.GetString(PointerKey(), "a");
            return active == "a" ? "b" : "a";
        }

        static string SlotKey(string slot) => $"{KeyBase}:{slot}";
        static string PointerKey() => $"{KeyBase}:active";
    }

    /// <summary>Placeholder for v1/v2 -> v3 migrations once Unity ships an earlier
    /// save format of its own. Today it's an identity function.</summary>
    public static class SaveMigrationService
    {
        public static SaveData MigrateToLatest(SaveData data) => data;
    }
}
