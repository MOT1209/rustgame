using UnityEngine;

namespace Rustgame.Interaction
{
    /// <summary>
    /// Verified from game.js: cooking is INSTANT — one E press converts 1
    /// raw_meat to 1 cooked_meat plus a flat +5 temperature bonus. There is no
    /// craft-time delay and no fuel/lit-state requirement in the original game
    /// (an earlier draft of the port plan assumed a 5s cook time — that was
    /// wrong). Keep it instant here too unless you deliberately want to change
    /// this balance for the Unity version.
    /// </summary>
    public class Campfire : MonoBehaviour, IInteractable
    {
        public const float WarmthBonus = 5f;

        public InteractionKind Kind => InteractionKind.Cook;

        public string GetPromptText(InteractionContext ctx) => "[E] Cook raw meat";

        public bool CanInteract(InteractionContext ctx) => true;

        /// <summary>Caller (PlayerInteraction) is responsible for checking the player
        /// has raw_meat, consuming it, granting cooked_meat, and applying the
        /// warmth bonus to SurvivalStats — this class only identifies the
        /// interaction target, matching the original's thin per-kind handlers.</summary>
        public bool Interact(InteractionContext ctx) => true;
    }
}
