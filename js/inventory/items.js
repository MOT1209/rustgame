// ============================================================
// RUSTGAME — Phase 1: Food & Consumable Item Definitions
// Data model is spoil-ready (spoilTime) for a later phase.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

export const FOOD_DEFS = {
    berry: {
        id: 'berry', name: 'Berry', category: 'food',
        hungerRestore: 8, thirstRestore: 4, healthRestore: 0,
        spoilTime: 0, stackSize: 20, icon: 'fa-berry', color: '#ab47bc',
        desc: 'Wild berry. Small snack, slightly hydrating.',
    },
    raw_meat: {
        id: 'raw_meat', name: 'Raw Meat', category: 'food',
        hungerRestore: 10, thirstRestore: 0, healthRestore: -5,
        spoilTime: 0, stackSize: 10, icon: 'fa-drumstick-bite', color: '#ef5350',
        desc: 'Risky raw. Cook it at a campfire first.',
    },
    cooked_meat: {
        id: 'cooked_meat', name: 'Cooked Meat', category: 'food',
        hungerRestore: 35, thirstRestore: 0, healthRestore: 5,
        spoilTime: 0, stackSize: 10, icon: 'fa-drumstick-bite', color: '#8d6e63',
        desc: 'Campfire-cooked. Solid meal.',
    },
    canned_food: {
        id: 'canned_food', name: 'Canned Food', category: 'food',
        hungerRestore: 30, thirstRestore: 5, healthRestore: 0,
        spoilTime: 0, stackSize: 10, icon: 'fa-can-food', color: '#ffb74d',
        desc: 'Looted can. Never spoils.',
    },
    water: {
        id: 'water', name: 'Water', category: 'food',
        hungerRestore: 0, thirstRestore: 40, healthRestore: 0,
        spoilTime: 0, stackSize: 10, icon: 'fa-bottle-water', color: '#4fc3f7',
        desc: 'Clean drinking water.',
    },
    bandage: {
        id: 'bandage', name: 'Bandage', category: 'medical',
        hungerRestore: 0, thirstRestore: 0, healthRestore: 25,
        spoilTime: 0, stackSize: 10, icon: 'fa-band-aid', color: '#e57373',
        desc: 'Stops bleeding, restores health.',
    },
};

export const STACK_LIMITS = {
    wood: 1000, stone: 1000, iron: 500, sulfur: 500, hqm: 100,
    frag: 500, cloth: 500, scrap: 100,
    berry: 20, raw_meat: 10, cooked_meat: 10, canned_food: 10, water: 10, bandage: 10,
};

export function getFoodDef(id) {
    return FOOD_DEFS[id] || null;
}

export function getStackLimit(id) {
    if (STACK_LIMITS[id] !== undefined) return STACK_LIMITS[id];
    const food = FOOD_DEFS[id];
    if (food) return food.stackSize;
    return 999;
}

/** Validate an item id against known game items (registry passed by game). */
export function isKnownItem(id, extraRegistry = null) {
    if (!id || typeof id !== 'string') return false;
    if (FOOD_DEFS[id]) return true;
    if (extraRegistry && extraRegistry[id]) return true;
    return false;
}
