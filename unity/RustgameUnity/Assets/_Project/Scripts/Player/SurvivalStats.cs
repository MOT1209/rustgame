using UnityEngine;
using Rustgame.Core;

namespace Rustgame.Player
{
    public enum HungerState { Normal, Hungry, Starving, Critical }
    public enum ThirstState { Normal, Thirsty, Dehydrated, Critical }

    /// <summary>Environment flags the tick needs — mirrors SurvivalEnv in survival.ts.</summary>
    public struct SurvivalEnv
    {
        public bool sprinting;
        public bool isNight;
        public bool isRaining;
        public bool nearFire;
        public bool inWater;
        public bool inRadiation;
    }

    /// <summary>
    /// Line-for-line port of js/player/survival.ts SurvivalSystem.tick(), verified
    /// against the live game. One Tick() call per frame drives hunger, thirst,
    /// temperature, radiation, bleeding and natural regen; every HP change goes
    /// through DamageSystem so nothing bypasses the single source of truth.
    /// </summary>
    public class SurvivalStats : MonoBehaviour
    {
        [SerializeField] SurvivalConfigSO config;

        public float Health { get; set; }
        public float MaxHealth { get; set; } = 100f;
        public float Hunger { get; private set; }
        public float Thirst { get; private set; }
        public float Stamina { get; set; }
        public float Temperature { get; private set; }
        public float Radiation { get; private set; }
        public float Bleeding { get; set; }
        public bool IsFreezing { get; private set; }
        public bool IsDead { get; private set; }

        void Awake()
        {
            if (config != null) Initialize(config);
        }

        /// <summary>Assign the config and reset to its starting values. Called
        /// automatically from Awake when config is set in the Inspector;
        /// exposed publicly so EditMode tests (and runtime spawners) can
        /// configure a freshly-added component directly.</summary>
        public void Initialize(SurvivalConfigSO cfg)
        {
            config = cfg;
            Health = MaxHealth = config.maxHealth;
            Hunger = config.hungerStart;
            Thirst = config.thirstStart;
            Stamina = config.staminaStart;
            Temperature = config.tempStart;
            Radiation = 0f;
            Bleeding = 0f;
        }

        public HungerState GetHungerState()
        {
            if (Hunger <= 0) return HungerState.Critical;
            if (Hunger > config.hungerNormalThreshold) return HungerState.Normal;
            if (Hunger > config.hungerHungryThreshold) return HungerState.Hungry;
            return HungerState.Starving;
        }

        public ThirstState GetThirstState()
        {
            if (Thirst <= 0) return ThirstState.Critical;
            if (Thirst > config.thirstNormalThreshold) return ThirstState.Normal;
            if (Thirst > config.thirstThirstyThreshold) return ThirstState.Thirsty;
            return ThirstState.Dehydrated;
        }

        public void Tick(float dt, SurvivalEnv env)
        {
            if (IsDead || dt <= 0) return;
            var c = config;

            // ---- Hunger ----
            var hungerRate = env.sprinting ? c.hungerDrainSprint : c.hungerDrain;
            IsFreezing = Temperature <= c.freezingThreshold;
            if (IsFreezing) hungerRate = Mathf.Max(hungerRate, c.hungerDrainCold);
            Hunger = Mathf.Max(0, Hunger - hungerRate * dt);

            // ---- Thirst (drains faster than hunger) ----
            var thirstRate = env.sprinting ? c.thirstDrainSprint : c.thirstDrain;
            Thirst = Mathf.Max(0, Thirst - thirstRate * dt);

            // ---- Temperature ----
            if (env.nearFire) Temperature = Mathf.Min(c.maxTemperature, Temperature + c.campfireWarmRate * dt);
            else if (env.isRaining) Temperature = Mathf.Max(0, Temperature - c.tempRainDrain * dt);
            else if (env.isNight) Temperature = Mathf.Max(0, Temperature - c.tempNightDrain * dt);
            else Temperature = Mathf.Min(c.maxTemperature, Temperature + c.tempDayRate * dt);
            if (env.inWater) Temperature = Mathf.Max(0, Temperature - c.tempColdWaterDrain * dt);

            // ---- Radiation ----
            if (env.inRadiation) Radiation = Mathf.Min(c.maxRadiation, Radiation + c.radGainInZone * dt);
            else Radiation = Mathf.Max(0, Radiation - c.radDecay * dt);

            // ---- Centralized damage sources ----
            if (Hunger <= 0) DamageSystem.ApplyDamage(this, c.starvationDamage * dt, DamageType.Hunger);
            if (Thirst <= 0) DamageSystem.ApplyDamage(this, c.dehydrationDamage * dt, DamageType.Thirst);
            if (Radiation >= c.radLethalAt) DamageSystem.ApplyDamage(this, c.radDamage * dt, DamageType.Radiation);
            if (Temperature <= c.criticalThreshold) DamageSystem.ApplyDamage(this, c.freezingDamage * dt, DamageType.Cold);
            if (Bleeding > 0) DamageSystem.ApplyDamage(this, c.bleedDamage * Bleeding * dt, DamageType.Bleeding);

            // ---- Natural regen (well-fed only) ----
            if (Hunger >= c.regenHungerMin && Thirst >= c.regenThirstMin && Health > 0 && Health < MaxHealth)
                DamageSystem.Heal(this, c.naturalRegen * dt);

            GameEvents.RaiseSurvivalChanged(new SurvivalSnapshot(Health, MaxHealth, Hunger, Thirst, Stamina, Temperature, Radiation, Bleeding));

            if (Health <= 0 && !IsDead)
            {
                IsDead = true;
                var reason = Radiation >= c.radLethalAt ? "radiation" : Hunger <= 0 ? "hunger" : Thirst <= 0 ? "thirst" : "exhaustion";
                GameEvents.RaisePlayerDied(reason);
            }
        }

        /// <summary>Exact values verified from game.js doRevive() — always full
        /// stat reset, never partial, whether the player watched an ad or not.</summary>
        public void Revive()
        {
            Health = config.reviveHealth;
            Hunger = config.reviveHunger;
            Thirst = config.reviveThirst;
            Stamina = config.reviveStamina;
            Temperature = config.reviveTemperature;
            Radiation = 0f;
            Bleeding = 0f;
            IsDead = false;
            transform.position = config.reviveWorldPosition;
            GameEvents.RaisePlayerRevived();
        }
    }
}
