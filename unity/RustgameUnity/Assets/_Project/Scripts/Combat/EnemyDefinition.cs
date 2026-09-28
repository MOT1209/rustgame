using System.Collections.Generic;
using UnityEngine;
using Rustgame.Inventory;

namespace Rustgame.Combat
{
    /// <summary>
    /// Numbers verified from game.js class NPC (constructor + update()):
    /// health, damage, agro/attack range, attack cooldown and loot all copied
    /// exactly. bleedChance is 0.25 for wolf/bear and 0 for scientist in the
    /// original (`if (this.type !== 'scientist' && Math.random() < 0.25)`).
    /// </summary>
    [CreateAssetMenu(menuName = "Rustgame/Enemy Definition", fileName = "Enemy_")]
    public class EnemyDefinition : ScriptableObject
    {
        public string enemyType; // wolf, bear, scientist
        public float maxHealth;
        public float damage;
        public float agroRange;
        public float attackRange;
        public float attackCooldownSeconds;
        public float moveSpeed;
        [Range(0f, 1f)] public float bleedChance;
        public List<ItemStack> lootTable = new();
    }
}
