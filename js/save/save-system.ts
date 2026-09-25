// ============================================================
// RUSTGAME — Axis 4: Save System (versioned, validated, migrating)
// Save shape (v2):
// { saveVersion, timestamp, player, inventory, world, buildings, time }
// Pure module: storage backend injectable (localStorage in game,
// memory-map in tests). No DOM, no THREE. Never throws.
// Storage layout (A/B shutters against corruption):
//   `<key>:a` / `<key>:b` — alternating payload slots
//   `<key>:active`        — pointer to the newest slot ("a" | "b")
//   `<key>`               — legacy single-slot save (read-only compat)
// Public API: blank, migrate, loadFromString, toString,
//   read, write, createAutosaver, lastWriteError
// ============================================================

import { SAVE_VERSION } from '../core/config.ts';
import type {
    InventoryItem,
    PlayerStats,
    SaveAutosaver,
    SaveGame,
    SaveStorage,
} from '../types/game.ts';

export const SAVE_VERSION_CURRENT = SAVE_VERSION;

type SlotId = 'a' | 'b';

function slotKey(key: string, slot: SlotId): string {
    return `${key}:${slot}`;
}

function pointerKey(key: string): string {
    return `${key}:active`;
}

function isObj(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function num(v: unknown, fallback: number): number {
    return typeof v === 'number' && isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
    return typeof v === 'string' ? v : fallback;
}

function isQuotaError(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false;
    const err = e as { name?: unknown; code?: unknown; message?: unknown };
    if (err.name === 'QuotaExceededError') return true;
    if (err.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
    if (err.code === 22) return true;
    if (typeof err.message === 'string' && /quota|exceed/i.test(err.message)) return true;
    return false;
}

function quotaLabel(e: unknown): string {
    if (!e || typeof e !== 'object') return 'quota';
    const err = e as { name?: unknown };
    return typeof err.name === 'string' && err.name ? err.name : 'quota';
}

function cleanStats(s: unknown): PlayerStats {
    const d: Record<string, unknown> = isObj(s) ? s : {};
    return {
        health: num(d['health'], 100),
        hunger: num(d['hunger'], 100),
        thirst: num(d['thirst'], 100),
        stamina: num(d['stamina'], 100),
        temperature: num(d['temperature'], 100),
        radiation: num(d['radiation'], 0),
        bleeding: num(d['bleeding'], 0),
    };
}

function cleanInventory(inv: unknown): InventoryItem[] {
    if (!Array.isArray(inv)) return [];
    const out: InventoryItem[] = [];
    for (const e of inv) {
        if (!isObj(e)) continue;
        const id = e['id'];
        if (typeof id !== 'string') continue;
        const count = Math.floor(num(e['count'], 0));
        if (count <= 0) continue;
        out.push({ id, count });
    }
    return out;
}

function safeGet(storage: SaveStorage, k: string): string | null {
    try {
        return storage.getItem(k);
    } catch {
        return null;
    }
}

function readActiveSlot(storage: SaveStorage, key: string): SlotId | null {
    const v = safeGet(storage, pointerKey(key));
    return v === 'a' || v === 'b' ? v : null;
}

export const SaveSystem = {
    version: SAVE_VERSION_CURRENT,

    /** Last write failure label (null on success). 'quota…'/QuotaExceededError = storage full. */
    lastWriteError: null as string | null,

    blank(): SaveGame {
        return {
            saveVersion: SAVE_VERSION_CURRENT,
            timestamp: Date.now(),
            player: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { y: 0 },
                stats: cleanStats({}),
                belt: [],
                dead: false,
            },
            inventory: [],
            world: { respawns: [], storages: [], day: 1, weather: null },
            buildings: { structures: [], toolCupboards: [] },
            time: 0,
        };
    },

    /** Migrate any older save to current shape. Never throws. */
    migrate(data: unknown): SaveGame | null {
        if (!isObj(data)) return null;
        const rec = data as Record<string, unknown>;
        const v = num(rec['version'], num(rec['saveVersion'], SAVE_VERSION_CURRENT));
        const out: SaveGame = this.blank();
        try {
            if (v === 1 || v === 1.0) {
                // ---- v1 (legacy game.js) ----
                const p: Record<string, unknown> = isObj(rec['player']) ? rec['player'] : {};
                const pos = p['position'];
                if (isObj(pos)) {
                    out.player.position = {
                        x: num(pos['x'], 0),
                        y: num(pos['y'], 0),
                        z: num(pos['z'], 0),
                    };
                }
                const rot = p['rotation'];
                if (isObj(rot)) out.player.rotation = { y: num(rot['y'], 0) };
                out.player.stats = cleanStats(p['stats']);
                if (Array.isArray(p['belt'])) {
                    out.player.belt = (p['belt'] as unknown[]).filter(
                        (x): x is string | null => typeof x === 'string' || x === null,
                    );
                }
                out.inventory = cleanInventory(p['inventory']);
                out.time = num(rec['time'], 0);
                if (Array.isArray(rec['structures'])) {
                    const structs = (rec['structures'] as unknown[]).filter(isObj).map((s) => ({
                        type: str(s['type'], 'foundation'),
                        pos: isObj(s['pos'])
                            ? {
                                  x: num((s['pos'] as Record<string, unknown>)['x'], 0),
                                  y: num((s['pos'] as Record<string, unknown>)['y'], 0),
                                  z: num((s['pos'] as Record<string, unknown>)['z'], 0),
                              }
                            : { x: 0, y: 0, z: 0 },
                        rot: num(s['rot'], 0),
                        tier: str(s['tier'], 'twig'),
                        health: num(s['health'], 10),
                        maxHealth: num(s['maxHealth'], 10),
                        isTC: s['isTC'] === true,
                    }));
                    out.buildings.structures = structs;
                    out.buildings.toolCupboards = structs
                        .filter((s) => s.isTC)
                        .map((s) => ({ pos: { x: s.pos.x, z: s.pos.z }, radius: 25 }));
                }
            } else {
                // ---- v2 (current): validate + fill defaults ----
                const p: Record<string, unknown> = isObj(rec['player']) ? rec['player'] : {};
                const pos = p['position'];
                if (isObj(pos)) {
                    out.player.position = {
                        x: num(pos['x'], 0),
                        y: num(pos['y'], 0),
                        z: num(pos['z'], 0),
                    };
                }
                const rot = p['rotation'];
                if (isObj(rot)) out.player.rotation = { y: num(rot['y'], 0) };
                out.player.stats = cleanStats(p['stats']);
                if (Array.isArray(p['belt'])) {
                    out.player.belt = (p['belt'] as unknown[]).filter(
                        (x): x is string | null => typeof x === 'string' || x === null,
                    );
                }
                out.player.dead = p['dead'] === true;
                out.inventory = cleanInventory(rec['inventory']);
                out.time = num(rec['time'], 0);
                const w: Record<string, unknown> = isObj(rec['world']) ? rec['world'] : {};
                out.world = {
                    respawns: Array.isArray(w['respawns'])
                        ? (w['respawns'] as unknown[]).filter(isObj)
                        : [],
                    storages: Array.isArray(w['storages'])
                        ? (w['storages'] as unknown[]).filter(isObj)
                        : [],
                    day: Math.max(1, Math.floor(num(w['day'], 1))),
                    weather: isObj(w['weather']) ? w['weather'] : null,
                };
                const b: Record<string, unknown> = isObj(rec['buildings']) ? rec['buildings'] : {};
                out.buildings = {
                    structures: Array.isArray(b['structures'])
                        ? (b['structures'] as unknown[]).filter(isObj)
                        : [],
                    toolCupboards: Array.isArray(b['toolCupboards'])
                        ? (b['toolCupboards'] as unknown[]).filter(isObj)
                        : [],
                };
            }
            out.saveVersion = SAVE_VERSION_CURRENT;
            out.timestamp = num(rec['timestamp'], Date.now());
            return out;
        } catch {
            return null;
        }
    },

    /** Parse + migrate + validate a raw JSON string. Returns save or null. */
    loadFromString(json: unknown): SaveGame | null {
        if (typeof json !== 'string' || !json) return null;
        try {
            return this.migrate(JSON.parse(json) as unknown);
        } catch {
            return null;
        }
    },

    toString(save: SaveGame): string | null {
        try {
            return JSON.stringify(save);
        } catch {
            return null;
        }
    },

    /**
     * Read with A/B + legacy fallback. Tries `<key>:a`, `<key>:b` and
     * legacy `<key>`; corrupt slots are ignored, newest timestamp wins.
     * Never throws — returns null when nothing valid exists.
     */
    read(storage: SaveStorage, key: string): SaveGame | null {
        try {
            const active = readActiveSlot(storage, key);
            const ordered: string[] =
                active === 'a'
                    ? [slotKey(key, 'a'), slotKey(key, 'b'), key]
                    : active === 'b'
                      ? [slotKey(key, 'b'), slotKey(key, 'a'), key]
                      : [slotKey(key, 'a'), slotKey(key, 'b'), key];
            const found: Array<{ save: SaveGame; rank: number }> = [];
            ordered.forEach((k, rank) => {
                const raw = safeGet(storage, k);
                if (typeof raw !== 'string' || !raw) return;
                const save = this.loadFromString(raw);
                if (save) found.push({ save, rank });
            });
            if (found.length === 0) return null;
            found.sort((x, y) => {
                const dt = y.save.timestamp - x.save.timestamp;
                return dt !== 0 ? dt : x.rank - y.rank;
            });
            const best = found[0];
            return best ? best.save : null;
        } catch {
            return null;
        }
    },

    /**
     * Write to the unused A/B slot, then flip the `<key>:active` pointer.
     * Keeps `write(): boolean` — failures surface via `lastWriteError`
     * (`QuotaExceededError`/quota label = storage full, for UI later).
     */
    write(storage: SaveStorage, key: string, save: SaveGame): boolean {
        const s = this.toString(save);
        if (s === null) {
            this.lastWriteError = 'encode-failed';
            return false;
        }
        try {
            const active = readActiveSlot(storage, key);
            const next: SlotId = active === 'a' ? 'b' : 'a';
            try {
                storage.setItem(slotKey(key, next), s);
            } catch (e) {
                this.lastWriteError = isQuotaError(e) ? quotaLabel(e) : 'write-failed';
                return false;
            }
            try {
                storage.setItem(pointerKey(key), next);
            } catch (e) {
                // Payload is already durable; pointer flip failed (likely quota).
                // Next read falls back to newest-timestamp comparison.
                this.lastWriteError = isQuotaError(e) ? quotaLabel(e) : 'write-failed';
                return false;
            }
            this.lastWriteError = null;
            return true;
        } catch (e) {
            this.lastWriteError = isQuotaError(e) ? quotaLabel(e) : 'write-failed';
            return false;
        }
    },

    /**
     * Autosave scheduler: calls saveFn at most every intervalMs, plus
     * explicit flush() (page hide / major events). No game imports.
     */
    createAutosaver(saveFn: () => void, intervalMs = 60000): SaveAutosaver {
        let timer: ReturnType<typeof setInterval> | null = null;
        let dirty = true;
        const api: SaveAutosaver = {
            markDirty(): void {
                dirty = true;
            },
            flush(): boolean {
                if (!dirty) return false;
                dirty = false;
                try {
                    saveFn();
                    return true;
                } catch {
                    return false;
                }
            },
            start(): void {
                api.stop();
                timer = setInterval(() => {
                    api.flush();
                }, intervalMs);
            },
            stop(): void {
                if (timer) clearInterval(timer);
                timer = null;
            },
        };
        return api;
    },
};
