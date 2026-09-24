// ============================================================
// RUSTGAME — Phase 1: Storage Inventory (independent of UI & player)
// Used by player inventory adapters and storage boxes.
// Invariants: no negative counts, no unknown items (when registry
// provided), stack limits respected. Pure module, Node-testable.
// ============================================================

import { getStackLimit } from './items.js';

export class StorageInventory {
    /**
     * @param {Array<{id,count}>} initial
     * @param {object|null} registry - known item ids (e.g. ITEMS_DATA + FOOD_DEFS).
     *   When null, any string id is accepted (legacy mode).
     */
    constructor(initial = [], registry = null) {
        this.items = [];
        this.registry = registry;
        if (Array.isArray(initial)) {
            for (const entry of initial) this.add(entry.id, entry.count);
        }
    }

    _known(id) {
        if (!id || typeof id !== 'string') return false;
        if (!this.registry) return true;
        if (this.registry[id]) return true;
        return false;
    }

    count(id) {
        const found = this.items.find(i => i.id === id);
        return found ? found.count : 0;
    }

    has(id, amount = 1) {
        if (typeof amount !== 'number' || amount <= 0) return false;
        return this.count(id) >= amount;
    }

    /** Add items. Returns amount actually added (stack cap may clamp). */
    add(id, amount = 1) {
        if (!this._known(id)) return 0;
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return 0;
        const addable = Math.floor(amount);
        if (addable <= 0) return 0;
        const limit = getStackLimit(id);
        const found = this.items.find(i => i.id === id);
        const current = found ? found.count : 0;
        const room = Math.max(0, limit - current);
        const actual = Math.min(room, addable);
        if (actual <= 0) return 0;
        if (found) found.count += actual;
        else this.items.push({ id, count: actual });
        return actual;
    }

    /** Remove items. Returns amount actually removed. Never negative. */
    remove(id, amount = 1) {
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return 0;
        const found = this.items.find(i => i.id === id);
        if (!found) return 0;
        const actual = Math.min(found.count, Math.floor(amount));
        found.count -= actual;
        if (found.count <= 0) this.items.splice(this.items.indexOf(found), 1);
        return actual;
    }

    /** Consume = remove, but all-or-nothing. Returns true on success. */
    consume(id, amount = 1) {
        if (!this.has(id, amount)) return false;
        this.remove(id, amount);
        return true;
    }

    /** Move items to another StorageInventory. Returns amount moved. */
    transferTo(other, id, amount = 1) {
        if (!other || typeof other.add !== 'function') return 0;
        const removed = this.remove(id, amount);
        if (removed <= 0) return 0;
        const added = other.add(id, removed);
        if (added < removed) this.add(id, removed - added); // return leftover
        return added;
    }

    total() {
        return this.items.reduce((a, b) => a + b.count, 0);
    }

    toJSON() {
        return this.items.map(i => ({ id: i.id, count: i.count }));
    }

    static fromJSON(data, registry = null) {
        const inv = new StorageInventory([], registry);
        if (Array.isArray(data)) {
            for (const entry of data) {
                if (entry && typeof entry.id === 'string') inv.add(entry.id, entry.count);
            }
        }
        return inv;
    }
}
