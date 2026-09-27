using UnityEngine;

namespace Rustgame.World
{
    public enum ToolType { None, Hand, Axe, Pickaxe, Any }

    /// <summary>
    /// Numbers copied verbatim from js/world/resources.js NODE_TYPES (verified
    /// against the live game). nodeHealth is the fixed number of hits needed to
    /// deplete the node regardless of tool — game.js does `node.health -= 1` per
    /// hit no matter what's equipped. The correct tool doubles yieldPerHit
    /// instead (verified in resources.js hitsForYield/yieldForHit).
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Resource Node Definition", fileName = "Node_")]
    public class ResourceNodeDefinition : ScriptableObject
    {
        public string nodeType;
        public string resourceItemId;
        [Min(1)] public int nodeHealth;
        [Min(0)] public int yieldPerHit;
        public float respawnTimeSeconds;
        public ToolType requiredTool;
        [Tooltip("2x in the original game for every node type when the equipped tool matches requiredTool.")]
        public float correctToolMultiplier = 2f;
        [Tooltip("Barrel only: also yields this many of bonusResourceId per hit (lgf:2 in the original).")]
        public string bonusResourceId;
        public int bonusYield;
    }
}
