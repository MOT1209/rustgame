// ============================================================
// RUSTGAME — M1 tests: platform detection, resolution, mode storage
// Run: npm test (vitest). Pure: injected envs only, no DOM.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
    DEFAULT_MODE_FOR_RUNTIME,
    PLATFORM_MODE_KEY,
    detectDevice,
    detectRuntime,
    loadMode,
    resolveDevice,
    saveMode,
} from '../js/core/platform.ts';
import type { SaveStorage } from '../js/types/game.ts';

function memStorage(seed: Record<string, string> = {}): { storage: SaveStorage; mem: Map<string, string> } {
    const mem = new Map<string, string>(Object.entries(seed));
    const storage: SaveStorage = {
        getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
        setItem: (k: string, v: string) => {
            mem.set(k, v);
        },
    };
    return { storage, mem };
}

describe('detectDevice', () => {
    it('treats touch-capable hardware as phone', () => {
        expect(detectDevice({ touchPoints: 5 })).toBe('phone');
        expect(detectDevice({ touchEvents: true, touchPoints: 0 })).toBe('phone');
        expect(detectDevice({ coarsePointer: true })).toBe('phone');
    });

    it('treats phone-sized viewports as phone', () => {
        expect(detectDevice({ minViewportSide: 390 })).toBe('phone');
        expect(detectDevice({ minViewportSide: 1920 })).toBe('desktop');
    });

    it('falls back to desktop when nothing is known', () => {
        expect(detectDevice({})).toBe('desktop');
    });
});

describe('detectRuntime', () => {
    it('defaults to web', () => {
        expect(detectRuntime({})).toBe('web');
    });

    it('maps shell flags, electron winning ties', () => {
        expect(detectRuntime({ capacitorNative: true })).toBe('android');
        expect(detectRuntime({ electron: true })).toBe('electron');
        expect(detectRuntime({ electron: true, capacitorNative: true })).toBe('electron');
    });
});

describe('resolveDevice', () => {
    it('explicit mode always wins over detection', () => {
        expect(resolveDevice('phone', {}, 'web')).toBe('phone');
        expect(resolveDevice('desktop', { touchPoints: 5 }, 'android')).toBe('desktop');
    });

    it('auto honors runtime defaults before detection', () => {
        expect(resolveDevice('auto', {}, 'android')).toBe('phone');
        expect(resolveDevice('auto', { touchPoints: 5 }, 'electron')).toBe('desktop');
        expect(DEFAULT_MODE_FOR_RUNTIME.web).toBe('auto');
    });

    it('auto on web falls back to device detection', () => {
        expect(resolveDevice('auto', { touchPoints: 5 }, 'web')).toBe('phone');
        expect(resolveDevice('auto', {}, 'web')).toBe('desktop');
    });
});

describe('platform mode storage', () => {
    it('round-trips a valid mode under the documented key', () => {
        const { storage, mem } = memStorage();
        expect(saveMode(storage, 'phone')).toBe(true);
        expect(mem.get(PLATFORM_MODE_KEY)).toBe('phone');
        expect(loadMode(storage)).toBe('phone');
    });

    it('repairs unknown or missing values to auto', () => {
        expect(loadMode(memStorage({ [PLATFORM_MODE_KEY]: 'tablet' }).storage)).toBe('auto');
        expect(loadMode(memStorage().storage)).toBe('auto');
    });

    it('never throws on hostile storage', () => {
        const bad: SaveStorage = {
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('denied');
            },
        };
        expect(loadMode(bad)).toBe('auto');
        expect(saveMode(bad, 'desktop')).toBe(false);
    });
});
