using UnityEngine;

namespace Rustgame.Player
{
    /// <summary>
    /// CharacterController-based movement. First-person by default — verified
    /// from game.js, which uses Three.js PointerLockControls as the primary
    /// view, with a "third person" toggle that's only a render-time camera
    /// offset trick, not a real third-person rig. Build first-person first;
    /// treat third-person as an optional Phase 2 camera mode, not a parallel
    /// movement system.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        [SerializeField] SurvivalStats stats;
        [SerializeField] SurvivalConfigSO survivalConfig;

        [Header("Movement (Unity-native tuning — game.js's raw PLAYER_SPEED=95 doesn't")]
        [Header("translate 1:1 because its physics loop isn't Unity's; tune these by feel.)")]
        [SerializeField] float walkSpeed = 4.5f;
        [SerializeField] float sprintSpeed = 7.5f;
        [SerializeField] float jumpForce = 5f;
        [SerializeField] float gravity = -20f;

        CharacterController controller;
        Vector3 verticalVelocity;
        bool isFreezingCache;

        public bool IsSprinting { get; private set; }

        void Awake()
        {
            controller = GetComponent<CharacterController>();
        }

        /// <summary>Call from PlayerInput each frame with raw axis + button state.</summary>
        public void Move(Vector2 moveAxis, bool sprintHeld, bool jumpPressed, float dt)
        {
            if (stats.IsDead) return;

            IsSprinting = sprintHeld && moveAxis.sqrMagnitude > 0.01f && StaminaSystem.CanSprint(stats, survivalConfig);
            var speed = IsSprinting ? sprintSpeed : walkSpeed;

            var move = (transform.right * moveAxis.x + transform.forward * moveAxis.y);
            if (move.sqrMagnitude > 1f) move.Normalize();

            if (controller.isGrounded)
            {
                verticalVelocity.y = -0.5f; // small downward force keeps isGrounded stable
                if (jumpPressed && StaminaSystem.CanSprint(stats, survivalConfig))
                {
                    verticalVelocity.y = jumpForce;
                    StaminaSystem.DrainJump(stats, survivalConfig);
                }
            }
            else
            {
                verticalVelocity.y += gravity * dt;
            }

            if (IsSprinting) StaminaSystem.DrainSprint(stats, survivalConfig, dt);
            else StaminaSystem.Regen(stats, survivalConfig, dt, isFreezingCache);

            controller.Move((move * speed + verticalVelocity) * dt);
        }

        /// <summary>Feed the freezing flag from SurvivalStats.Tick's env each frame
        /// (kept separate so PlayerController doesn't need to know about weather/time).</summary>
        public void SetFreezing(bool freezing) => isFreezingCache = freezing;
    }
}
