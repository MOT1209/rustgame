import { describe, it, expect } from 'vitest';
import {
    UnifiedGameControls,
    createTouchState,
    readStickVector,
    isTouchDevice,
    isPortraitBlocked,
} from '../js/input/touch-controls.js';

describe('touch input helpers', () => {
    it('starts neutral with no held buttons', () => {
        const state = createTouchState();
        expect(state.moveX).toBe(0);
        expect(state.moveY).toBe(0);
        expect(Object.keys(state.buttons)).toHaveLength(0);
    });

    it('isPortraitBlocked blocks portrait only when landscape is required', () => {
        expect(isPortraitBlocked(390, 844, true)).toBe(true);
        expect(isPortraitBlocked(844, 390, true)).toBe(false);
        expect(isPortraitBlocked(390, 844, false)).toBe(false);
    });

    it('isTouchDevice reads touch support from the given environment', () => {
        expect(isTouchDevice({}, { maxTouchPoints: 5 })).toBe(true);
        expect(isTouchDevice({ ontouchstart: null }, { maxTouchPoints: 0 })).toBe(true);
        expect(isTouchDevice({}, { maxTouchPoints: 0 })).toBe(false);
    });

    it('isPortraitBlocked ignores unknown viewport sizes', () => {
        expect(isPortraitBlocked(0, 0, true)).toBe(false);
        expect(isPortraitBlocked(NaN, 500, true)).toBe(false);
    });
});

describe('readStickVector', () => {
    it('returns zero inside the deadzone so the player does not drift', () => {
        expect(readStickVector(2, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    });

    it('maps a partial drag proportionally instead of snapping to full speed', () => {
        const v = readStickVector(20, 0);
        expect(v.x).toBeCloseTo(20 / 55, 5);
        expect(v.magnitude).toBeCloseTo(0.364, 3);
    });

    it('maps a full-radius drag to exactly 1', () => {
        const v = readStickVector(55, 0);
        expect(v.magnitude).toBeCloseTo(1, 5);
    });

    it('clamps a drag beyond the stick radius to the unit circle', () => {
        const v = readStickVector(400, 400);
        expect(v.magnitude).toBeCloseTo(1, 5);
    });

    it('rejects non-finite input instead of propagating NaN into player state', () => {
        expect(readStickVector(NaN, 3)).toEqual({ x: 0, y: 0, magnitude: 0 });
        expect(readStickVector(Infinity, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    });
});

describe('UnifiedGameControls (no-DOM environment)', () => {
    it('constructs and initialises without throwing when no touch device exists', () => {
        const controls = new UnifiedGameControls({ actionButtons: [{ id: 'a', label: 'A', action: 'attack' }] });
        expect(() => controls.init()).not.toThrow();
        expect(controls.mounted).toBe(false);
        expect(controls.nodes.root).toBeUndefined();
        expect(() => controls.destroy()).not.toThrow();
    });

    it('keeps the composition root contract for callbacks', () => {
        const calls = [];
        const controls = new UnifiedGameControls({
            onMove: (x, y) => calls.push(['move', x, y]),
            onAction: (action) => calls.push(['action', action]),
            onHoldChange: (action, down) => calls.push(['hold', action, down]),
        });
        expect(typeof controls.options.onMove).toBe('function');
        expect(typeof controls.options.onAction).toBe('function');
        expect(typeof controls.options.onHoldChange).toBe('function');
        expect(calls).toHaveLength(0);
    });
});
