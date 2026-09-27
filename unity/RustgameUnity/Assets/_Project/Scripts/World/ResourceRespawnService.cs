using System.Collections.Generic;
using UnityEngine;

namespace Rustgame.World
{
    /// <summary>
    /// Central respawn queue for depleted resource nodes — port of
    /// RespawnManager in js/world/resources.js. Every node type respawns after
    /// its own respawnTimeSeconds; there is deliberately no per-type exclusion
    /// list here, unlike the original web build where hemp/berry_bush were
    /// accidentally left out of the respawn whitelist despite having
    /// respawnTimeSeconds defined. That was a bug there (fixed in the JS
    /// codebase too) — don't reintroduce it in Unity.
    /// </summary>
    public class ResourceRespawnService : MonoBehaviour
    {
        struct PendingRespawn
        {
            public ResourceNode node;
            public float readyAtTime;
        }

        readonly List<PendingRespawn> queue = new();

        void Awake() => Core.ServiceLocator.Register(this);

        public void Schedule(ResourceNode node, ResourceNodeDefinition definition, Vector3 position, Quaternion rotation)
        {
            var delay = definition != null && definition.respawnTimeSeconds > 0 ? definition.respawnTimeSeconds : 30f;
            queue.Add(new PendingRespawn { node = node, readyAtTime = Time.time + delay });
        }

        void Update()
        {
            for (int i = queue.Count - 1; i >= 0; i--)
            {
                if (Time.time < queue[i].readyAtTime) continue;
                queue[i].node.ResetNode();
                queue.RemoveAt(i);
            }
        }

        public int PendingCount => queue.Count;
    }
}
