using UnityEngine;
using UnityEngine.InputSystem;

namespace Rustgame.Input
{
    /// <summary>
    /// Bridges the "Gameplay" action map (Settings/RustgameControls.inputactions)
    /// to plain C# properties that PlayerController/InteractionController/UI read
    /// — those classes never touch InputAction directly, matching the original's
    /// input abstraction (js/input/input.js InputSystem sitting between raw
    /// events and gameplay). On a device with a TouchInputAdapter present, touch
    /// values are merged in so the same consumer code works on both platforms.
    /// </summary>
    public class PlayerInputReader : MonoBehaviour
    {
        [SerializeField] InputActionAsset actions;
        [SerializeField] TouchInputAdapter touchAdapter;

        InputActionMap gameplay;
        InputAction move, sprint, jump, interact, gather, blueprint, repairUpgrade, bag;
        InputAction[] beltActions = new InputAction[6];

        public Vector2 MoveAxis { get; private set; }
        public bool SprintHeld { get; private set; }
        public bool JumpPressedThisFrame { get; private set; }
        public bool InteractPressedThisFrame { get; private set; }
        public bool GatherHeld { get; private set; }
        public bool BlueprintPressedThisFrame { get; private set; }
        public bool RepairUpgradePressedThisFrame { get; private set; }
        public bool BagPressedThisFrame { get; private set; }
        public int BeltPressedThisFrame { get; private set; } = -1; // 0-5, or -1 if none

        void Awake()
        {
            gameplay = actions.FindActionMap("Gameplay", throwIfNotFound: true);
            move = gameplay.FindAction("Move");
            sprint = gameplay.FindAction("Sprint");
            jump = gameplay.FindAction("Jump");
            interact = gameplay.FindAction("Interact");
            gather = gameplay.FindAction("Gather");
            blueprint = gameplay.FindAction("Blueprint");
            repairUpgrade = gameplay.FindAction("RepairUpgrade");
            bag = gameplay.FindAction("Bag");
            for (int i = 0; i < 6; i++) beltActions[i] = gameplay.FindAction($"Belt{i + 1}");
        }

        void OnEnable() => gameplay.Enable();
        void OnDisable() => gameplay.Disable();

        void Update()
        {
            var keyboardMove = move.ReadValue<Vector2>();
            var touchMove = touchAdapter != null ? touchAdapter.MoveAxis : Vector2.zero;
            MoveAxis = keyboardMove.sqrMagnitude >= touchMove.sqrMagnitude ? keyboardMove : touchMove;

            SprintHeld = sprint.IsPressed() || (touchAdapter != null && touchAdapter.SprintHeld);
            JumpPressedThisFrame = jump.WasPressedThisFrame() || (touchAdapter != null && touchAdapter.ConsumeJumpPressed());
            InteractPressedThisFrame = interact.WasPressedThisFrame() || (touchAdapter != null && touchAdapter.ConsumeInteractPressed());
            GatherHeld = gather.IsPressed() || (touchAdapter != null && touchAdapter.GatherHeld);
            BlueprintPressedThisFrame = blueprint.WasPressedThisFrame();
            RepairUpgradePressedThisFrame = repairUpgrade.WasPressedThisFrame();
            BagPressedThisFrame = bag.WasPressedThisFrame() || (touchAdapter != null && touchAdapter.ConsumeBagPressed());

            BeltPressedThisFrame = -1;
            for (int i = 0; i < 6; i++)
            {
                if (beltActions[i].WasPressedThisFrame()) { BeltPressedThisFrame = i; break; }
            }
        }
    }
}
