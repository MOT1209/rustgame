// ============================================================
// RUSTGAME — Axis 4 tests: A/B shutters, quota, legacy compat, autosaver
// Run: npm test (vitest)
// Pure: memory backends only, no DOM, no THREE.
// ============================================================

import { strict as assert } from 'node:assert';
import { test, vi } from 'vitest';
import { SaveSystem } from '../js/save/save-system.ts';
import { SAVE_VERSION } from '../js/core/config.ts';
import type { SaveGame, SaveStorage } from '../js/types/game.ts';

function memBackend(seed?: Record<string, string>): { backend: SaveStorage; mem: Map<string, string> } {
    const mem = new Map<string, string>(Object.entries(seed ?? {}));
    const backend: SaveStorage = {
        getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
        setItem: (k: string, v: string) => {
            mem.set(k, v);
        },
    };
    return { backend, mem };
}

function validSaveString(overrides?: Partial<SaveGame>): string {
    const s = SaveSystem.blank();
    const merged: SaveGame = { ...s, ...overrides };
    const str = SaveSystem.toString(merged);
    assert.ok(typeof str === 'string');
    return str as string;
}

test('save/ab: quota on setItem → write false + lastWriteError set', () => {
    SaveSystem.lastWriteError = null;
    const quotaBackend: SaveStorage = {
        getItem: () => null,
        setItem: () => {
            const e = new Error('storage full');
            e.name = 'QuotaExceededError';
            throw e;
        },
    };
    const ok = SaveSystem.write(quotaBackend, 'k', SaveSystem.blank());
    assert.equal(ok, false);
    assert.ok(SaveSystem.lastWriteError, 'lastWriteError must be set on quota');
    assert.match(String(SaveSystem.lastWriteError), /quota/i);
    SaveSystem.lastWriteError = null;
});

test('save/ab: corrupt active slot falls back to healthy slot', () => {
    const good = validSaveString({ timestamp: 777 });
    const { backend } = memBackend({
        'k:a': 'not json{{corrupt',
        'k:b': good,
        'k:active': 'a',
    });
    const back = SaveSystem.read(backend, 'k');
    assert.ok(back, 'must recover the healthy slot');
    assert.equal(back && back.saveVersion, SAVE_VERSION);
    assert.equal(back && back.timestamp, 777);
});

test('save/ab: legacy single-key save reads without migration', () => {
    const good = validSaveString({ timestamp: 1234 });
    const { backend } = memBackend({ k: good });
    const back = SaveSystem.read(backend, 'k');
    assert.ok(back, 'legacy key must load');
    assert.equal(back && back.saveVersion, SAVE_VERSION);
    assert.equal(back && back.timestamp, 1234);
});

test('save/ab: newest timestamp wins across slots', () => {
    const oldS = validSaveString({ timestamp: 100 });
    const newS = validSaveString({ timestamp: 200 });
    const { backend } = memBackend({
        'k:a': oldS,
        'k:b': newS,
        'k:active': 'a',
    });
    const back = SaveSystem.read(backend, 'k');
    assert.ok(back);
    assert.equal(back && back.timestamp, 200);
});

test('save/ab: autosaver markDirty + flush with fake timers', () => {
    vi.useFakeTimers();
    try {
        let calls = 0;
        const auto = SaveSystem.createAutosaver(
            () => {
                calls += 1;
            },
            1000,
        );
        auto.start();
        // starts dirty → first interval flushes once
        vi.advanceTimersByTime(1000);
        assert.equal(calls, 1);
        // clean → further intervals do nothing
        vi.advanceTimersByTime(5000);
        assert.equal(calls, 1);
        // explicit dirty + flush
        auto.markDirty();
        assert.equal(auto.flush(), true);
        assert.equal(calls, 2);
        // second flush without dirty → false, no call
        assert.equal(auto.flush(), false);
        assert.equal(calls, 2);
        auto.stop();
    } finally {
        vi.useRealTimers();
    }
});
