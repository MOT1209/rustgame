using System;

namespace Rustgame.Core
{
    /// <summary>
    /// Static event bus so gameplay systems and UI don't hold direct references
    /// to each other (mirrors the decoupling js/interaction/interaction.js and
    /// js/ui/hud.js get for free by both reading the same plain `state` object).
    /// </summary>
    public static class GameEvents
    {
        public static event Action<SurvivalSnapshot> SurvivalChanged;
        public static event Action<string> PlayerDied;
        public static event Action PlayerRevived;
        public static event Action<string /* itemId */, int /* count */> InventoryChanged;
        public static event Action<bool /* isNight */> DayNightChanged;
        public static event Action<string /* weatherId */> WeatherChanged;
        public static event Action SaveCompleted;
        public static event Action SaveCorrupted;

        public static void RaiseSurvivalChanged(SurvivalSnapshot snapshot) => SurvivalChanged?.Invoke(snapshot);
        public static void RaisePlayerDied(string reason) => PlayerDied?.Invoke(reason);
        public static void RaisePlayerRevived() => PlayerRevived?.Invoke();
        public static void RaiseInventoryChanged(string itemId, int count) => InventoryChanged?.Invoke(itemId, count);
        public static void RaiseDayNightChanged(bool isNight) => DayNightChanged?.Invoke(isNight);
        public static void RaiseWeatherChanged(string weatherId) => WeatherChanged?.Invoke(weatherId);
        public static void RaiseSaveCompleted() => SaveCompleted?.Invoke();
        public static void RaiseSaveCorrupted() => SaveCorrupted?.Invoke();
    }

    /// <summary>Read-only snapshot handed to the HUD — never the live stats object.</summary>
    public readonly struct SurvivalSnapshot
    {
        public readonly float health, maxHealth, hunger, thirst, stamina, temperature, radiation, bleeding;

        public SurvivalSnapshot(float health, float maxHealth, float hunger, float thirst,
            float stamina, float temperature, float radiation, float bleeding)
        {
            this.health = health; this.maxHealth = maxHealth; this.hunger = hunger; this.thirst = thirst;
            this.stamina = stamina; this.temperature = temperature; this.radiation = radiation; this.bleeding = bleeding;
        }
    }
}
