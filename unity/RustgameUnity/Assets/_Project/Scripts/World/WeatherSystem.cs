using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Rustgame.Core;

namespace Rustgame.World
{
    /// <summary>
    /// Line-for-line port of js/world/weather.js WeatherSystem — same weighted
    /// random pick, same 90-240s random duration window, same default weights
    /// (clear 60 / cloudy 25 / rain 15 / storm 0 — storm exists but is disabled
    /// by default, exactly like the original). rng is injectable so this is
    /// unit-testable with a seeded sequence, same as the JS version's `opts.rng`.
    /// </summary>
    public class WeatherSystem : MonoBehaviour
    {
        [SerializeField] List<WeatherDefinition> states = new();
        [SerializeField] float minDuration = 90f;
        [SerializeField] float maxDuration = 240f;

        Func<float> rng = () => UnityEngine.Random.value;
        Dictionary<string, WeatherDefinition> lookup;
        float timeLeft;

        public string CurrentId { get; private set; } = "clear";
        public WeatherDefinition Current => lookup != null && lookup.TryGetValue(CurrentId, out var d) ? d : null;

        void Awake()
        {
            lookup = states.Where(s => s != null).ToDictionary(s => s.id, s => s);
            timeLeft = minDuration;
        }

        /// <summary>Inject a seeded RNG for deterministic tests.</summary>
        public void SetRng(Func<float> rngFunc) => rng = rngFunc ?? (() => UnityEngine.Random.value);

        string PickNext()
        {
            var entries = states.Where(s => s != null && s.weight > 0).ToList();
            var total = entries.Sum(s => s.weight);
            if (total <= 0) return "clear";
            var roll = rng() * total;
            foreach (var s in entries)
            {
                roll -= s.weight;
                if (roll <= 0) return s.id;
            }
            return entries[0].id;
        }

        /// <summary>Advance the clock; returns true when weather changed this call.</summary>
        public bool Tick(float dt)
        {
            timeLeft -= dt;
            if (timeLeft > 0) return false;
            var next = PickNext();
            var changed = next != CurrentId;
            CurrentId = next;
            timeLeft = minDuration + rng() * (maxDuration - minDuration);
            if (changed) GameEvents.RaiseWeatherChanged(CurrentId);
            return changed;
        }
    }
}
