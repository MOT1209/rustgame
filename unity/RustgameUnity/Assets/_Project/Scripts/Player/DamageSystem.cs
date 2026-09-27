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
            stats.Health = UnityEngine.Mathf.Max(0, stats.Health - amount);
        }

        public static void Heal(SurvivalStats stats, float amount)
        {
            if (amount <= 0 || stats == null) return;
            stats.Health = UnityEngine.Mathf.Min(stats.MaxHealth, stats.Health + amount);
        }
    }
}
