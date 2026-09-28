using UnityEngine;

namespace Rustgame.World
{
    /// <summary>Numbers copied verbatim from js/world/weather.js WEATHER_STATES.</summary>
    [CreateAssetMenu(menuName = "Rustgame/Weather Definition", fileName = "Weather_")]
    public class WeatherDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        [Tooltip("Added to temperature drain/gain rates — 0 for clear, negative for worse weather.")]
        public float tempMod;
        [Tooltip("Multiplier on directional light intensity.")]
        public float lightMod = 1f;
        [Tooltip("Multiplier on fog density.")]
        public float fogMod = 1f;
        [Tooltip("Relative weight for random selection (0 = never picked — storm is defined but disabled by default, matching the original).")]
        public int weight;
    }
}
