using System.Collections.Generic;
using UnityEngine;
using Rustgame.Save;

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
    ///
    /// The queue is saved (SaveData.world.respawns) so a node that was depleted
    /// right before the player quit still comes back on the same timer.
    /// </summary>
    public class ResourceRespawnService : MonoBehaviour
    {
        class PendingRespawn
        {
            public ResourceNode node;
            public string nodeType;
            public Vector3 position;
            public Quaternion rotation;
            public float readyAtTime;
        }

        readonly List<PendingRespawn> queue = new List<PendingRespawn>();
        readonly List<ResourceNode> nodes = new List<ResourceNode>();
        readonly List<RespawnEntry> unrestored = new List<RespawnEntry>();

        void Awake() { Core.ServiceLocator.Register(this); }

        void OnDestroy() { Core.ServiceLocator.Unregister<ResourceRespawnService>(); }

        /// <summary>Nodes announce themselves so the service can restore their
        /// pending respawn even if the node was spawned after the save loaded.</summary>
        public void Register(ResourceNode node)
        {
            if (node == null || nodes.Contains(node)) return;
            nodes.Add(node);
            TryApplyUnrestored(node);
        }

        public void Schedule(ResourceNode node, ResourceNodeDefinition definition, Vector3 position, Quaternion rotation)
        {
            if (node == null) return;

            // Same behaviour as js/world/resources.js RespawnManager.schedule():
            // a node is only ever pending once — re-scheduling replaces the
            // old entry instead of queueing a second respawn.
            for (int i = queue.Count - 1; i >= 0; i--)
                if (queue[i].node == node) queue.RemoveAt(i);

            var delay = definition != null && definition.respawnTimeSeconds > 0 ? definition.respawnTimeSeconds : 30f;
            queue.Add(new PendingRespawn
            {
                node = node,
                nodeType = definition != null ? definition.nodeType : null,
                position = position,
                rotation = rotation,
                readyAtTime = Time.time + delay,
            });
        }

        void Update()
        {
            for (int i = queue.Count - 1; i >= 0; i--)
            {
                if (Time.time < queue[i].readyAtTime) continue;
                var node = queue[i].node;
                if (node != null) node.ResetNode();
                queue.RemoveAt(i);
            }
        }

        /// <summary>Snapshot of the queue for the save file.</summary>
        public List<RespawnEntry> CollectPending()
        {
            var result = new List<RespawnEntry>();
            foreach (var pending in queue)
            {
                result.Add(new RespawnEntry
                {
                    nodeType = pending.nodeType,
                    x = pending.position.x,
                    y = pending.position.y,
                    z = pending.position.z,
                    remainingSeconds = Mathf.Max(0f, pending.readyAtTime - Time.time),
                });
            }
            return result;
        }

        /// <summary>Restores the queue from a save file. Entries whose node is
        /// already in the scene are re-armed; entries for nodes that are not
        /// loaded yet stay pending and are applied when the node registers.</summary>
        public void Restore(List<RespawnEntry> entries)
        {
            if (entries == null) return;
            unrestored.Clear();

            foreach (var entry in entries)
            {
                if (entry == null) continue;
                var node = FindNode(entry.nodeType, new Vector3(entry.x, entry.y, entry.z));
                if (node == null)
                {
                    unrestored.Add(entry);
                    continue;
                }

                node.gameObject.SetActive(false);
                queue.Add(new PendingRespawn
                {
                    node = node,
                    nodeType = entry.nodeType,
                    position = new Vector3(entry.x, entry.y, entry.z),
                    rotation = node.transform.rotation,
                    readyAtTime = Time.time + Mathf.Max(0f, entry.remainingSeconds),
                });
            }
        }

        void TryApplyUnrestored(ResourceNode node)
        {
            if (unrestored.Count == 0 || node == null || node.Definition == null) return;

            for (int i = 0; i < unrestored.Count; i++)
            {
                var entry = unrestored[i];
                if (entry == null || entry.nodeType != node.Definition.nodeType) continue;
                if (!SamePosition(entry, node.transform.position)) continue;

                unrestored.RemoveAt(i);
                node.gameObject.SetActive(false);
                queue.Add(new PendingRespawn
                {
                    node = node,
                    nodeType = entry.nodeType,
                    position = node.transform.position,
                    rotation = node.transform.rotation,
                    readyAtTime = Time.time + Mathf.Max(0f, entry.remainingSeconds),
                });
                return;
            }
        }

        static bool SamePosition(RespawnEntry entry, Vector3 position)
        {
            var dx = entry.x - position.x;
            var dy = entry.y - position.y;
            var dz = entry.z - position.z;
            return dx * dx + dy * dy + dz * dz < 0.25f; // 0.5 m tolerance
        }

        ResourceNode FindNode(string nodeType, Vector3 position)
        {
            foreach (var node in nodes)
            {
                if (node == null || node.Definition == null) continue;
                if (node.Definition.nodeType != nodeType) continue;
                if (SamePosition(new RespawnEntry { x = position.x, y = position.y, z = position.z }, node.transform.position))
                    return node;
            }
            return null;
        }

        public int PendingCount { get { return queue.Count; } }
    }
}
