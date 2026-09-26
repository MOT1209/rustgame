// ============================================================
// RUSTGAME — Phase 2: save schema v3 (world objects + safety)
//   - v2 → v3 migration keeps saves loadable and defaults campfires/doors
//   - saves from a newer build are refused, never downgraded or overwritten
//   - read() reports WHY it failed so the UI can say the right thing
// Pure: memory backends only, no DOM, no localStorage, no THREE.
// ============================================================

import { describe, it, expect } from 'vitest';
import { SaveSystem, SAVE_VERSION_CURRENT } from '../js/save/save-system.ts';
import { SAVE_VERSION } from '../js/core/config.ts';

function memBackend(seed = {}) {
    const mem = new Map(Object.entries(seed));
    return {
        mem,
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => mem.set(k, String(v)),
    };
}

describe('save v3 schema', () => {
    it('tracks the current version from config', () => {
        expect(SAVE_VERSION_CURRENT).toBe(SAVE_VERSION);
        expect(SaveSystem.blank().saveVersion).toBe(SAVE_VERSION);
    });

    it('migrates a v2 payload with empty campfires and closed doors', () => {
        const v2 = {
            saveVersion: 2, timestamp: 10,
            player: { position: { x: 1, y: 2, z: 3 }, stats: { health: 50 }, belt: [null] },
            inventory: [{ id: 'wood', count: 4 }],
            world: { day: 2, weather: null, storages: [{ id: 's1' }], respawns: [] },
            buildings: {
                structures: [{
                    type: 'wooden_door', pos: { x: 5, y: 0, z: 6 }, rot: 1.57,
                    tier: 'twig', health: 200, maxHealth: 200, isTC: false,
                }],
            },
        };
        const s = SaveSystem.migrate(v2);
        expect(s).not.toBeNull();
        expect(s.saveVersion).toBe(SAVE_VERSION);
        expect(s.world.campfires).toEqual([]);
        expect(s.world.storages).toEqual([{ id: 's1' }]);
        expect(s.world.day).toBe(2);
        const door = s.buildings.structures[0];
        expect(door.isDoor).toBe(false);
        expect(door.isOpen).toBe(false);
        expect(door.rot).toBe(1.57);
    });

    it('keeps campfires and door state across a roundtrip', () => {
        const backend = memBackend();
        const save = SaveSystem.blank();
        save.world.campfires = [{ x: 1.5, z: -2.5 }, { x: 0, z: 0 }];
        save.buildings.structures = [{
            type: 'wooden_door', pos: { x: 1, y: 0, z: 1 }, rot: Math.PI / 2,
            tier: 'wood', health: 150, maxHealth: 200, isTC: false, isDoor: true, isOpen: true,
        }];
        expect(SaveSystem.write(backend, 'k', save)).toBe(true);

        const back = SaveSystem.read(backend, 'k');
        expect(back.world.campfires).toEqual([{ x: 1.5, z: -2.5 }, { x: 0, z: 0 }]);
        expect(back.buildings.structures[0].isDoor).toBe(true);
        expect(back.buildings.structures[0].isOpen).toBe(true);
    });

    it('drops invalid campfire entries instead of storing them', () => {
        const s = SaveSystem.migrate({
            saveVersion: 3,
            world: { campfires: [{ x: 'a', z: 1 }, null, { x: 2 }, { x: NaN, z: NaN }, { x: 3, z: 4 }] },
        });
        expect(s.world.campfires).toEqual([{ x: 3, z: 4 }]);
    });

    it('fuzzes the v3 shape without throwing or emitting bad data', () => {
        const cases = [
            { saveVersion: 3, world: { campfires: 'nope' } },
            { saveVersion: 3, world: { campfires: new Array(200).fill({ x: 'x', z: {} }) } },
            { saveVersion: 3, buildings: { structures: [{ pos: null, type: 5, isDoor: 'yes', isOpen: 1 }] } },
            { saveVersion: 2.5, world: null, buildings: null },
        ];
        for (const c of cases) {
            const out = SaveSystem.migrate(c);
            expect(out === null || out.saveVersion === SAVE_VERSION).toBe(true);
            if (!out) continue;
            expect(Array.isArray(out.world.campfires)).toBe(true);
            for (const f of out.world.campfires) {
                expect(Number.isFinite(f.x) && Number.isFinite(f.z)).toBe(true);
            }
            for (const s of out.buildings.structures) {
                expect(typeof s.isDoor).toBe('boolean');
                expect(typeof s.isOpen).toBe('boolean');
            }
        }
    });
});

describe('save v3 safety', () => {
    it('refuses a save written by a newer build instead of downgrading it', () => {
        const backend = memBackend({
            'k:a': JSON.stringify({ saveVersion: SAVE_VERSION + 1, timestamp: 99, world: { questLog: ['future'] } }),
        });
        expect(SaveSystem.read(backend, 'k')).toBeNull();
        expect(SaveSystem.lastReadStatus).toBe('future-version');
        expect(SaveSystem.isFutureVersion).toBe(true);
    });

    it('never overwrites a newer build save', () => {
        const backend = memBackend({
            'k:a': JSON.stringify({ saveVersion: SAVE_VERSION + 1, timestamp: 99 }),
            'k:active': 'a',
        });
        SaveSystem.read(backend, 'k');
        expect(SaveSystem.write(backend, 'k', SaveSystem.blank())).toBe(false);
        expect(SaveSystem.lastWriteError).toBe('future-version-readonly');
        expect(backend.getItem('k:b')).toBeNull();
        expect(backend.getItem('k:a')).toContain(`"saveVersion":${SAVE_VERSION + 1}`);
    });

    it('tells missing apart from corrupt', () => {
        const empty = memBackend();
        expect(SaveSystem.read(empty, 'k')).toBeNull();
        expect(SaveSystem.lastReadStatus).toBe('missing');

        const broken = memBackend({ 'k:a': 'not json{{' });
        expect(SaveSystem.read(broken, 'k')).toBeNull();
        expect(SaveSystem.lastReadStatus).toBe('corrupt');
    });

    it('recovers a healthy A/B slot when its sibling is corrupt', () => {
        const good = SaveSystem.blank();
        good.world.campfires = [{ x: 7, z: 7 }];
        good.timestamp = 5;
        const backend = memBackend({
            'k:a': JSON.stringify(good),
            'k:b': '{"saveVersion":3,"trunc',
            'k:active': 'a',
        });
        const back = SaveSystem.read(backend, 'k');
        expect(back).not.toBeNull();
        expect(back.world.campfires).toEqual([{ x: 7, z: 7 }]);
        expect(SaveSystem.lastReadStatus).toBe('ok');
    });

    it('resets the read status between reads (no stale state)', () => {
        const future = memBackend({ 'k:a': JSON.stringify({ saveVersion: SAVE_VERSION + 1 }) });
        expect(SaveSystem.read(future, 'k')).toBeNull();
        expect(SaveSystem.lastReadStatus).toBe('future-version');

        expect(SaveSystem.read(memBackend(), 'k')).toBeNull();
        expect(SaveSystem.lastReadStatus).toBe('missing');
        expect(SaveSystem.isFutureVersion).toBe(false);
    });
});
