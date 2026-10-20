using UnityEngine;
using Rustgame.Core;

namespace Rustgame.Player
{
    /// <summary>Mirrors js/player/damage.ts DamageTypes — every HP change goes
    /// through ApplyDamage/Heal so there's one place to hook VFX/analytics later.</summary>
    public enum DamageType { Hunger, Thirst, Radiation, Cold, Bleeding, Animal, Generic }

    public static class DamageSystem
    {
        public static void ApplyDamage(SurvivalStats stats, float amount, DamageType type)
        {
            if (amount <= 0 || stats == null) return;

            stats.Health = Mathf.Max(0, stats.Health - amount);
            GameEvents.RaiseDamageApplied(type, amount);

            if (stats.Health <= 0) stats.MarkDead(DeathReason(type));
        }

        public static void Heal(SurvivalStats stats, float amount)
        {
            if (amount <= 0 || stats == null) return;
            stats.Health = Mathf.Min(stats.MaxHealth, stats.Health + amount);
        }

        /// <summary>Why the player died — the HUD shows this on the death screen.
        /// Derived from the damage type so damage from outside the survival tick
        /// (animals) reports a sensible reason too.</summary>
        static string DeathReason(DamageType type)
        {
            switch (type)
            {
                case DamageType.Hunger: return "hunger";
                case DamageType.Thirst: return "thirst";
                case DamageType.Radiation: return "radiation";
                case DamageType.Cold: return "freezing";
                case DamageType.Bleeding: return "bleeding";
                case DamageType.Animal: return "an animal";
                default: return "exhaustion";
            }
        }
    }
}
