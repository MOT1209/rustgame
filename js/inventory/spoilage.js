// ============================================================
// RUSTGAME — Phase 2.2: food spoilage
// Raw meat rots. The clock is per item id and starts when the
// player first picks the item up; it is persisted with the save
// (SAVE_VERSION 4) so reloading cannot reset it.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

import { FOOD_DEFS } from './items.js';

/** Health penalty when eating a spoiled item. */
export const SPOIL_PENALTY = {
    berry: 8,
    raw_meat: 15,
    cooked_meat: 25,
};

/** Seconds an item stays fresh. 0 = never spoils. */
export function spoilSecondsFor(id) {
    const def = FOOD_DEFS[id];
    if (!def || typeof def.spoilTime !== 'number') return 0;
    return Math.max(0, def.spoilTime);
}

export function canSpoil(id) {
    return spoilSecondsFor(id) > 0;
}

/**
 * Starts the rot clock for an item. The clock is never reset by picking up
 * more of the same item — the oldest portion is the one that rots.
 * @param {string} id
 * @param {Record<string, number>} spoiledAt mutated in place
 * @param {number} nowMs
 */
export function startSpoiling(id, spoiledAt, nowMs) {
    if (!spoiledAt || typeof spoiledAt !== 'object') return spoiledAt;
    if (!canSpoil(id)) return spoiledAt;
    if (typeof spoiledAt[id] !== 'number') spoiledAt[id] = nowMs;
    return spoiledAt;
}

/** Seconds since the item started rotting (0 when it never rots). */
export function ageSeconds(id, spoiledAt, nowMs) {
    if (!canSpoil(id) || !spoiledAt) return 0;
    const started = spoiledAt[id];
    if (typeof started !== 'number') return 0;
    return Math.max(0, (nowMs - started) / 1000);
}

export function isSpoiled(id, spoiledAt, nowMs) {
    const seconds = spoilSecondsFor(id);
    if (!seconds) return false;
    return ageSeconds(id, spoiledAt, nowMs) >= seconds;
}

/** The ids that are spoiled right now. */
export function spoiledItemIds(spoiledAt, nowMs) {
    if (!spoiledAt || typeof spoiledAt !== 'object') return [];
    return Object.keys(spoiledAt).filter((id) => isSpoiled(id, spoiledAt, nowMs));
}

/** The health penalty for eating a spoiled item (0 when it is still fresh). */
export function spoilagePenalty(id, spoiledAt, nowMs) {
    if (!isSpoiled(id, spoiledAt, nowMs)) return 0;
    return SPOIL_PENALTY[id] || 0;
}

/** Drops the clocks of items the player no longer has. */
export function pruneSpoilage(spoiledAt, ownedIds) {
    if (!spoiledAt || typeof spoiledAt !== 'object') return spoiledAt;
    const owned = new Set(ownedIds || []);
    for (const id of Object.keys(spoiledAt)) {
        if (!owned.has(id)) delete spoiledAt[id];
    }
    return spoiledAt;
}
