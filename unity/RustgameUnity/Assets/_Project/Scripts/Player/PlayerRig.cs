using UnityEngine;
using Rustgame.Core;
using Rustgame.Interaction;

namespace Rustgame.Player
{
    /// <summary>
    /// Bootstrap input glue for the first playable scene — reads raw
    /// keyboard/mouse each frame and drives PlayerController.Move,
    /// SurvivalStats.Tick and InteractionController.TryInteract. This is
    /// deliberately temporary: once a real Input Action asset lands (see
    /// docs/UNITY_PORT_PLAN.md) this should be replaced, not extended.
    ///
    /// Key mapping follows the original game (verified in game.js):
    ///   E      → context interaction (storage / door / cook) and, when nothing
    ///            is in range, opens the inventory panel
    ///   LMB    → gather (direct hit on a resource node)
    /// </summary>
    [RequireComponent(typeof(PlayerController), typeof(SurvivalStats))]
    public class PlayerRig : MonoBehaviour
    {
        [SerializeField] PlayerController controller;
        [SerializeField] SurvivalStats stats;
        [SerializeField] Rustgame.Interaction.InteractionController interaction;
        [SerializeField] Transform cameraPivot;
        [SerializeField] float mouseSensitivity = 2f;
        [SerializeField] bool showDebugHud = true;

        float pitch;

        void Reset()
        {
            controller = GetComponent<PlayerController>();
            stats = GetComponent<SurvivalStats>();
            interaction = GetComponent<Rustgame.Interaction.InteractionController>();
        }

        void Start()
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        void Update()
        {
            if (UnityEngine.Input.GetKeyDown(KeyCode.Escape))
            {
                var locking = Cursor.lockState != CursorLockMode.Locked;
                Cursor.lockState = locking ? CursorLockMode.Locked : CursorLockMode.None;
                Cursor.visible = !locking;
            }

            if (Cursor.lockState == CursorLockMode.Locked)
                Look();

            var move = new Vector2(UnityEngine.Input.GetAxisRaw("Horizontal"), UnityEngine.Input.GetAxisRaw("Vertical"));
            var sprint = UnityEngine.Input.GetKey(KeyCode.LeftShift);
            var jump = UnityEngine.Input.GetButtonDown("Jump");
            controller.Move(move, sprint, jump, Time.deltaTime);

            stats.Tick(Time.deltaTime, new SurvivalEnv { sprinting = controller.IsSprinting });
            controller.SetFreezing(stats.IsFreezing);

            if (UnityEngine.Input.GetKeyDown(KeyCode.E))
            {
                // E never gathers — gathering is a direct hit (LMB).
                var handled = interaction != null && interaction.TryInteract(kind => kind != InteractionKind.Gather);
                if (!handled) GameEvents.RaiseOpenInventoryRequested();
            }

            if (UnityEngine.Input.GetMouseButtonDown(0))
            {
                if (interaction != null) interaction.TryInteract(kind => kind == InteractionKind.Gather);
            }

            if (stats.IsDead && UnityEngine.Input.GetKeyDown(KeyCode.R)) stats.Revive();
        }

        void Look()
        {
            var mx = UnityEngine.Input.GetAxis("Mouse X") * mouseSensitivity;
            var my = UnityEngine.Input.GetAxis("Mouse Y") * mouseSensitivity;
            transform.Rotate(Vector3.up * mx);
            pitch = Mathf.Clamp(pitch - my, -80f, 80f);
            if (cameraPivot != null) cameraPivot.localEulerAngles = new Vector3(pitch, 0, 0);
        }

        void OnGUI()
        {
            if (!showDebugHud) return;
            GUI.Label(new Rect(10, 10, 700, 20),
                $"HP {stats.Health:0} | Hunger {stats.Hunger:0} | Thirst {stats.Thirst:0} | Stamina {stats.Stamina:0}");
            if (interaction != null && interaction.CurrentPrompt != null)
                GUI.Label(new Rect(10, 30, 700, 20), interaction.CurrentPrompt);
            if (stats.IsDead)
                GUI.Label(new Rect(10, 50, 700, 20), "You died — press R to revive");
            else
                GUI.Label(new Rect(10, 70, 700, 20), "WASD move, Shift sprint, Space jump, mouse look, LMB gather, E interact, Esc unlock cursor");
        }
    }
}
