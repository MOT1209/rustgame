using NUnit.Framework;
using UnityEngine;
using Rustgame.Save;

namespace Rustgame.Tests.EditMode
{
    /// <summary>Verifies the never-throws / corrupt-save-recovery invariant that
    /// is the whole point of porting the A/B-slot design from save-system.ts.
    /// Uses real PlayerPrefs under a test-only key prefix... actually SaveManager
    /// hardcodes its key base, so these tests save/restore PlayerPrefs state
    /// around themselves to avoid leaking into the Editor's real save slot.</summary>
    public class SaveManagerTests
    {
        const string KeyA = "rustgame_save:a";
        const string KeyB = "rustgame_save:b";
        const string KeyActive = "rustgame_save:active";

        string savedA, savedB, savedActive;
        bool hadA, hadB, hadActive;

        [SetUp]
        public void CaptureExistingState()
        {
            hadA = PlayerPrefs.HasKey(KeyA); savedA = PlayerPrefs.GetString(KeyA, null);
            hadB = PlayerPrefs.HasKey(KeyB); savedB = PlayerPrefs.GetString(KeyB, null);
            hadActive = PlayerPrefs.HasKey(KeyActive); savedActive = PlayerPrefs.GetString(KeyActive, null);
            PlayerPrefs.DeleteKey(KeyA);
            PlayerPrefs.DeleteKey(KeyB);
            PlayerPrefs.DeleteKey(KeyActive);
        }

        [TearDown]
        public void RestoreExistingState()
        {
            if (hadA) PlayerPrefs.SetString(KeyA, savedA); else PlayerPrefs.DeleteKey(KeyA);
            if (hadB) PlayerPrefs.SetString(KeyB, savedB); else PlayerPrefs.DeleteKey(KeyB);
            if (hadActive) PlayerPrefs.SetString(KeyActive, savedActive); else PlayerPrefs.DeleteKey(KeyActive);
            PlayerPrefs.Save();
        }

        [Test]
        public void Load_WithNoSave_ReturnsBlank_StatusMissing()
        {
            var data = SaveManager.Load();
            Assert.AreEqual(SaveReadStatus.Missing, SaveManager.LastReadStatus);
            Assert.AreEqual(100f, data.player.stats.health);
        }

        [Test]
        public void SaveThenLoad_RoundTrips()
        {
            var data = SaveData.Blank();
            data.player.posX = 12.5f;
            data.world.day = 3;

            SaveManager.Save(data);
            var loaded = SaveManager.Load();

            Assert.AreEqual(SaveReadStatus.Ok, SaveManager.LastReadStatus);
            Assert.AreEqual(12.5f, loaded.player.posX);
            Assert.AreEqual(3, loaded.world.day);
        }

        [Test]
        public void CorruptSave_NeverThrows_ReturnsBlankWithCorruptStatus()
        {
            PlayerPrefs.SetString(KeyA, "{not valid json!!!");
            PlayerPrefs.SetString(KeyActive, "a");
            PlayerPrefs.Save();

            SaveData data = null;
            Assert.DoesNotThrow(() => data = SaveManager.Load());

            Assert.IsNotNull(data);
            Assert.AreEqual(SaveReadStatus.Corrupt, SaveManager.LastReadStatus);
        }

        [Test]
        public void FutureVersionSave_ReturnsBlank_DoesNotOverwriteAsCurrent()
        {
            var data = SaveData.Blank();
            data.saveVersion = SaveData.CurrentVersion + 1;
            var json = JsonUtility.ToJson(data);
            PlayerPrefs.SetString(KeyA, json);
            PlayerPrefs.SetString(KeyActive, "a");
            PlayerPrefs.Save();

            var loaded = SaveManager.Load();

            Assert.AreEqual(SaveReadStatus.FutureVersion, SaveManager.LastReadStatus);
            Assert.AreEqual(SaveData.CurrentVersion, loaded.saveVersion); // Blank(), not the future one
        }
    }
}
