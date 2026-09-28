using System;
using UnityEngine;
using Rustgame.Interaction;

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
        [SerializeField] float gatherStaminaCost = 4f; // SURVIVAL_CONFIG.gatherDrain

        int currentHealth;

        public event Action<ResourceNode, string itemId, int amount> OnHarvested;
        public event Action<ResourceNode> OnDepleted;

        public InteractionKind Kind => InteractionKind.Gather;
        public ResourceNodeDefinition Definition => definition;

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

        public string GetPromptText(InteractionContext ctx) => $"[LMB] Gather {definition?.resourceItemId}";

        public bool CanInteract(InteractionContext ctx) => definition != null && currentHealth > 0;

        /// <summary>Called by the player's gather input (LMB/F), not by E — gathering
        /// is a direct-hit action in the original game, not a context-menu one.</summary>
        public bool Interact(InteractionContext ctx)
        {
            if (definition == null || currentHealth <= 0) return false;

            currentHealth -= 1;

            bool correctTool = ToolMatches(ctx.equippedToolId, definition.requiredTool);
            var mult = correctTool ? definition.correctToolMultiplier : 1f;
            var amount = Mathf.RoundToInt(definition.yieldPerHit * mult);
            OnHarvested?.Invoke(this, definition.resourceItemId, amount);

            if (!string.IsNullOrEmpty(definition.bonusResourceId) && definition.bonusYield > 0)
                OnHarvested?.Invoke(this, definition.bonusResourceId, definition.bonusYield);

            if (currentHealth <= 0)
            {
                OnDepleted?.Invoke(this);
                gameObject.SetActive(false);
                var respawnService = Core.ServiceLocator.Get<ResourceRespawnService>();
                respawnService?.Schedule(this, definition, transform.position, transform.rotation);
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
            return required switch
            {
                ToolType.Axe => equippedToolId.Contains("hatchet") || equippedToolId.Contains("axe"),
                ToolType.Pickaxe => equippedToolId.Contains("pickaxe") || equippedToolId.Contains("pick"),
                _ => false,
            };
        }
    }
}
