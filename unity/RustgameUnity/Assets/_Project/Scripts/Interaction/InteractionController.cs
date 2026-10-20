using System;
using UnityEngine;
using Rustgame.Core;

namespace Rustgame.Interaction
{
    /// <summary>
    /// Raycasts from the camera each frame, finds the nearest IInteractable
    /// within range, shows its prompt, and fires Interact() on E. Mirrors
    /// game.js's raycast-driven E handling (verified: INTERACT_DISTANCE = 5.0).
    /// If nothing interactable is hit, E falls back to toggling the inventory
    /// panel — that's the one piece of behavior this controller does NOT own
    /// (the caller raises GameEvents.OpenInventoryRequested instead, since this
    /// class has no UI dependency).
    /// </summary>
    public class InteractionController : MonoBehaviour
    {
        [SerializeField] Camera raycastCamera;
        [SerializeField] float interactDistance = 5.0f; // CONFIG.INTERACT_DISTANCE in game.js
        [SerializeField] LayerMask interactableMask = ~0;

        IInteractable current;
        InteractionContext currentCtx;

        public IInteractable Current { get { return current; } }
        public string CurrentPrompt { get { return current != null ? current.GetPromptText(currentCtx) : null; } }

        void Reset()
        {
            raycastCamera = Camera.main;
        }

        void Update()
        {
            UpdateLookTarget();
        }

        void UpdateLookTarget()
        {
            current = null;
            if (raycastCamera == null) return;

            var ray = raycastCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f));
            if (!Physics.Raycast(ray, out var hit, interactDistance, interactableMask)) return;

            var interactable = hit.collider.GetComponentInParent<IInteractable>();
            if (interactable == null) return;

            var gm = ServiceLocator.Get<GameManager>();

            var ctx = new InteractionContext
            {
                player = raycastCamera.transform.root.gameObject,
                distance = hit.distance,
                // The equipped tool used to be hardcoded to null, which silently
                // killed the ×2 correct-tool gather bonus for every node.
                equippedToolId = gm != null ? gm.EquippedToolId : null,
            };

            if (!interactable.CanInteract(ctx)) return;

            current = interactable;
            currentCtx = ctx;
        }

        /// <summary>Call from the player's interaction action. Returns true if
        /// something was actually interacted with (the caller opens the
        /// inventory on false). The optional filter lets the caller route by
        /// kind — E handles context interactions, LMB handles gathering.</summary>
        public bool TryInteract(Func<InteractionKind, bool> filter = null)
        {
            if (current == null) return false;
            if (filter != null && !filter(current.Kind)) return false;
            return current.Interact(currentCtx);
        }
    }
}
