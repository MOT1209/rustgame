using UnityEngine;
using Rustgame.Core;

namespace Rustgame.World
{
    /// <summary>
    /// Port of js/world/day-night.js DayNight helpers, verified against the
    /// live game (dayLength = SURVIVAL_CONFIG.dayLength = 800s). Phase
    /// boundaries (morning/afternoon/dusk/night/dawn) and isNight() are copied
    /// exactly, including the somewhat asymmetric night window (0.5-0.9 of the
    /// day) — that's the original's own convention, not a Unity guess.
    /// </summary>
    public class TimeSystem : MonoBehaviour
    {
        [SerializeField] float dayLengthSeconds = 800f;

        public int Day { get; private set; } = 1;
        public float TimeOfDay { get; private set; } // seconds into the current day
        public bool IsNight { get; private set; }

        public void Tick(float dt)
        {
            var wasNight = IsNight;
            TimeOfDay += dt;
            while (TimeOfDay >= dayLengthSeconds)
            {
                TimeOfDay -= dayLengthSeconds;
                Day += 1;
            }
            IsNight = ComputeIsNight(TimeOfDay);
            if (IsNight != wasNight) GameEvents.RaiseDayNightChanged(IsNight);
        }

        public float Progress01() => Mathf.Repeat(TimeOfDay, dayLengthSeconds) / dayLengthSeconds;

        /// <summary>Radians, matches the original's Three.js sun rotation convention.</summary>
        public float SunAngleRadians() => Progress01() * Mathf.PI * 2f;

        public float DaylightFactor01() => Mathf.Max(0f, Mathf.Sin(SunAngleRadians()));

        bool ComputeIsNight(float t)
        {
            var p = t / dayLengthSeconds;
            return p > 0.5f && p < 0.9f;
        }

        public string PhaseName()
        {
            var p = Progress01();
            if (p < 0.22f) return "morning";
            if (p < 0.5f) return "afternoon";
            if (p < 0.62f) return "dusk";
            if (p < 0.9f) return "night";
            return "dawn";
        }

        public void SetFromSave(int day, float timeOfDaySeconds)
        {
            Day = Mathf.Max(1, day);
            TimeOfDay = Mathf.Max(0, timeOfDaySeconds);
            IsNight = ComputeIsNight(TimeOfDay);
        }
    }
}
