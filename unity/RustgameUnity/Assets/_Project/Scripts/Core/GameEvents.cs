using System;
using Rustgame.Player;

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

        /// <summary>Raised the moment an item enters the world (harvest, pickup,
        /// craft result). The inventory owner listens to this — nobody credits
        /// items twice because only the bus carries the "gained" signal.</summary>
        public static event Action<string /* itemId */, int /* amount */> ItemGained;

        public static event Action<bool /* isNight */> DayNightChanged;
        public static event Action<string /* weatherId */> WeatherChanged;

        /// <summary>Every HP change goes through DamageSystem, so this is the one
        /// place VFX / audio / analytics can hook damage without touching the
        /// survival tick.</summary>
        public static event Action<DamageType, float /* amount */> DamageApplied;

        public static event Action SaveCompleted;
        public static event Action SaveCorrupted;

        /// <summary>E was pressed with nothing interactable in range — the UI
        /// layer listens and opens the inventory panel.</summary>
        public static event Action OpenInventoryRequested;

        public static void RaiseSurvivalChanged(SurvivalSnapshot snapshot) { if (SurvivalChanged != null) SurvivalChanged(snapshot); }
        public static void RaisePlayerDied(string reason) { if (PlayerDied != null) PlayerDied(reason); }
        public static void RaisePlayerRevived() { if (PlayerRevived != null) PlayerRevived(); }
        public static void RaiseInventoryChanged(string itemId, int count) { if (InventoryChanged != null) InventoryChanged(itemId, count); }
        public static void RaiseItemGained(string itemId, int amount) { if (ItemGained != null) ItemGained(itemId, amount); }
        public static void RaiseDayNightChanged(bool isNight) { if (DayNightChanged != null) DayNightChanged(isNight); }
        public static void RaiseWeatherChanged(string weatherId) { if (WeatherChanged != null) WeatherChanged(weatherId); }
        public static void RaiseDamageApplied(DamageType type, float amount) { if (DamageApplied != null) DamageApplied(type, amount); }
        public static void RaiseSaveCompleted() { if (SaveCompleted != null) SaveCompleted(); }
        public static void RaiseSaveCorrupted() { if (SaveCorrupted != null) SaveCorrupted(); }
        public static void RaiseOpenInventoryRequested() { if (OpenInventoryRequested != null) OpenInventoryRequested(); }

        /// <summary>Drops every subscriber. Called when the game session ends so
        /// a stale UI object can't keep the bus alive across play sessions
        /// (Unity's "no domain reload" mode makes statics outlive a scene).</summary>
        public static void Reset()
        {
            SurvivalChanged = null;
            PlayerDied = null;
            PlayerRevived = null;
            InventoryChanged = null;
            ItemGained = null;
            DayNightChanged = null;
            WeatherChanged = null;
            DamageApplied = null;
            SaveCompleted = null;
            SaveCorrupted = null;
            OpenInventoryRequested = null;
        }
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
