using NUnit.Framework;
using UnityEngine;
using Rustgame.Core;
using Rustgame.Player;

namespace Rustgame.Tests
{
    /// <summary>
    /// Port of the survival-tick behaviour from js/player/survival.ts and
    /// tests/phase1.test.mjs: hunger/thirst drain, starvation damage, death and
    /// the full-stat revive.
    /// </summary>
    public class SurvivalStatsTests
    {
        SurvivalConfigSO config;
        GameObject go;
        SurvivalStats stats;
        string deathReason;

        [SetUp]
        public void SetUp()
        {
            config = ScriptableObject.CreateInstance<SurvivalConfigSO>();
            go = new GameObject("player");
            stats = go.AddComponent<SurvivalStats>();
            stats.Initialize(config);

            deathReason = null;
            GameEvents.PlayerDied += OnPlayerDied;
        }

        [TearDown]
        public void TearDown()
        {
            GameEvents.PlayerDied -= OnPlayerDied;
            Object.DestroyImmediate(go);
            Object.DestroyImmediate(config);
        }

        void OnPlayerDied(string reason) { deathReason = reason; }

        [Test]
        public void Initialize_SeedsStatsFromTheConfig()
        {
            Assert.AreEqual(config.maxHealth, stats.Health);
            Assert.AreEqual(config.hungerStart, stats.Hunger);
            Assert.AreEqual(config.thirstStart, stats.Thirst);
            Assert.AreEqual(config.staminaStart, stats.Stamina);
            Assert.IsFalse(stats.IsDead);
        }

        [Test]
        public void Tick_DrainsHungerAndThirst()
        {
            var hunger = stats.Hunger;
            var thirst = stats.Thirst;

            stats.Tick(1f, new SurvivalEnv());

            Assert.AreEqual(hunger - config.hungerDrain, stats.Hunger, 0.001f);
            Assert.AreEqual(thirst - config.thirstDrain, stats.Thirst, 0.001f);
        }

        [Test]
        public void Tick_DrainsFasterWhileSprinting()
        {
            var walked = stats.Hunger;
            stats.Tick(1f, new SurvivalEnv { sprinting = true });
            var sprintHunger = stats.Hunger;

            Assert.AreEqual(config.hungerDrainSprint, walked - sprintHunger, 0.001f);
        }

        [Test]
        public void Tick_StarvationDamagesHealth()
        {
            // Isolate starvation: thirst would otherwise kill the player first
            // (thirst drains faster than hunger), so give it a huge buffer.
            stats.RestoreStats(stats.Health, 100f, 100000f, stats.Stamina, stats.Temperature, 0f, 0f, false);

            // Drain hunger to zero (0.05/s → 200 ticks of 10 s). Starvation
            // damage lands on the way, so health must have dropped too.
            var health = stats.Health;
            for (int i = 0; i < 300 && stats.Hunger > 0; i++) stats.Tick(10f, new SurvivalEnv());
            Assert.AreEqual(0f, stats.Hunger, 0.001f);
            Assert.Less(stats.Health, health);
        }

        [Test]
        public void Tick_DeathRaisesPlayerDied()
        {
            for (int i = 0; i < 300 && !stats.IsDead; i++) stats.Tick(10f, new SurvivalEnv());

            Assert.IsTrue(stats.IsDead);
            Assert.IsNotNull(deathReason);
        }

        [Test]
        public void Revive_ResetsEveryStatToTheConfiguredValues()
        {
            for (int i = 0; i < 300 && !stats.IsDead; i++) stats.Tick(10f, new SurvivalEnv());

            stats.Revive();

            Assert.IsFalse(stats.IsDead);
            Assert.AreEqual(config.reviveHealth, stats.Health);
            Assert.AreEqual(config.reviveHunger, stats.Hunger);
            Assert.AreEqual(config.reviveThirst, stats.Thirst);
            Assert.AreEqual(config.reviveStamina, stats.Stamina);
            Assert.AreEqual(config.reviveTemperature, stats.Temperature);
            Assert.AreEqual(0f, stats.Radiation);
            Assert.AreEqual(0f, stats.Bleeding);
        }

        [Test]
        public void HungerState_FollowsTheConfiguredThresholds()
        {
            Assert.AreEqual(HungerState.Normal, stats.GetHungerState());

            stats.RestoreStats(stats.Health, 40f, stats.Thirst, stats.Stamina, stats.Temperature, 0f, 0f, false);
            Assert.AreEqual(HungerState.Hungry, stats.GetHungerState());

            stats.RestoreStats(stats.Health, 10f, stats.Thirst, stats.Stamina, stats.Temperature, 0f, 0f, false);
            Assert.AreEqual(HungerState.Starving, stats.GetHungerState());

            stats.RestoreStats(stats.Health, 0f, stats.Thirst, stats.Stamina, stats.Temperature, 0f, 0f, false);
            Assert.AreEqual(HungerState.Critical, stats.GetHungerState());
        }
    }
}
