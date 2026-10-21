// ============================================================
// RUSTGAME — Phase 2.2: smelting (raw ore → fragments)
// A smelt runs at a campfire: you feed it ore and fuel, wait, and
// collect the result. All the rules live here so they can be
// unit-tested; the game only owns the timer and the world object.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

/**
 * Smelt recipes. `input` is the ore, `fuel` is what burns.
 * The campfire is the smelter for this phase — the craftable `furnace`
 * item is still inert (see plan.md P3).
 */
export const SMELT_RECIPES = {
    iron: {
        id: 'iron',
        input: 'iron',
        output: 'frag',
        count: 1,
        fuel: 'wood',
        fuelCount: 2,
        timeSec: 8,
        label: 'Smelt iron',
    },
    sulfur: {
        id: 'sulfur',
        input: 'sulfur',
        output: 'sulfur',
        count: 1,
        fuel: 'wood',
        fuelCount: 3,
        timeSec: 12,
        label: 'Roast sulfur',
    },
};

export function getSmeltRecipe(id) {
    return SMELT_RECIPES[id] || null;
}

/**
 * Can this recipe start right now?
 * @param {string} recipeId
 * @param {(id:string)=>number} countOf item counts
 */
export function canSmelt(recipeId, countOf) {
    const recipe = getSmeltRecipe(recipeId);
    if (!recipe || typeof countOf !== 'function') return false;
    if ((countOf(recipe.input) || 0) < 1) return false;
    return (countOf(recipe.fuel) || 0) >= recipe.fuelCount;
}

/**
 * A running smelt. The caller owns the clock — the session never reads
 * Date.now() itself, so it stays deterministic and testable.
 */
export class SmeltSession {
    constructor(recipeId, startedAtMs) {
        this.recipe = getSmeltRecipe(recipeId);
        this.recipeId = this.recipe ? this.recipe.id : null;
        this.startedAtMs = startedAtMs;
        this.collected = false;
    }

    get isValid() { return !!this.recipe; }
    get durationMs() { return this.recipe ? this.recipe.timeSec * 1000 : 0; }
    /** Milliseconds since the smelt started. */
    elapsedMs(nowMs) {
        if (!this.recipe) return 0;
        return Math.max(0, nowMs - this.startedAtMs);
    }

    /** 0 → 1, clamped. */
    progress01(nowMs) {
        if (!this.recipe || this.durationMs <= 0) return 1;
        return Math.min(1, this.elapsedMs(nowMs) / this.durationMs);
    }

    isDone(nowMs) {
        if (!this.recipe) return false;
        return this.elapsedMs(nowMs) >= this.durationMs;
    }

    /** Progress as a whole percent for the prompt. */
    percent(nowMs) { return Math.round(this.progress01(nowMs) * 100); }

    /**
     * Takes the result out of the furnace. Returns { output, count } the
     * first time it is done, and null afterwards — a smelt yields once.
     */
    collect(nowMs) {
        if (!this.recipe || this.collected || !this.isDone(nowMs)) return null;
        this.collected = true;
        return { output: this.recipe.output, count: this.recipe.count };
    }
}
