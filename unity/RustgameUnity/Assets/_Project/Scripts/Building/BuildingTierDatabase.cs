using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Rustgame.Building
{
    [CreateAssetMenu(menuName = "Rustgame/Building Tier Database", fileName = "BuildingTierDatabase")]
    public class BuildingTierDatabase : ScriptableObject
    {
        public List<BuildingTierDefinition> tiers = new();
        [Tooltip("Verified CONFIG.TC_RADIUS from game.js — BUILDING_SYSTEM.md originally (wrongly) said 20.")]
        public float toolCupboardRadius = 25f;

        Dictionary<BuildingTier, BuildingTierDefinition> lookup;

        public IReadOnlyDictionary<BuildingTier, BuildingTierDefinition> Lookup
        {
            get
            {
                lookup ??= tiers.Where(t => t != null).ToDictionary(t => t.tier, t => t);
                return lookup;
            }
        }

        void OnValidate() => lookup = null;
    }
}
