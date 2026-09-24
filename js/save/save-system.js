// ============================================================
// RUSTGAME — Phase 1: Save System (versioned, validated, migrating)
// Save shape:
// { saveVersion, player, inventory, world, buildings, time }
// Pure module: storage backend injectable (localStorage in game,
// memory-map in tests). No DOM.
// ============================================================

import { SAVE_VERSION } from '../core/config.ts';

export const SAVE_VERSION_CURRENT = SAVE_VERSION;

function isObj(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
}

function num(v, fallback) {
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
}

function cleanStats(s) {
    const d = isObj(s) ? s : {};
    return {
        health: num(d.health, 100),
        hunger: num(d.hunger, 100),
        thirst: num(d.thirst, 100),
        stamina: num(d.stamina, 100),
        temperature: num(d.temperature, 100),
        radiation: num(d.radiation, 0),
        bleeding: num(d.bleeding, 0),
    };
}

function cleanInventory(inv) {
    if (!Array.isArray(inv)) return [];
    /** @type {Array<{id: string, count: number}>} */
    const out = [];
    for (const e of inv) {
        if (!e || typeof e.id !== 'string') continue;
        const count = Math.floor(num(e.count, 0));
        if (count <= 0) continue;
        out.push({ id: e.id, count });
    }
    return out;
}

export const SaveSystem = {
    version: SAVE_VERSION_CURRENT,

    /**
     * @returns {{saveVersion:number,timestamp:number,player:{position:{x:number,y:number,z:number},rotation:{y:number},stats:any,belt:Array<string|null>,dead:boolean},inventory:Array<{id:string,count:number}>,world:{respawns:any[],storages:any[],day:number,weather:any},buildings:{structures:any[],toolCupboards:any[]},time:number}}
     */
    blank() {
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
    migrate(data) {
        if (!isObj(data)) return null;
        const v = num(data.version, data.saveVersion);
        const out = this.blank();
        try {
            if (v === 1 || v === 1.0) {
                // ---- v1 (legacy game.js) ----
                const p = isObj(data.player) ? data.player : {};
                if (isObj(p.position)) {
                    out.player.position = {
                        x: num(p.position.x, 0), y: num(p.position.y, 0), z: num(p.position.z, 0),
                    };
                }
                if (isObj(p.rotation)) out.player.rotation = { y: num(p.rotation.y, 0) };
                out.player.stats = cleanStats(p.stats);
                if (Array.isArray(p.belt)) out.player.belt = p.belt.filter(x => typeof x === 'string' || x === null);
                out.inventory = cleanInventory(p.inventory);
                out.time = num(data.time, 0);
                if (Array.isArray(data.structures)) {
                    out.buildings.structures = data.structures.filter(isObj).map(s => ({
                        type: typeof s.type === 'string' ? s.type : 'foundation',
                        pos: isObj(s.pos) ? { x: num(s.pos.x, 0), y: num(s.pos.y, 0), z: num(s.pos.z, 0) } : { x: 0, y: 0, z: 0 },
                        rot: num(s.rot, 0),
                        tier: typeof s.tier === 'string' ? s.tier : 'twig',
                        health: num(s.health, 10),
                        maxHealth: num(s.maxHealth, 10),
                        isTC: !!s.isTC,
                    }));
                    out.buildings.toolCupboards = out.buildings.structures
                        .filter(s => s.isTC)
                        .map(s => ({ pos: { x: s.pos.x, z: s.pos.z }, radius: 25 }));
                }
            } else {
                // ---- v2 (current): validate + fill defaults ----
                const p = isObj(data.player) ? data.player : {};
                if (isObj(p.position)) {
                    out.player.position = {
                        x: num(p.position.x, 0), y: num(p.position.y, 0), z: num(p.position.z, 0),
                    };
                }
                if (isObj(p.rotation)) out.player.rotation = { y: num(p.rotation.y, 0) };
                out.player.stats = cleanStats(p.stats);
                if (Array.isArray(p.belt)) out.player.belt = p.belt.filter(x => typeof x === 'string' || x === null);
                out.player.dead = !!p.dead;
                out.inventory = cleanInventory(data.inventory);
                out.time = num(data.time, 0);
                const w = isObj(data.world) ? data.world : {};
                out.world = {
                    respawns: Array.isArray(w.respawns) ? w.respawns.filter(isObj) : [],
                    storages: Array.isArray(w.storages) ? w.storages.filter(isObj) : [],
                    day: Math.max(1, Math.floor(num(w.day, 1))),
                    weather: isObj(w.weather) ? w.weather : null,
                };
                const b = isObj(data.buildings) ? data.buildings : {};
                out.buildings = {
                    structures: Array.isArray(b.structures) ? b.structures.filter(isObj) : [],
                    toolCupboards: Array.isArray(b.toolCupboards) ? b.toolCupboards.filter(isObj) : [],
                };
            }
            out.saveVersion = SAVE_VERSION_CURRENT;
            out.timestamp = num(data.timestamp, Date.now());
            return out;
        } catch (_) {
            return null;
        }
    },

    /** Parse + migrate + validate a raw JSON string. Returns save or null. */
    loadFromString(json) {
        if (typeof json !== 'string' || !json) return null;
        try {
            return this.migrate(JSON.parse(json));
        } catch (_) {
            return null;
        }
    },

    toString(save) {
        try {
            return JSON.stringify(save);
        } catch (_) {
            return null;
        }
    },

    /** Storage-backed helpers (pass localStorage in game). */
    read(storage, key) {
        try {
            return this.loadFromString(storage.getItem(key));
        } catch (_) {
            return null;
        }
    },

    write(storage, key, save) {
        const s = this.toString(save);
        if (s === null) return false;
        try {
            storage.setItem(key, s);
            return true;
        } catch (_) {
            return false;
        }
    },

    /**
     * Autosave scheduler: calls saveFn at most every intervalMs, plus
     * explicit flush() (page hide / major events). No game imports.
     */
    createAutosaver(saveFn, intervalMs = 60000) {
        let timer = null;
        let dirty = true;
        const api = {
            markDirty() { dirty = true; },
            flush() {
                if (!dirty) return false;
                dirty = false;
                try { saveFn(); return true; } catch (_) { return false; }
            },
            start() {
                api.stop();
                timer = setInterval(() => api.flush(), intervalMs);
            },
            stop() {
                if (timer) clearInterval(timer);
                timer = null;
            },
        };
        return api;
    },
};
