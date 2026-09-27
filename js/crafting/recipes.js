// ============================================================
// RUSTGAME — Crafting Recipes (single source of truth)
// Recipe: { id, name, category, ingredients, result, craftTime,
//           workbenchRequired }. Pure logic, Node-testable.
// Inventory adapter: any object with has(id,amt)/remove(id,amt)/add(id,amt).
//
// Ingredient amounts are the official balance: they mirror ITEMS_DATA[id]
// .recipe in game.js exactly (that was the live, shipped balance — this
// table used to disagree with it and was never actually imported by
// game.js). game.js now imports getRecipe()/craft() from here instead of
// reading item.recipe directly, so this is the only place that defines
// crafting costs. craftTime/workbenchRequired are metadata only for now —
// game.js crafts instantly and doesn't gate on a workbench yet (both are
// ready for a Phase 2 queued-crafting / crafting-station feature).
// ============================================================

export const PHASE1_RECIPES = {
    stone_axe: {
        id: 'stone_axe', name: 'Stone Hatchet', category: 'tools',
        ingredients: { wood: 200, stone: 100 },
        result: { id: 'stone_hatchet', count: 1 },
        craftTime: 5, workbenchRequired: false,
        desc: 'Primitive tool for wood harvesting.',
    },
    stone_pickaxe: {
        id: 'stone_pickaxe', name: 'Stone Pickaxe', category: 'tools',
        ingredients: { wood: 200, stone: 100 },
        result: { id: 'stone_pickaxe', count: 1 },
        craftTime: 5, workbenchRequired: false,
        desc: 'Slow but effective for basic mining.',
    },
    hammer: {
        id: 'hammer', name: 'Building Hammer', category: 'tools',
        ingredients: { wood: 100 },
        result: { id: 'hammer', count: 1 },
        craftTime: 4, workbenchRequired: false,
        desc: 'Construct and upgrade your base.',
    },
    torch: {
        id: 'torch', name: 'Torch', category: 'tools',
        ingredients: { wood: 50, lgf: 1 },
        result: { id: 'torch', count: 1 },
        craftTime: 3, workbenchRequired: false,
        desc: 'Provides light and subtle heat.',
    },
    spear: {
        id: 'spear', name: 'Wooden Spear', category: 'weapons',
        ingredients: { wood: 300 },
        result: { id: 'spear', count: 1 },
        craftTime: 6, workbenchRequired: false,
        desc: 'Cheap long-range melee option.',
    },
    machete: {
        id: 'machete', name: 'Machete', category: 'weapons',
        ingredients: { iron: 100 },
        result: { id: 'machete', count: 1 },
        craftTime: 8, workbenchRequired: false,
        desc: 'Standard industrial blade.',
    },
    bow: {
        id: 'bow', name: 'Hunting Bow', category: 'weapons',
        ingredients: { wood: 200, cloth: 50 },
        result: { id: 'bow', count: 1 },
        craftTime: 8, workbenchRequired: false,
        desc: 'Silent and deadly ranged tool.',
    },
    pistol: {
        id: 'pistol', name: 'Semi-Pistol', category: 'weapons',
        ingredients: { iron: 150, pipe: 1 },
        result: { id: 'pistol', count: 1 },
        craftTime: 10, workbenchRequired: false,
        desc: 'P250 clone. Fast firing sidearm.',
    },
    ak47: {
        id: 'ak47', name: 'Assault Rifle', category: 'weapons',
        ingredients: { hqm: 50, wood: 200, scrap: 50, pipe: 1 },
        result: { id: 'ak47', count: 1 },
        craftTime: 15, workbenchRequired: false,
        desc: 'The king of Rust weapons. High recoil, high reward.',
    },
    furnace: {
        id: 'furnace', name: 'Furnace', category: 'items',
        ingredients: { stone: 200, wood: 100, lgf: 10 },
        result: { id: 'furnace', count: 1 },
        craftTime: 12, workbenchRequired: false,
        desc: 'Smelts ores into metal/sulfur using wood.',
    },
    campfire: {
        id: 'campfire', name: 'Campfire', category: 'survival',
        ingredients: { wood: 100 },
        result: { id: 'campfire', count: 1 },
        craftTime: 10, workbenchRequired: false,
        desc: 'Useful for light and cooking meat.',
    },
    building_plan: {
        id: 'building_plan', name: 'Building Plan', category: 'tools',
        ingredients: { wood: 20 },
        result: { id: 'building_plan', count: 1 },
        craftTime: 2, workbenchRequired: false,
        desc: 'Select building pieces to place.',
    },
    door: {
        id: 'door', name: 'Wood Door', category: 'construction',
        ingredients: { wood: 300 },
        result: { id: 'door', count: 1 },
        craftTime: 6, workbenchRequired: false,
        desc: 'Access point with minimal security.',
    },
    lock: {
        id: 'lock', name: 'Key Lock', category: 'construction',
        ingredients: { iron: 100 },
        result: { id: 'lock', count: 1 },
        craftTime: 4, workbenchRequired: false,
        desc: 'Basic protection for your base.',
    },
    bandage: {
        id: 'bandage', name: 'Bandage', category: 'medical',
        ingredients: { cloth: 2 },
        result: { id: 'bandage', count: 1 },
        craftTime: 3, workbenchRequired: false,
        desc: 'Stops bleeding immediately.',
    },
    syringe: {
        id: 'syringe', name: 'Medical Syringe', category: 'medical',
        ingredients: { iron: 20, scrap: 5, cloth: 10 },
        result: { id: 'syringe', count: 1 },
        craftTime: 6, workbenchRequired: false,
        desc: 'Instant adrenaline-boosted recovery.',
    },
    wooden_door: {
        id: 'wooden_door', name: 'Wooden Door', category: 'construction',
        ingredients: { wood: 300 },
        result: { id: 'wooden_door', count: 1 },
        craftTime: 6, workbenchRequired: false,
        desc: 'Fits into doorways.',
    },
    codelock: {
        id: 'codelock', name: 'Code Lock', category: 'items',
        ingredients: { frag: 100 },
        result: { id: 'codelock', count: 1 },
        craftTime: 5, workbenchRequired: false,
        desc: 'Secure your doors with a 4-digit code.',
    },
    wooden_box: {
        id: 'wooden_box', name: 'Wooden Storage Box', category: 'survival',
        ingredients: { wood: 150 },
        result: { id: 'wooden_box', count: 1 },
        craftTime: 8, workbenchRequired: false,
        desc: 'Placeable container. Stores 12 stacks.',
    },
};

export function getRecipe(id) {
    return PHASE1_RECIPES[id] || null;
}

/** Missing ingredients for qty crafts: { id: stillNeeded } (empty = craftable). */
export function missingFor(recipe, inv, qty = 1) {
    const missing = {};
    if (!recipe || !inv) return { _invalid: 1 };
    const q = Math.max(1, Math.floor(qty) || 1);
    for (const [res, amt] of Object.entries(recipe.ingredients || {})) {
        const need = amt * q;
        const have = inv.has(res, need) ? need : (typeof inv.count === 'function' ? inv.count(res) : 0);
        if (have < need) missing[res] = need - have;
    }
    return missing;
}

export function canCraft(recipe, inv, qty = 1) {
    return Object.keys(missingFor(recipe, inv, qty)).length === 0;
}

/**
 * Perform the craft. All-or-nothing: validates first, then consumes,
 * then grants the result. Returns { ok, crafted, missing }.
 * Never produces negative inventory.
 */
export function craft(recipe, inv, qty = 1) {
    const missing = missingFor(recipe, inv, qty);
    if (Object.keys(missing).length > 0) return { ok: false, crafted: 0, missing };
    const q = Math.max(1, Math.floor(qty) || 1);
    for (const [res, amt] of Object.entries(recipe.ingredients)) {
        const ok = inv.consume ? inv.consume(res, amt * q) : (inv.remove(res, amt * q) === amt * q);
        if (!ok) {
            // Should never happen after validation; abort without granting.
            return { ok: false, crafted: 0, missing: { [res]: amt * q } };
        }
    }
    const out = recipe.result || {};
    if (out.id && inv.add) inv.add(out.id, (out.count || 1) * q);
    return { ok: true, crafted: q, missing: {} };
}
