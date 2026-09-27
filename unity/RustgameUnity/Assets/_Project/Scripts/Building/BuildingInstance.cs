using UnityEngine;
using Rustgame.Interaction;

namespace Rustgame.Building
{
    public enum BuildingType { Foundation, Wall, Doorway, Ceiling, ToolCupboard, WoodenDoor }

    /// <summary>
    /// A placed structure. IInteractable only for the Door case (open/close on
    /// E) — verified in game.js that upgrade/repair go through H (a separate
    /// binding) rather than the E interaction system, and gathering/combat use
    /// LMB, not E.
    /// </summary>
    public class BuildingInstance : MonoBehaviour, IInteractable
    {
        [SerializeField] BuildingType buildType;
        [SerializeField] BuildingTierDefinition currentTierDef;
        [SerializeField] float health;
        [SerializeField] bool isOpen;
        [Tooltip("Tool Cupboard only — verified radius is 25, not 20 (BUILDING_SYSTEM.md had this wrong).")]
        [SerializeField] float toolCupboardRadius = 25f;

        public BuildingType BuildType => buildType;
        public BuildingTierDefinition CurrentTier => currentTierDef;
        public float Health => health;
        public float MaxHealth => currentTierDef != null ? currentTierDef.maxHealth : 0f;
        public bool IsOpen => isOpen;
        public float ToolCupboardRadius => toolCupboardRadius;

        public InteractionKind Kind => InteractionKind.Door;

        public void Initialize(BuildingType type, BuildingTierDefinition tierDef)
        {
            buildType = type;
            currentTierDef = tierDef;
            health = tierDef != null ? tierDef.maxHealth : 0f;
            isOpen = false;
        }

        public void SetTier(BuildingTierDefinition tierDef)
        {
            currentTierDef = tierDef;
            health = tierDef.maxHealth;
        }

        public void Repair(float amount) => health = Mathf.Min(MaxHealth, health + amount);

        public string GetPromptText(InteractionContext ctx) => isOpen ? "[E] Close door" : "[E] Open door";

        public bool CanInteract(InteractionContext ctx) => buildType == BuildingType.WoodenDoor;

        public bool Interact(InteractionContext ctx)
        {
            if (buildType != BuildingType.WoodenDoor) return false;
            isOpen = !isOpen;
            transform.rotation = Quaternion.Euler(0, isOpen ? 90f : 0f, 0);
            return true;
        }
    }
}
