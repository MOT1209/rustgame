import { describe, it, expect } from 'vitest';
import {
    SMELT_RECIPES,
    SmeltSession,
    canSmelt,
    getSmeltRecipe,
} from '../js/world/smelting.js';

const counts = (map) => (id) => (map[id] || 0);

describe('smelt recipes', () => {
    it('turns raw iron into metal fragments', () => {
        const recipe = getSmeltRecipe('iron');
        expect(recipe.input).toBe('iron');
        expect(recipe.output).toBe('frag');
        expect(recipe.count).toBe(1);
        expect(recipe.fuel).toBe('wood');
    });

    it('every recipe needs fuel and has a duration', () => {
        for (const recipe of Object.values(SMELT_RECIPES)) {
            expect(recipe.fuelCount).toBeGreaterThan(0);
            expect(recipe.timeSec).toBeGreaterThan(0);
        }
    });

    it('an unknown recipe is null', () => {
        expect(getSmeltRecipe('gold')).toBe(null);
    });
});

describe('canSmelt', () => {
    it('needs both ore and fuel', () => {
        expect(canSmelt('iron', counts({ iron: 1 }))).toBe(false);
        expect(canSmelt('iron', counts({ wood: 10 }))).toBe(false);
        expect(canSmelt('iron', counts({ iron: 1, wood: 2 }))).toBe(true);
    });

    it('is false for an unknown recipe or a broken counter', () => {
        expect(canSmelt('gold', counts({}))).toBe(false);
        expect(canSmelt('iron', null)).toBe(false);
    });
});

describe('SmeltSession', () => {
    it('starts at zero and reaches 100% over its duration', () => {
        const session = new SmeltSession('iron', 1000);
        expect(session.progress01(1000)).toBe(0);
        expect(session.progress01(1000 + 4000)).toBeCloseTo(0.5, 5);
        expect(session.progress01(1000 + 8000)).toBe(1);
        expect(session.isDone(1000 + 7999)).toBe(false);
        expect(session.isDone(1000 + 8000)).toBe(true);
    });

    it('never exceeds 100%', () => {
        const session = new SmeltSession('iron', 0);
        expect(session.progress01(999999)).toBe(1);
        expect(session.percent(999999)).toBe(100);
    });

    it('yields the result exactly once', () => {
        const session = new SmeltSession('iron', 0);
        expect(session.collect(1000)).toBe(null); // too early
        const first = session.collect(8000);
        expect(first).toEqual({ output: 'frag', count: 1 });
        expect(session.collect(9000)).toBe(null);
    });

    it('an invalid session never yields', () => {
        const session = new SmeltSession('gold', 0);
        expect(session.isValid).toBe(false);
        expect(session.isDone(100000)).toBe(false);
        expect(session.collect(100000)).toBe(null);
    });
});
