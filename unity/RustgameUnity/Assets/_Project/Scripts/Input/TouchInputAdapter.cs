using UnityEngine;

namespace Rustgame.Input
{
    /// <summary>
    /// Mobile control surface: a virtual joystick (left) + action buttons
    /// (right) — matches the original's mobile scheme in README.md ("WASD
    /// move · Shift sprint · Space jump · LMB/F gather · E context interact").
    /// This class only exposes plain state that UI button OnPointerDown/Up
    /// callbacks set; it has no dependency on the Input System package, so it
    /// works even on builds where touch controls are the only input.
    /// Wire this to actual on-screen UI elements once the touch Canvas exists
    /// (see SceneBootstrapper) — the button/joystick prefabs themselves aren't
    /// something a hand-written script can safely stand in for; the important
    /// part built here is the C# contract everything else reads from.
    /// </summary>
    public class TouchInputAdapter : MonoBehaviour
    {
        public Vector2 MoveAxis { get; private set; }
        public bool SprintHeld { get; private set; }
        public bool GatherHeld { get; private set; }

        bool jumpPressed, interactPressed, bagPressed;

        // ---- called by the virtual joystick UI ----
        public void SetMoveAxis(Vector2 axis) => MoveAxis = Vector2.ClampMagnitude(axis, 1f);

        // ---- called by on-screen button OnPointerDown/OnPointerUp ----
        public void SetSprintHeld(bool held) => SprintHeld = held;
        public void SetGatherHeld(bool held) => GatherHeld = held;
        public void PressJump() => jumpPressed = true;
        public void PressInteract() => interactPressed = true;
        public void PressBag() => bagPressed = true;

        // ---- consumed once per frame by PlayerInputReader, same WasPressedThisFrame semantics ----
        public bool ConsumeJumpPressed() { var v = jumpPressed; jumpPressed = false; return v; }
        public bool ConsumeInteractPressed() { var v = interactPressed; interactPressed = false; return v; }
        public bool ConsumeBagPressed() { var v = bagPressed; bagPressed = false; return v; }
    }
}
