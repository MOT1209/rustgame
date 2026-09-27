namespace Rustgame.Interaction
{
    /// <summary>
    /// Mirrors js/interaction/interaction.js InteractKinds — E does one of these
    /// depending on what the player is looking at; if nothing implements
    /// IInteractable in range, E falls back to opening the inventory panel
    /// (that fallback lives in InteractionController, not here).
    /// </summary>
    public enum InteractionKind { Gather, Storage, Drink, Loot, Door, Cook, PlaceBox, PlaceCampfire }

    public struct InteractionContext
    {
        public UnityEngine.GameObject player;
        public float distance;
        public string equippedToolId;
    }

    public interface IInteractable
    {
        InteractionKind Kind { get; }

        /// <summary>Text shown in the on-screen prompt, e.g. "E — Open storage box".</summary>
        string GetPromptText(InteractionContext ctx);

        bool CanInteract(InteractionContext ctx);

        /// <summary>Perform the interaction. Returns true if it was actually handled.</summary>
        bool Interact(InteractionContext ctx);
    }
}
