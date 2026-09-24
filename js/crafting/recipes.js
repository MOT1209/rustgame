// ============================================================
// RUSTGAME — Phase 1: Crafting Recipes (core survival only)
// Recipe: { id, name, category, ingredients, result, craftTime,
//           workbenchRequired }. Pure logic, Node-testable.
// Inventory adapter: any object with has(id,amt)/remove(id,amt)/add(id,amt).
// ============================================================

export const PHASE1_RECIPES = {
    stone_axe: {
        id: 'stone_axe', name: 'Stone Axe', category: 'tools',
        ingredients: { wood: 50, stone: 25 },
        result: { id: 'stone_hatchet', count: 1 },
        craftTime: 5, workbenchRequired: false,
        desc: 'Basic gathering tool. Faster wood intake.',
    },
    torch: {
        id: 'torch', name: 'Torch', category: 'tools',
        ingredients: { wood: 20, cloth: 5 },
        result: { id: 'torch', count: 1 },
        craftTime: 3, workbenchRequired: false,
        desc: 'Light and subtle warmth at night.',
    },
    campfire: {
        id: 'campfire', name: 'Campfire', category: 'survival',
        ingredients: { wood: 100, stone: 50 },
        result: { id: 'campfire', count: 1 },
        craftTime: 10, workbenchRequired: false,
        desc: 'Warmth, light and a place to cook meat.',
    },
    bandage: {
        id: 'bandage', name: 'Bandage', category: 'medical',
        ingredients: { cloth: 4 },
        result: { id: 'bandage', count: 1 },
        craftTime: 3, workbenchRequired: false,
        desc: 'Stops bleeding, restores 25 HP.',
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
