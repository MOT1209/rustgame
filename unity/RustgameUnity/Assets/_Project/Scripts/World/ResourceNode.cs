using System;
using UnityEngine;
using Rustgame.Core;
using Rustgame.Interaction;
using Rustgame.Player;

namespace Rustgame.World
{
    /// <summary>
    /// A gatherable node in the world. Port of the gather-hit logic in game.js
    /// (verified): each hit reduces health by exactly 1 regardless of tool;
    /// yield per hit is doubled when the equipped tool matches requiredTool;
    /// depleting the node schedules a respawn via ResourceRespawnService.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public class ResourceNode : MonoBehaviour, IInteractable
    {
        [SerializeField] ResourceNodeDefinition definition;

        int currentHealth;

        /// <summary>Local hook for VFX/audio on a hit. Items are NOT credited
        /// through this event — that goes through GameEvents.ItemGained so
        /// exactly one system (the player's inventory) adds them.</summary>
        public event Action<ResourceNode, string, int> OnHarvested;

        /// <summary>Raised once when the node runs out of hits.</summary>
        public event Action<ResourceNode> OnDepleted;

        public InteractionKind Kind { get { return InteractionKind.Gather; } }
        public ResourceNodeDefinition Definition { get { return definition; } }
        public bool IsDepleted { get { return currentHealth <= 0; } }

        /// <summary>Assign the definition and reset health. Called automatically
        /// from Awake when definition is set in the Inspector; exposed publicly
        /// for procedural spawning and EditMode tests.</summary>
        public void Configure(ResourceNodeDefinition def)
        {
            definition = def;
            currentHealth = definition != null ? definition.nodeHealth : 1;
        }

        void Awake()
        {
            currentHealth = definition != null ? definition.nodeHealth : 1;
        }

        void Start()
        {
            // Announce to the respawn service so a save that had this node
            // pending can re-arm it (Start runs after every Awake, so the
            // service is registered by then).
            var service = Core.ServiceLocator.Get<ResourceRespawnService>();
            if (service != null) service.Register(this);
        }

        public string GetPromptText(InteractionContext ctx)
        {
            return definition == null ? "[LMB] Gather" : "[LMB] Gather " + definition.resourceItemId;
        }

        public bool CanInteract(InteractionContext ctx) { return definition != null && currentHealth > 0; }

        /// <summary>Called by the player's gather input (LMB), not by E — gathering
        /// is a direct-hit action in the original game, not a context-menu one.</summary>
        public bool Interact(InteractionContext ctx)
        {
            if (definition == null || currentHealth <= 0) return false;

            currentHealth -= 1;

            bool correctTool = ToolMatches(ctx.equippedToolId, definition.requiredTool);
            var mult = correctTool ? definition.correctToolMultiplier : 1f;
            var amount = Mathf.RoundToInt(definition.yieldPerHit * mult);

            if (OnHarvested != null) OnHarvested(this, definition.resourceItemId, amount);
            GameEvents.RaiseItemGained(definition.resourceItemId, amount);

            // Bonus resources (barrel → lgf) drop regardless of the tool, same
            // as yieldForHit() in js/world/resources.js.
            if (!string.IsNullOrEmpty(definition.bonusResourceId) && definition.bonusYield > 0)
            {
                if (OnHarvested != null) OnHarvested(this, definition.bonusResourceId, definition.bonusYield);
                GameEvents.RaiseItemGained(definition.bonusResourceId, definition.bonusYield);
            }

            // Gathering costs stamina (SURVIVAL_CONFIG.gatherDrain = 4).
            var stats = ctx.player != null ? ctx.player.GetComponent<SurvivalStats>() : null;
            if (stats != null && stats.Config != null)
                StaminaSystem.DrainGather(stats, stats.Config);

            if (currentHealth <= 0)
            {
                if (OnDepleted != null) OnDepleted(this);
                gameObject.SetActive(false);
                var respawnService = Core.ServiceLocator.Get<ResourceRespawnService>();
                if (respawnService != null)
                    respawnService.Schedule(this, definition, transform.position, transform.rotation);
                else
                    Debug.LogWarning("[ResourceNode] No ResourceRespawnService registered — this node will never come back.");
            }
            return true;
        }

        /// <summary>Reset for respawn (called by ResourceRespawnService).</summary>
        public void ResetNode()
        {
            currentHealth = definition != null ? definition.nodeHealth : 1;
            gameObject.SetActive(true);
        }

        static bool ToolMatches(string equippedToolId, ToolType required)
        {
            if (required == ToolType.Any || required == ToolType.Hand) return false; // no bonus possible/needed
            if (string.IsNullOrEmpty(equippedToolId)) return false;
            switch (required)
            {
                case ToolType.Axe:
                    // "stone_pickaxe".Contains("axe") is true, so a plain Contains
                    // check would hand a pickaxe the axe bonus (the JS original
                    // has that quirk). Match the axe ids precisely instead.
                    return equippedToolId.Contains("hatchet") || equippedToolId.EndsWith("_axe");
                case ToolType.Pickaxe:
                    return equippedToolId.Contains("pickaxe");
                default:
                    return false;
            }
        }
    }
}
