// ============================================================
// RUSTGAME — Phase 2.1: animal combat + loot-with-E rules
// Port of the PRD §7 acceptance criteria:
//   "مواجهة ذئب قابلة للربح بالأدوات الحجرية + ضمادة واحدة"
// ============================================================

import { describe, it, expect } from 'vitest';
import {
    ANIMAL_TYPES,
    AnimalState,
    FIST_DAMAGE,
    STONE_TOOL_DAMAGE,
    toolDamage,
} from '../js/world/animals.ts';

describe('animal types', () => {
    it('a wolf drops exactly one bandage', () => {
        expect(ANIMAL_TYPES.wolf.loot.bandage).toBe(1);
    });

    it('every animal has health, damage and a loot table', () => {
        for (const def of Object.values(ANIMAL_TYPES)) {
            expect(def.health).toBeGreaterThan(0);
            expect(def.damage).toBeGreaterThan(0);
            expect(Object.keys(def.loot).length).toBeGreaterThan(0);
        }
    });
});

describe('tool damage', () => {
    it('bare hands do the minimum damage', () => {
        expect(toolDamage(null)).toBe(FIST_DAMAGE);
        expect(toolDamage(undefined)).toBe(FIST_DAMAGE);
        expect(toolDamage('unknown_thing')).toBe(FIST_DAMAGE);
    });

    it('stone tools hit harder than fists', () => {
        expect(toolDamage('stone_hatchet')).toBe(STONE_TOOL_DAMAGE);
        expect(toolDamage('stone_pickaxe')).toBe(STONE_TOOL_DAMAGE);
        expect(STONE_TOOL_DAMAGE).toBeGreaterThan(FIST_DAMAGE);
    });

    it('a pickaxe is not a hammer but still a stone tool', () => {
        expect(toolDamage('stone_pickaxe')).toBe(toolDamage('stone_hatchet'));
    });
});

describe('AnimalState', () => {
    it('a wolf dies in 3 hits with a stone tool', () => {
        const wolf = new AnimalState('wolf');
        const dmg = toolDamage('stone_hatchet');
        let hits = 0;
        while (!wolf.isDead && hits < 50) {
            wolf.takeDamage(dmg);
            hits++;
        }
        expect(hits).toBe(3);
        expect(wolf.isDead).toBe(true);
    });

    it('bare hands can still win, but need far more hits', () => {
        const wolf = new AnimalState('wolf');
        let hits = 0;
        while (!wolf.isDead && hits < 50) {
            wolf.takeDamage(toolDamage(null));
            hits++;
        }
        expect(wolf.isDead).toBe(true);
        expect(hits).toBeGreaterThan(3);
    });

    it('never drops below zero health and ignores invalid damage', () => {
        const wolf = new AnimalState('wolf');
        expect(wolf.takeDamage(0)).toBe(0);
        expect(wolf.takeDamage(-5)).toBe(0);
        expect(wolf.takeDamage(999)).toBe(ANIMAL_TYPES.wolf.health);
        expect(wolf.health).toBe(0);
        expect(wolf.takeDamage(10)).toBe(0); // already dead
    });

    it('a corpse can be looted exactly once', () => {
        const wolf = new AnimalState('wolf');
        const loot = wolf.lootOnce();
        expect(loot).not.toBeNull();
        expect(loot!.bandage).toBe(1);
        expect(loot!.raw_meat).toBe(2);
        expect(wolf.lootOnce()).toBeNull();
    });

    it('the loot map is a copy — the caller cannot corrupt the definition', () => {
        const wolf = new AnimalState('wolf');
        const loot = wolf.lootOnce()!;
        loot.cloth = 999;
        expect(ANIMAL_TYPES.wolf.loot.cloth).toBe(3);
    });

    it('a bear is tougher than a wolf', () => {
        expect(new AnimalState('bear').maxHealth).toBeGreaterThan(new AnimalState('wolf').maxHealth);
    });

    it('an unknown type falls back to the wolf', () => {
        const fallback = new AnimalState('dragon');
        expect(fallback.type).toBe('wolf');
    });
});
