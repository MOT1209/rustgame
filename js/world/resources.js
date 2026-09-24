// ============================================================
// RUSTGAME — Phase 1: Resource Node Definitions & Respawn
// Base architecture: every node has health, resourceType, amount
// (yield per hit), respawnTime, gatherTool, gatherYield.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

export const NODE_TYPES = {
    tree: {
        type: 'tree', name: 'Tree',
        health: 5, resourceType: 'wood', yieldPerHit: 12,
        respawnTime: 120, gatherTool: 'axe',
        desc: 'Hit for wood.',
    },
    rock: {
        type: 'rock', name: 'Rock',
        health: 6, resourceType: 'stone', yieldPerHit: 10,
        respawnTime: 150, gatherTool: 'pickaxe',
        desc: 'Mine for stone.',
    },
    iron: {
        type: 'iron', name: 'Metal Ore',
        health: 6, resourceType: 'iron', yieldPerHit: 8,
        respawnTime: 180, gatherTool: 'pickaxe',
        desc: 'Mine for metal ore.',
    },
    sulfur: {
        type: 'sulfur', name: 'Sulfur Ore',
        health: 6, resourceType: 'sulfur', yieldPerHit: 8,
        respawnTime: 180, gatherTool: 'pickaxe',
        desc: 'Mine for sulfur ore.',
    },
    hemp: {
        type: 'hemp', name: 'Hemp Plant',
        health: 2, resourceType: 'cloth', yieldPerHit: 6,
        respawnTime: 90, gatherTool: 'hand',
        desc: 'Pick for cloth fibers.',
    },
    berry_bush: {
        type: 'berry_bush', name: 'Berry Bush',
        health: 2, resourceType: 'berry', yieldPerHit: 5,
        respawnTime: 100, gatherTool: 'hand',
        desc: 'Pick for berries.',
    },
    barrel: {
        type: 'barrel', name: 'Loot Barrel',
        health: 3, resourceType: 'scrap', yieldPerHit: 3,
        bonusYield: { lgf: 2 },
        respawnTime: 200, gatherTool: 'any',
        desc: 'Break for scrap and fuel.',
    },
};

export function getNodeDef(type) {
    return NODE_TYPES[type] || null;
}

/** Tool bonus: right tool harvests faster (fewer hits). */
export function hitsForYield(nodeDef, toolId) {
    if (!nodeDef) return 1;
    if (nodeDef.gatherTool === 'any' || nodeDef.gatherTool === 'hand') return 1;
    if (!toolId) return 1;
    const t = String(toolId);
    if (nodeDef.gatherTool === 'axe' && (t.includes('hatchet') || t.includes('axe'))) return 2;
    if (nodeDef.gatherTool === 'pickaxe' && (t.includes('pickaxe') || t.includes('pick'))) return 2;
    return 1;
}

export function yieldForHit(nodeDef, toolId) {
    if (!nodeDef) return {};
    const mult = hitsForYield(nodeDef, toolId);
    const out = { [nodeDef.resourceType]: nodeDef.yieldPerHit * mult };
    if (nodeDef.bonusYield) {
        for (const [k, v] of Object.entries(nodeDef.bonusYield)) out[k] = (out[k] || 0) + v;
    }
    return out;
}

/**
 * RespawnManager: serializable pending-respawn queue.
 * nowMs provider injectable for tests.
 */
export class RespawnManager {
    constructor(nowFn = () => Date.now()) {
        this.nowFn = nowFn;
        this.queue = []; // [{ key, type, pos:{x,y,z}, at }]
    }

    schedule(key, type, pos, delaySec) {
        this.remove(key);
        this.queue.push({ key, type, pos: { ...pos }, at: this.nowFn() + delaySec * 1000 });
    }

    remove(key) {
        this.queue = this.queue.filter(e => e.key !== key);
    }

    /** Returns entries whose timer elapsed (and drops them). */
    due() {
        const now = this.nowFn();
        const ready = this.queue.filter(e => e.at <= now);
        if (ready.length) {
            const keys = new Set(ready.map(e => e.key));
            this.queue = this.queue.filter(e => !keys.has(e.key));
        }
        return ready;
    }

    pendingCount() {
        return this.queue.length;
    }

    toJSON() {
        const now = this.nowFn();
        // Persist remaining seconds (robust across reloads).
        return this.queue.map(e => ({
            key: e.key, type: e.type, pos: e.pos,
            remaining: Math.max(0, Math.round((e.at - now) / 1000)),
        }));
    }

    static fromJSON(data, nowFn = () => Date.now()) {
        const m = new RespawnManager(nowFn);
        if (Array.isArray(data)) {
            const now = nowFn();
            for (const e of data) {
                if (!e || !e.key || !e.type || !e.pos) continue;
                m.queue.push({ key: e.key, type: e.type, pos: { ...e.pos }, at: now + (e.remaining || 60) * 1000 });
            }
        }
        return m;
    }
}
