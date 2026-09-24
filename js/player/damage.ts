// ============================================================
// RUSTGAME — Phase 1: Central Damage System
// ALL health modification MUST go through DamageSystem.
// No system is allowed to touch stats.health directly.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

import type { DamageableStats, DamageType } from '../types/game.ts';

export const DamageTypes = {
    GENERIC: 'generic',
    FALL: 'fall',
    ANIMAL: 'animal',
    ENVIRONMENT: 'environment',
    HUNGER: 'hunger',
    THIRST: 'thirst',
    RADIATION: 'radiation',
    COLD: 'cold',
    BLEEDING: 'bleeding',
} as const satisfies Record<string, DamageType>;

function isValidStats(stats: unknown): stats is DamageableStats {
    return !!stats && typeof stats === 'object' && typeof (stats as DamageableStats).health === 'number';
}

export const DamageSystem = {
    types: DamageTypes,

    /**
     * Apply damage to a stats object. Returns actual damage dealt.
     * stats: { health, maxHealth? } - maxHealth optional (defaults 100).
     * Never lets health drop below 0 or exceed max via damage.
     */
    applyDamage(stats: unknown, amount: number, type: DamageType = DamageTypes.GENERIC): number {
        if (!isValidStats(stats)) return 0;
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return 0;
        const before = stats.health;
        stats.health = Math.max(0, before - amount);
        stats.lastDamageType = type;
        stats.lastDamageAt = Date.now();
        return before - stats.health;
    },

    /**
     * Heal a stats object. Returns actual amount healed.
     * Healing never exceeds maxHealth (defaults 100).
     */
    heal(stats: unknown, amount: number): number {
        if (!isValidStats(stats)) return 0;
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return 0;
        const max = typeof stats.maxHealth === 'number' ? stats.maxHealth : 100;
        const before = stats.health;
        stats.health = Math.min(max, before + amount);
        return stats.health - before;
    },

    isDead(stats: unknown): boolean {
        return isValidStats(stats) && stats.health <= 0;
    },
};
