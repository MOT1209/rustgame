import { describe, it, expect } from 'vitest';
import {
    SPOIL_PENALTY,
    ageSeconds,
    canSpoil,
    isSpoiled,
    pruneSpoilage,
    spoilSecondsFor,
    spoiledItemIds,
    spoilagePenalty,
    startSpoiling,
} from '../js/inventory/spoilage.js';

describe('spoil times', () => {
    it('meat and berries rot, everything else does not', () => {
        expect(spoilSecondsFor('raw_meat')).toBeGreaterThan(0);
        expect(spoilSecondsFor('cooked_meat')).toBeGreaterThan(0);
        expect(spoilSecondsFor('berry')).toBeGreaterThan(0);
        expect(spoilSecondsFor('canned_food')).toBe(0);
        expect(spoilSecondsFor('water')).toBe(0);
        expect(spoilSecondsFor('bandage')).toBe(0);
        expect(canSpoil('wood')).toBe(false);
    });

    it('cooked meat keeps longer than raw meat', () => {
        expect(spoilSecondsFor('cooked_meat')).toBeGreaterThan(spoilSecondsFor('raw_meat'));
    });
});

describe('the rot clock', () => {
    it('starts when the item is picked up and is not reset by more of the same', () => {
        const spoiledAt = {};
        startSpoiling('raw_meat', spoiledAt, 1000);
        expect(spoiledAt.raw_meat).toBe(1000);

        startSpoiling('raw_meat', spoiledAt, 5000);
        expect(spoiledAt.raw_meat).toBe(1000);
    });

    it('never starts for items that do not spoil', () => {
        const spoiledAt = {};
        startSpoiling('wood', spoiledAt, 1000);
        expect(spoiledAt.wood).toBeUndefined();
    });

    it('reports the age in seconds', () => {
        const spoiledAt = { raw_meat: 1000 };
        expect(ageSeconds('raw_meat', spoiledAt, 61000)).toBeCloseTo(60, 5);
        expect(ageSeconds('wood', spoiledAt, 61000)).toBe(0);
        expect(ageSeconds('raw_meat', {}, 61000)).toBe(0);
    });
});

describe('isSpoiled', () => {
    it('is false before the time is up and true after it', () => {
        const spoiledAt = { raw_meat: 0 };
        const seconds = spoilSecondsFor('raw_meat');
        expect(isSpoiled('raw_meat', spoiledAt, (seconds - 1) * 1000)).toBe(false);
        expect(isSpoiled('raw_meat', spoiledAt, seconds * 1000)).toBe(true);
    });

    it('an item that was never picked up never spoils', () => {
        expect(isSpoiled('raw_meat', {}, 999999999)).toBe(false);
    });

    it('lists what is spoiled right now', () => {
        const spoiledAt = { raw_meat: 0, berry: 999999999 };
        const ids = spoiledItemIds(spoiledAt, spoilSecondsFor('raw_meat') * 1000);
        expect(ids).toContain('raw_meat');
        expect(ids).not.toContain('berry');
    });
});

describe('spoilagePenalty', () => {
    it('costs health only once the food is actually spoiled', () => {
        const spoiledAt = { raw_meat: 0 };
        expect(spoilagePenalty('raw_meat', spoiledAt, 0)).toBe(0);
        expect(spoilagePenalty('raw_meat', spoiledAt, spoilSecondsFor('raw_meat') * 1000))
            .toBe(SPOIL_PENALTY.raw_meat);
    });

    it('spoiled cooked meat hurts more than spoiled raw meat', () => {
        expect(SPOIL_PENALTY.cooked_meat).toBeGreaterThan(SPOIL_PENALTY.raw_meat);
    });
});

describe('pruneSpoilage', () => {
    it('drops the clocks of items the player no longer has', () => {
        const spoiledAt = { raw_meat: 1, berry: 2 };
        pruneSpoilage(spoiledAt, ['raw_meat']);
        expect(spoiledAt.raw_meat).toBe(1);
        expect(spoiledAt.berry).toBeUndefined();
    });
});
