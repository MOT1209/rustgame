// ============================================================
// RUSTGAME — Phase 1: Water Sources & Drinking
// Sources: river / lake / water container. Phase-1 interaction:
// press E near a source -> drink. Designed for bottle/canteen/
// purifier extensions in later phases. Pure module.
// ============================================================

export const WATER_SOURCES = {
    lake: { type: 'lake', name: 'Lake', drinkAmount: 40, radius: 6, infinite: true },
    river: { type: 'river', name: 'River', drinkAmount: 35, radius: 5, infinite: true },
    container: { type: 'container', name: 'Water Container', drinkAmount: 40, radius: 3, infinite: false, capacity: 200 },
};

export function getWaterSource(type) {
    return WATER_SOURCES[type] || null;
}

/**
 * Drink from a source. Mutates stats.thirst (clamped) and, for finite
 * containers, source.level. Returns { drank, thirstAfter }.
 * stats: { thirst }; source: { type, level? }.
 */
export function drink(stats, source, maxThirst = 100) {
    const def = getWaterSource(source && source.type);
    if (!def || !stats) return { drank: 0, thirstAfter: stats ? stats.thirst : 0 };
    let amount = def.drinkAmount;
    if (!def.infinite) {
        const level = typeof source.level === 'number' ? source.level : def.capacity;
        amount = Math.min(amount, Math.max(0, level));
        source.level = level - amount;
        if (amount <= 0) return { drank: 0, thirstAfter: stats.thirst, empty: true };
    }
    const before = Math.max(0, Math.min(maxThirst, stats.thirst || 0));
    stats.thirst = Math.min(maxThirst, before + amount);
    return { drank: stats.thirst - before, thirstAfter: stats.thirst };
}
