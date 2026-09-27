using UnityEngine;

namespace Rustgame.Player
{
    /// <summary>
    /// Direct port of js/core/config.ts SURVIVAL_CONFIG — every default value
    /// below is copied verbatim from the verified live config, not guessed.
    /// Gameplay code should read from an instance of this, never hardcode
    /// numbers (same rule the original PRD enforces for SURVIVAL_CONFIG).
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Survival Config", fileName = "SurvivalConfig")]
    public class SurvivalConfigSO : ScriptableObject
    {
        [Header("Vitals (max values)")]
        public float maxHealth = 100;
        public float maxHunger = 100;
        public float maxThirst = 100;
        public float maxStamina = 100;
        public float maxTemperature = 100;
        public float maxRadiation = 100;

        [Header("Hunger")]
        public float hungerStart = 100;
        public float hungerDrain = 0.05f;
        public float hungerDrainSprint = 0.09f;
        public float hungerDrainCold = 0.08f;
        public float hungerNormalThreshold = 60;
        public float hungerHungryThreshold = 30;
        public float starvationDamage = 2.0f;

        [Header("Thirst (drains faster than hunger)")]
        public float thirstStart = 100;
        public float thirstDrain = 0.08f;
        public float thirstDrainSprint = 0.13f;
        public float thirstNormalThreshold = 60;
        public float thirstThirstyThreshold = 30;
        public float dehydrationDamage = 2.5f;

        [Header("Stamina")]
        public float staminaStart = 100;
        public float sprintDrain = 12.0f;
        public float jumpDrain = 10.0f;
        public float gatherDrain = 4.0f;
        public float regenRate = 9.0f;
        public float regenRateCold = 4.0f;
        public float minimumSprintStamina = 15.0f;

        [Header("Temperature (0 = freezing, 100 = ideal)")]
        public float tempStart = 100;
        public float tempDayRate = 1.2f;
        public float tempNightDrain = 0.9f;
        public float tempRainDrain = 1.6f;
        public float tempColdWaterDrain = 2.0f;
        public float freezingThreshold = 25f;
        public float criticalThreshold = 10f;
        public float freezingDamage = 1.5f;
        public float campfireWarmRate = 6.0f;

        [Header("Radiation (Phase 2 — monuments)")]
        public float radGainInZone = 2.0f;
        public float radDecay = 1.0f;
        public float radLethalAt = 100f;
        public float radDamage = 2.0f;

        [Header("Bleeding")]
        public float bleedDamage = 1.0f;
        public bool bandageStopsBleeding = true;

        [Header("Healing / regen")]
        public float regenHungerMin = 60f;
        public float regenThirstMin = 50f;
        public float naturalRegen = 1.0f;

        [Header("Day / night")]
        public float dayLengthSeconds = 800f;
        public float dayStartOffset = 300f;

        [Header("Save")]
        public float autosaveIntervalSeconds = 60f;

        [Header("Death / revive (verified from game.js triggerDeath/doRevive)")]
        public float reviveHealth = 100f;
        public float reviveHunger = 80f;
        public float reviveThirst = 80f;
        public float reviveStamina = 100f;
        public float reviveTemperature = 90f;
        [Tooltip("The original game always revives at world origin (the 'main camp'), not a separate respawn point.")]
        public Vector3 reviveWorldPosition = Vector3.zero;
    }
}
