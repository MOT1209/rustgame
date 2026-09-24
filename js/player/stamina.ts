// ============================================================
// RUSTGAME — Phase 1: Stamina System
// Pure module: operates on a stats object { stamina }.
// ============================================================

import { SURVIVAL_CONFIG } from '../core/config.ts';
import type { StaminaStats } from '../types/game.ts';

const C = SURVIVAL_CONFIG;

export const StaminaSystem = {
    /** Clamp helper - keeps stamina within [0, max]. */
    clamp(stats: StaminaStats): number {
        const max = C.maxStamina;
        if (typeof stats.stamina !== 'number' || !isFinite(stats.stamina)) stats.stamina = C.staminaStart;
        stats.stamina = Math.max(0, Math.min(max, stats.stamina));
        return stats.stamina;
    },

    canSprint(stats: StaminaStats): boolean {
        return this.clamp(stats) >= C.minimumSprintStamina;
    },

    drainSprint(stats: StaminaStats, dt: number): number {
        stats.stamina = Math.max(0, (stats.stamina || 0) - C.sprintDrain * dt);
        return stats.stamina;
    },

    drainJump(stats: StaminaStats): number {
        stats.stamina = Math.max(0, (stats.stamina || 0) - C.jumpDrain);
        return stats.stamina;
    },

    drainGather(stats: StaminaStats): number {
        stats.stamina = Math.max(0, (stats.stamina || 0) - C.gatherDrain);
        return stats.stamina;
    },

    /**
     * Regenerate stamina. opts: { freezing: bool, moving: bool }
     * No regen while sprinting (caller passes sprinting flag).
     */
    regen(stats: StaminaStats, dt: number, opts: { freezing?: boolean; sprinting?: boolean } = {}): number {
        if (opts.sprinting) return stats.stamina;
        const rate = opts.freezing ? C.regenRateCold : C.regenRate;
        stats.stamina = Math.min(C.maxStamina, (stats.stamina || 0) + rate * dt);
        return stats.stamina;
    },

    /**
     * Full per-tick update. Returns { sprinting } after enforcing the lockout:
     * if stamina hits 0 while sprinting, sprinting is force-stopped.
     */
    update(
        stats: StaminaStats,
        dt: number,
        intent?: { wantSprint?: boolean; didJump?: boolean; didGather?: boolean; freezing?: boolean },
    ): { sprinting: boolean } {
        // intent: { wantSprint, didJump, didGather, freezing }
        let sprinting = !!(intent && intent.wantSprint && this.canSprint(stats));
        if (sprinting) this.drainSprint(stats, dt);
        else this.regen(stats, dt, { freezing: !!(intent && intent.freezing), sprinting: false });
        if (intent && intent.didJump) this.drainJump(stats);
        if (intent && intent.didGather) this.drainGather(stats);
        if (stats.stamina <= 0) sprinting = false;
        return { sprinting };
    },
};
