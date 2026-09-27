using UnityEngine;
using Rustgame.Inventory;

namespace Rustgame.Interaction
{
    /// <summary>
    /// Wooden Storage Box. Verified: 12-stack limit exists as advertised text
    /// in the original game but was never actually enforced by StorageInventory
    /// (only a UI-level check) — that gap was closed in the JS codebase and is
    /// built correctly here from the start via InventorySystem's maxSlots.
    /// </summary>
    public class StorageBox : MonoBehaviour, IInteractable
    {
        public const int Slots = 12;

        InventorySystem inventory;
        System.Func<string, int> stackLimitLookup;
        System.Func<string, bool> isKnownItem;

        public InventorySystem Inventory => inventory;

        public InteractionKind Kind => InteractionKind.Storage;

        public void Initialize(System.Func<string, int> stackLimitLookup, System.Func<string, bool> isKnownItem)
        {
            this.stackLimitLookup = stackLimitLookup;
            this.isKnownItem = isKnownItem;
            inventory = new InventorySystem(stackLimitLookup, isKnownItem, Slots);
        }

        public string GetPromptText(InteractionContext ctx) => "[E] Open storage box";

        public bool CanInteract(InteractionContext ctx) => inventory != null;

        public bool Interact(InteractionContext ctx)
        {
            // Actual panel-open call wires into UI/StoragePanel once that exists;
            // this just confirms the box is a valid interaction target.
            return inventory != null;
        }
    }
}
