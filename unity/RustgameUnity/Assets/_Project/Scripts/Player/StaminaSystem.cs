using UnityEngine;

namespace Rustgame.Player
{
    /// <summary>Port of js/player/stamina.ts — pure functions operating on SurvivalStats.Stamina.</summary>
    public static class StaminaSystem
    {
        public static bool CanSprint(SurvivalStats stats, SurvivalConfigSO config)
            => stats.Stamina >= config.minimumSprintStamina;

        public static void DrainSprint(SurvivalStats stats, SurvivalConfigSO config, float dt)
            => stats.Stamina = Mathf.Max(0, stats.Stamina - config.sprintDrain * dt);

        public static void DrainJump(SurvivalStats stats, SurvivalConfigSO config)
            => stats.Stamina = Mathf.Max(0, stats.Stamina - config.jumpDrain);

        public static void DrainGather(SurvivalStats stats, SurvivalConfigSO config)
            => stats.Stamina = Mathf.Max(0, stats.Stamina - config.gatherDrain);

        public static void Regen(SurvivalStats stats, SurvivalConfigSO config, float dt, bool freezing)
        {
            var rate = freezing ? config.regenRateCold : config.regenRate;
            stats.Stamina = Mathf.Min(config.maxStamina, stats.Stamina + rate * dt);
        }
    }
}
