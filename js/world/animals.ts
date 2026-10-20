// ============================================================
// RUSTGAME — Phase 2: Animal Combat & Loot (pure logic)
// The numbers that decide whether a wolf fight is winnable live
// here, not in game.js, so they can be unit-tested in Node.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

export type AnimalType = 'wolf' | 'bear' | 'scientist';

export interface AnimalDef {
    id: AnimalType;
    name: string;
    /** Hit points. A stone tool kills a wolf in 3 hits, bare hands in 10. */
    health: number;
    /** Damage the animal deals per attack. */
    damage: number;
    attackCooldownMs: number;
    agroRange: number;
    attackRange: number;
    moveSpeed: number;
    /** Items dropped on the corpse. Looted once, with E. */
    loot: Record<string, number>;
}

export const ANIMAL_TYPES: Record<AnimalType, AnimalDef> = {
    wolf: {
        id: 'wolf',
        name: 'Wolf',
        health: 50,
        damage: 12,
        attackCooldownMs: 1200,
        agroRange: 18,
        attackRange: 2.5,
        moveSpeed: 5,
        // One bandage per wolf: the DoD for Phase 2.1 ("مواجهة ذئب قابلة
        // للربح بالأدوات الحجرية + ضمادة واحدة").
        loot: { raw_meat: 2, cloth: 3, bandage: 1 },
    },
    bear: {
        id: 'bear',
        name: 'Bear',
        health: 120,
        damage: 20,
        attackCooldownMs: 1500,
        agroRange: 16,
        attackRange: 2.8,
        moveSpeed: 3,
        loot: { raw_meat: 4, cloth: 5, leather: 3, bandage: 1 },
    },
    scientist: {
        id: 'scientist',
        name: 'Scientist',
        health: 80,
        damage: 8,
        attackCooldownMs: 800,
        agroRange: 30,
        attackRange: 12,
        moveSpeed: 2.5,
        loot: { scrap: 15, frag: 10 },
    },
};

/** Bare-handed damage. Slow, but a desperate player can still win. */
export const FIST_DAMAGE = 5;
/** Stone tools (hatchet / pickaxe) — the tools a fresh player actually has. */
export const STONE_TOOL_DAMAGE = 20;
/** Blunt/pointed weapons — faster kills, but they are rare early on. */
export const WEAPON_DAMAGE = 30;

/**
 * Damage a hit with the equipped tool deals to an animal.
 * Stone tools are deliberately strong enough to kill a wolf quickly; bare
 * hands are not, so the fight stays a real risk (the wolf hits for 12).
 */
export function toolDamage(toolId?: string | null): number {
    if (!toolId || typeof toolId !== 'string') return FIST_DAMAGE;
    const t = toolId.toLowerCase();
    if (t.includes('hatchet') || t.includes('pickaxe') || t.includes('axe') || t.includes('pick')) {
        // "stone_pickaxe" is a pickaxe, not an axe — both are stone tools.
        return STONE_TOOL_DAMAGE;
    }
    if (
        t.includes('ak47') || t.includes('pistol') || t.includes('bow') || t.includes('spear') ||
        t.includes('machete') || t.includes('knife') || t.includes('sword') || t.includes('hammer')
    ) {
        return WEAPON_DAMAGE;
    }
    return FIST_DAMAGE;
}

/**
 * Mutable state of one living animal. The corpse keeps this object so the
 * loot can be taken exactly once.
 */
export class AnimalState {
    readonly def: AnimalDef;
    private hp: number;
    private looted = false;

    constructor(type: AnimalType | string) {
        const def = ANIMAL_TYPES[type as AnimalType] || ANIMAL_TYPES.wolf;
        this.def = def;
        this.hp = def.health;
    }

    get type(): AnimalType { return this.def.id; }
    get name(): string { return this.def.name; }
    get health(): number { return this.hp; }
    get maxHealth(): number { return this.def.health; }
    get isDead(): boolean { return this.hp <= 0; }
    get isLooted(): boolean { return this.looted; }

    /** Applies damage and returns the amount actually dealt (0 when dead). */
    takeDamage(amount: number): number {
        if (this.isDead) return 0;
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return 0;
        const before = this.hp;
        this.hp = Math.max(0, before - amount);
        return before - this.hp;
    }

    /**
     * Takes the loot off the corpse. Returns the item map the FIRST time and
     * null afterwards — a corpse can never be looted twice.
     */
    lootOnce(): Record<string, number> | null {
        if (this.looted) return null;
        this.looted = true;
        return { ...this.def.loot };
    }
}
