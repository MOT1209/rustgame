// ============================================================
// RUSTGAME — Phase 1: Central Survival Configuration
// Single source of truth for ALL gameplay tuning values.
// Gameplay code must read from here, never hardcode numbers.
// ============================================================

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'rust_survival_save';

export const SURVIVAL_CONFIG = {
    // ---- Vitals ----
    maxHealth: 100,
    maxHunger: 100,
    maxThirst: 100,
    maxStamina: 100,
    maxTemperature: 100,
    maxRadiation: 100,

    // ---- Hunger ----
    hungerStart: 100,
    hungerDrain: 0.05,          // per second (walking)
    hungerDrainSprint: 0.09,    // per second (sprinting)
    hungerDrainCold: 0.08,      // per second when freezing
    // State bands (lower bounds): value > normal => normal, > hungry => hungry,
    // > 0 => starving, 0 => critical. Spec ranges: 100-60 / 59-30 / 29-1 / 0.
    hungerStates: { normal: 60, hungry: 30 },
    starvationDamage: 2.0,      // HP per second at hunger == 0

    // ---- Thirst (drains faster than hunger) ----
    thirstStart: 100,
    thirstDrain: 0.08,          // per second
    thirstDrainSprint: 0.13,    // per second (sprinting)
    // Bands: value > normal => normal, > thirsty => thirsty, > 0 => dehydrated, 0 => critical.
    thirstStates: { normal: 60, thirsty: 30 },
    dehydrationDamage: 2.5,     // HP per second at thirst == 0

    // ---- Stamina ----
    staminaStart: 100,
    sprintDrain: 12.0,          // per second
    jumpDrain: 10.0,            // flat per jump
    gatherDrain: 4.0,           // flat per gather hit
    regenRate: 9.0,             // per second (idle/walk)
    regenRateCold: 4.0,         // per second when freezing
    minimumSprintStamina: 15.0, // sprint blocked below this

    // ---- Temperature (0 = freezing, 100 = ideal) ----
    tempStart: 100,
    tempDayRate: 1.2,           // recovery per second during day
    tempNightDrain: 0.9,        // loss per second at night
    tempRainDrain: 1.6,         // loss per second in rain
    tempColdWaterDrain: 2.0,    // extra loss while swimming (future)
    freezingThreshold: 25,      // below: debuffs active
    criticalThreshold: 10,      // below: HP damage starts
    freezingDamage: 1.5,        // HP per second when critical
    campfireWarmRate: 6.0,      // recovery per second near fire

    // ---- Radiation ----
    radGainInZone: 2.0,         // per second inside zone
    radDecay: 1.0,              // per second outside zone
    radLethalAt: 100,           // HP damage starts at max
    radDamage: 2.0,             // HP per second at max radiation

    // ---- Bleeding ----
    bleedDamage: 1.0,           // HP per second while bleeding (0 = off)
    bandageStopsBleeding: true,

    // ---- Healing / regen ----
    regenHungerMin: 60,         // natural regen only above this hunger
    regenThirstMin: 50,         // ...and above this thirst
    naturalRegen: 1.0,          // HP per second when well-fed

    // ---- Day / night ----
    dayLength: 800,             // seconds per full cycle
    dayStartTime: 300,          // start offset (morning)

    // ---- Resources ----
    resourceRespawnCheckMs: 5000,

    // ---- Save ----
    autosaveIntervalMs: 60000,
};
