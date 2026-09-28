using UnityEngine;
using UnityEngine.AI;
using Rustgame.Player;

namespace Rustgame.Combat
{
    /// <summary>
    /// Behavior stats (health/damage/ranges/cooldown) are a verified port of
    /// game.js's NPC class. Movement is a DELIBERATE improvement over the
    /// original, not a literal port: the web game moves enemies in a straight
    /// line directly at the player (`position.addScaledVector(dir, speed *
    /// delta)`) with no obstacle avoidance. This version uses a real
    /// NavMeshAgent instead, so enemies path around obstacles.
    ///
    /// Requires: NavMesh baked in the scene (Window > AI > Navigation > Bake) —
    /// that's a manual Editor step, not something this script can do.
    /// </summary>
    [RequireComponent(typeof(NavMeshAgent))]
    public class EnemyAI : MonoBehaviour
    {
        [SerializeField] EnemyDefinition definition;

        NavMeshAgent agent;
        float health;
        float lastAttackTime = -999f;
        bool dead;

        public event System.Action<EnemyAI> OnDied;

        void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            health = definition != null ? definition.maxHealth : 1f;
            if (definition != null) agent.speed = definition.moveSpeed;
        }

        public void TakeDamage(float amount)
        {
            if (dead) return;
            health -= amount;
            if (health <= 0) Die();
        }

        void Die()
        {
            dead = true;
            agent.isStopped = true;
            OnDied?.Invoke(this);
        }

        /// <summary>Call every frame with the player transform.</summary>
        public void Tick(Transform player, SurvivalStats playerStats)
        {
            if (dead || definition == null || player == null) return;

            var dist = Vector3.Distance(transform.position, player.position);
            if (dist >= definition.agroRange) return;

            if (dist > definition.attackRange)
            {
                agent.isStopped = false;
                agent.SetDestination(player.position);
                return;
            }

            agent.isStopped = true;
            transform.LookAt(new Vector3(player.position.x, transform.position.y, player.position.z));

            if (Time.time - lastAttackTime < definition.attackCooldownSeconds) return;
            lastAttackTime = Time.time;

            if (playerStats == null) return;
            Rustgame.Player.DamageSystem.ApplyDamage(playerStats, definition.damage, DamageType.Animal);
            if (definition.bleedChance > 0f && Random.value < definition.bleedChance)
                playerStats.Bleeding = 1f;
        }
    }
}
