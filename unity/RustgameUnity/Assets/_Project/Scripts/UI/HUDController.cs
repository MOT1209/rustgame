using UnityEngine;
using UnityEngine.UI;
using Rustgame.Core;

namespace Rustgame.UI
{
    /// <summary>
    /// Reads GameEvents.SurvivalChanged and updates 5 bars — never reads
    /// SurvivalStats directly, matching the "Views read state through events,
    /// never own it" rule from the port plan. Slider references are assigned
    /// once SceneBootstrapper builds the HUD Canvas.
    /// </summary>
    public class HUDController : MonoBehaviour
    {
        [SerializeField] Slider healthBar, hungerBar, thirstBar, staminaBar, temperatureBar;

        void OnEnable() => GameEvents.SurvivalChanged += OnSurvivalChanged;
        void OnDisable() => GameEvents.SurvivalChanged -= OnSurvivalChanged;

        void OnSurvivalChanged(SurvivalSnapshot s)
        {
            SetBar(healthBar, s.health, s.maxHealth);
            SetBar(hungerBar, s.hunger, 100f);
            SetBar(thirstBar, s.thirst, 100f);
            SetBar(staminaBar, s.stamina, 100f);
            SetBar(temperatureBar, s.temperature, 100f);
        }

        static void SetBar(Slider bar, float value, float max)
        {
            if (bar == null || max <= 0) return;
            bar.value = Mathf.Clamp01(value / max);
        }
    }
}
