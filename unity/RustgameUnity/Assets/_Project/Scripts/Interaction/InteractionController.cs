using UnityEngine;

namespace Rustgame.Interaction
{
    /// <summary>
    /// Raycasts from the camera each frame, finds the nearest IInteractable
    /// within range, shows its prompt, and fires Interact() on E. Mirrors
    /// game.js's raycast-driven E handling (verified: INTERACT_DISTANCE = 5.0).
    /// If nothing interactable is hit, E falls back to toggling the inventory
    /// panel — that's the one piece of behavior this controller does NOT own
    /// (wire it from PlayerInput/UI, since this class has no UI dependency).
    /// </summary>
    public class InteractionController : MonoBehaviour
    {
        [SerializeField] Camera raycastCamera;
        [SerializeField] float interactDistance = 5.0f; // CONFIG.INTERACT_DISTANCE in game.js
        [SerializeField] LayerMask interactableMask = ~0;

        IInteractable current;
        InteractionContext currentCtx;

        public IInteractable Current => current;
        public string CurrentPrompt => current != null ? current.GetPromptText(currentCtx) : null;

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

            var ctx = new InteractionContext
            {
                player = raycastCamera.transform.root.gameObject,
                distance = hit.distance,
                equippedToolId = null, // wire to the belt's active slot once InventorySystem is hooked up
            };

            if (!interactable.CanInteract(ctx)) return;

            current = interactable;
            currentCtx = ctx;
        }

        /// <summary>Call from PlayerInput's Interact action. Returns true if something
        /// was actually interacted with (caller opens inventory on false).</summary>
        public bool TryInteract()
        {
            if (current == null) return false;
            return current.Interact(currentCtx);
        }
    }
}
