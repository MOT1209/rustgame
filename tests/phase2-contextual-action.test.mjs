import { describe, it, expect } from 'vitest';
import {
    CONTEXTUAL_ACTION,
    DEFAULT_CONTEXTUAL_LABEL,
    contextualButtonState,
    resolveContextualTap,
    stripKeyPrefix,
    toButtonLabel,
} from '../js/input/contextual-action.js';

describe('contextual interact label', () => {
    it('drops the E prefix — the button is the E key', () => {
        expect(stripKeyPrefix('E — Open storage box')).toBe('Open storage box');
        expect(stripKeyPrefix('E — Loot Wolf')).toBe('Loot Wolf');
    });

    it('leaves a prompt without a key prefix alone', () => {
        expect(stripKeyPrefix('Cook raw meat')).toBe('Cook raw meat');
        expect(stripKeyPrefix(null)).toBe('');
        expect(stripKeyPrefix(undefined)).toBe('');
    });

    it('cuts long labels on a word boundary', () => {
        const label = toButtonLabel('E — Place storage box', 12);
        expect(label.endsWith('…')).toBe(true);
        expect(label).not.toContain('stor…');
        expect(label.length).toBeLessThanOrEqual(13);
    });

    it('keeps short labels intact', () => {
        expect(toButtonLabel('E — Cook', 16)).toBe('Cook');
        expect(toButtonLabel('E — Place campfire', 16)).toBe('Place campfire');
    });

    it('falls back to the default glyph without a prompt', () => {
        expect(toButtonLabel('')).toBe(DEFAULT_CONTEXTUAL_LABEL);
        expect(toButtonLabel(null)).toBe(DEFAULT_CONTEXTUAL_LABEL);
    });
});

describe('contextual button state', () => {
    it('is hidden when there is nothing to interact with', () => {
        const state = contextualButtonState({ prompt: null, hasTarget: false });
        expect(state.visible).toBe(false);
        expect(state.action).toBe(CONTEXTUAL_ACTION);
    });

    it('shows the current action when a target is in range', () => {
        const state = contextualButtonState({ prompt: 'E — Open storage box', hasTarget: true });
        expect(state.visible).toBe(true);
        expect(state.label).toBe('Open storage box');
        expect(state.action).toBe(CONTEXTUAL_ACTION);
    });

    it('never throws on a missing input object', () => {
        expect(contextualButtonState().visible).toBe(false);
        expect(contextualButtonState({}).label).toBe(DEFAULT_CONTEXTUAL_LABEL);
    });
});

describe('contextual tap', () => {
    it('interacts when a target is in range', () => {
        expect(resolveContextualTap({ hasTarget: true })).toBe('interact');
    });

    it('falls back to the inventory when there is no target (desktop E parity)', () => {
        expect(resolveContextualTap({ hasTarget: false })).toBe('inventory');
        expect(resolveContextualTap()).toBe('inventory');
    });
});
