// ============================================================
// RUSTGAME — Central game types (Phase 2: TypeScript migration)
// Pure type declarations — imported with `import type` where possible.
// ============================================================

export type DamageType =
    | 'generic' | 'fall' | 'animal' | 'environment'
    | 'hunger' | 'thirst' | 'radiation' | 'cold' | 'bleeding';

export type HungerState = 'normal' | 'hungry' | 'starving' | 'critical';
export type ThirstState = 'normal' | 'thirsty' | 'dehydrated' | 'critical';

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

/** Full player vitals. maxHealth is optional on raw input (normalize() fills it). */
export interface PlayerStats {
    health: number;
    hunger: number;
    thirst: number;
    stamina: number;
    temperature: number;
    radiation: number;
    bleeding: number;
    maxHealth?: number;
    lastDamageType?: string;
    lastDamageAt?: number;
}

/** Minimal shape accepted by DamageSystem (tests may pass partial stats). */
export interface DamageableStats {
    health: number;
    maxHealth?: number;
    lastDamageType?: string;
    lastDamageAt?: number;
}

/** StaminaSystem works on any object exposing a stamina value. */
export interface StaminaStats {
    stamina: number;
}

export interface StatBands {
    normal: number;
    hungry: number;
}

export interface ThirstBands {
    normal: number;
    thirsty: number;
}

export interface InventoryItem {
    id: string;
    count: number;
}

// ============================================================
// Save system shapes (Axis 4) — single source of truth for
// js/save/save-system.ts. Pure data, no runtime code.
// ============================================================

/** Minimal storage backend (localStorage in game, memory Map in tests). */
export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface SavePlayerPosition {
    x: number;
    y: number;
    z: number;
}

export interface SavePlayerRotation {
    y: number;
}

export interface SavePlayer {
    position: SavePlayerPosition;
    rotation: SavePlayerRotation;
    stats: PlayerStats;
    belt: Array<string | null>;
    dead: boolean;
}

export interface SaveCampfire {
    x: number;
    z: number;
}

export interface SaveWorld {
    respawns: Array<Record<string, unknown>>;
    storages: Array<Record<string, unknown>>;
    campfires: Array<SaveCampfire>;
    day: number;
    weather: Record<string, unknown> | null;
}

export interface SaveStructure {
    type: string;
    pos: SavePlayerPosition;
    rot: number;
    tier: string;
    health: number;
    maxHealth: number;
    isTC: boolean;
    isDoor: boolean;
    isOpen: boolean;
}

export interface SaveBuildings {
    structures: Array<SaveStructure | Record<string, unknown>>;
    toolCupboards: Array<Record<string, unknown>>;
}

export interface SaveGame {
    saveVersion: number;
    timestamp: number;
    player: SavePlayer;
    inventory: InventoryItem[];
    world: SaveWorld;
    buildings: SaveBuildings;
    time: number;
}

export interface SaveAutosaver {
    markDirty(): void;
    flush(): boolean;
    start(): void;
    stop(): void;
}

/** Environment flags consumed by SurvivalSystem.tick(). */
export interface SurvivalEnv {
    sprinting?: boolean;
    inRadiation?: boolean;
    isNight?: boolean;
    isRaining?: boolean;
    nearFire?: boolean;
    inWater?: boolean;
    freezing?: boolean;
}

export interface SurvivalEvent {
    type: 'hunger' | 'thirst';
    from: string;
    to: string;
}

export interface SurvivalTickResult {
    events: SurvivalEvent[];
    hungerState: HungerState;
    thirstState: ThirstState;
    freezing: boolean;
}

/** Single source of truth shape for all gameplay tuning values. */
export interface SurvivalConfig {
    maxHealth: number;
    maxHunger: number;
    maxThirst: number;
    maxStamina: number;
    maxTemperature: number;
    maxRadiation: number;

    hungerStart: number;
    hungerDrain: number;
    hungerDrainSprint: number;
    hungerDrainCold: number;
    hungerStates: StatBands;
    starvationDamage: number;

    thirstStart: number;
    thirstDrain: number;
    thirstDrainSprint: number;
    thirstStates: ThirstBands;
    dehydrationDamage: number;

    staminaStart: number;
    sprintDrain: number;
    jumpDrain: number;
    gatherDrain: number;
    regenRate: number;
    regenRateCold: number;
    minimumSprintStamina: number;

    tempStart: number;
    tempDayRate: number;
    tempNightDrain: number;
    tempRainDrain: number;
    tempColdWaterDrain: number;
    freezingThreshold: number;
    criticalThreshold: number;
    freezingDamage: number;
    campfireWarmRate: number;

    radGainInZone: number;
    radDecay: number;
    radLethalAt: number;
    radDamage: number;

    bleedDamage: number;
    bandageStopsBleeding: boolean;

    regenHungerMin: number;
    regenThirstMin: number;
    naturalRegen: number;

    dayLength: number;
    dayStartTime: number;

    resourceRespawnCheckMs: number;
    autosaveIntervalMs: number;
}
