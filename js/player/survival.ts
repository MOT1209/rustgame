// ============================================================
// RUSTGAME — Phase 1: Central Survival System
// One tick() drives hunger, thirst, temperature, radiation,
// bleeding and natural regen. All HP changes go through
// DamageSystem. Returns event list for UI/sound hooks.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

import { SURVIVAL_CONFIG } from '../core/config.ts';
import { DamageSystem, DamageTypes } from './damage.ts';
import type {
    HungerState,
    PlayerStats,
    SurvivalEnv,
    SurvivalEvent,
    SurvivalTickResult,
    ThirstState,
} from '../types/game.ts';

const C = SURVIVAL_CONFIG;

export function hungerState(value: number): HungerState {
    if (value <= 0) return 'critical';
    if (value > C.hungerStates.normal) return 'normal';
    if (value > C.hungerStates.hungry) return 'hungry';
    return 'starving';
}

export function thirstState(value: number): ThirstState {
    if (value <= 0) return 'critical';
    if (value > C.thirstStates.normal) return 'normal';
    if (value > C.thirstStates.thirsty) return 'thirsty';
    return 'dehydrated';
}

function num(v: unknown, fallback: number): number {
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
}

export const SurvivalSystem = {
    /** Ensure all Phase-1 stat fields exist (save-migration friendly). */
    normalize(stats: PlayerStats): PlayerStats {
        stats.health = num(stats.health, C.maxHealth);
        stats.hunger = num(stats.hunger, C.hungerStart);
        stats.thirst = num(stats.thirst, C.thirstStart);
        stats.stamina = num(stats.stamina, C.staminaStart);
        stats.temperature = num(stats.temperature, C.tempStart);
        stats.radiation = num(stats.radiation, 0);
        stats.bleeding = num(stats.bleeding, 0);
        stats.maxHealth = num(stats.maxHealth, C.maxHealth);
        stats.health = Math.max(0, Math.min(stats.maxHealth ?? C.maxHealth, stats.health));
        stats.hunger = Math.max(0, Math.min(C.maxHunger, stats.hunger));
        stats.thirst = Math.max(0, Math.min(C.maxThirst, stats.thirst));
        stats.stamina = Math.max(0, Math.min(C.maxStamina, stats.stamina));
        stats.temperature = Math.max(0, Math.min(C.maxTemperature, stats.temperature));
        stats.radiation = Math.max(0, Math.min(C.maxRadiation, stats.radiation));
        return stats;
    },

    /**
     * Advance survival simulation by dt seconds.
     * env: { sprinting, inRadiation, isNight, isRaining, nearFire, inWater }
     * Returns: { events: [{type, ...}], hungerState, thirstState, freezing }
     */
    tick(stats: PlayerStats, dt: number, env: SurvivalEnv = {}): SurvivalTickResult {
        this.normalize(stats);
        if (!(dt > 0)) dt = 0;
        const events: SurvivalEvent[] = [];
        const prevHunger = hungerState(stats.hunger);
        const prevThirst = thirstState(stats.thirst);

        // ---- Hunger drain ----
        let hungerRate = C.hungerDrain;
        if (env.sprinting) hungerRate = C.hungerDrainSprint;
        const freezing = stats.temperature <= C.freezingThreshold;
        if (freezing) hungerRate = Math.max(hungerRate, C.hungerDrainCold);
        stats.hunger = Math.max(0, stats.hunger - hungerRate * dt);

        // ---- Thirst drain (faster than hunger) ----
        const thirstRate = env.sprinting ? C.thirstDrainSprint : C.thirstDrain;
        stats.thirst = Math.max(0, stats.thirst - thirstRate * dt);

        // ---- Temperature ----
        if (env.nearFire) {
            stats.temperature = Math.min(C.maxTemperature, stats.temperature + C.campfireWarmRate * dt);
        } else if (env.isRaining) {
            stats.temperature = Math.max(0, stats.temperature - C.tempRainDrain * dt);
        } else if (env.isNight) {
            stats.temperature = Math.max(0, stats.temperature - C.tempNightDrain * dt);
        } else {
            stats.temperature = Math.min(C.maxTemperature, stats.temperature + C.tempDayRate * dt);
        }
        if (env.inWater) {
            stats.temperature = Math.max(0, stats.temperature - C.tempColdWaterDrain * dt);
        }

        // ---- Radiation ----
        if (env.inRadiation) {
            stats.radiation = Math.min(C.maxRadiation, stats.radiation + C.radGainInZone * dt);
        } else {
            stats.radiation = Math.max(0, stats.radiation - C.radDecay * dt);
        }

        // ---- Damage sources (centralized) ----
        if (stats.hunger <= 0) {
            DamageSystem.applyDamage(stats, C.starvationDamage * dt, DamageTypes.HUNGER);
        }
        if (stats.thirst <= 0) {
            DamageSystem.applyDamage(stats, C.dehydrationDamage * dt, DamageTypes.THIRST);
        }
        if (stats.radiation >= C.radLethalAt) {
            DamageSystem.applyDamage(stats, C.radDamage * dt, DamageTypes.RADIATION);
        }
        if (stats.temperature <= C.criticalThreshold) {
            DamageSystem.applyDamage(stats, C.freezingDamage * dt, DamageTypes.COLD);
        }
        if (stats.bleeding > 0) {
            DamageSystem.applyDamage(stats, C.bleedDamage * stats.bleeding * dt, DamageTypes.BLEEDING);
        }

        // ---- Natural regen (well-fed only) ----
        if (stats.hunger >= C.regenHungerMin && stats.thirst >= C.regenThirstMin
            && stats.health > 0 && stats.health < (stats.maxHealth ?? C.maxHealth)) {
            DamageSystem.heal(stats, C.naturalRegen * dt);
        }

        // ---- State-change events (for notifications, throttled by caller) ----
        const hState = hungerState(stats.hunger);
        const tState = thirstState(stats.thirst);
        if (hState !== prevHunger) events.push({ type: 'hunger', from: prevHunger, to: hState });
        if (tState !== prevThirst) events.push({ type: 'thirst', from: prevThirst, to: tState });

        return { events, hungerState: hState, thirstState: tState, freezing };
    },
};
