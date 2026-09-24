// ============================================================
// RUSTGAME — Phase 1: Unified Interaction System
// E = Interact for everything: gather, storage, drink, pickup,
// loot, use, door. Handlers register by target kind with a
// priority; the game adapter feeds raycast hits. Pure module.
// ============================================================

export const InteractKinds = {
    GATHER: 'gather',
    STORAGE: 'storage',
    DRINK: 'drink',
    PICKUP: 'pickup',
    LOOT: 'loot',
    USE: 'use',
    DOOR: 'door',
};

export class InteractionSystem {
    constructor() {
        this.handlers = new Map(); // kind -> { priority, canInteract, label, act }
    }

    register(kind, handler) {
        if (!kind || !handler) return;
        this.handlers.set(kind, {
            priority: 0,
            canInteract: () => false,
            label: () => 'Interact',
            act: () => false,
            ...handler,
        });
    }

    unregister(kind) {
        this.handlers.delete(kind);
    }

    /**
     * Pick the best available interaction for a target context.
     * ctx: arbitrary object passed to handlers (target, distance, player...).
     * Returns { kind, label } or null.
     */
    getInteractable(ctx) {
        let best = null;
        for (const [kind, h] of this.handlers) {
            let ok = false;
            try { ok = !!h.canInteract(ctx); } catch (_) { ok = false; }
            if (!ok) continue;
            if (!best || h.priority > best.priority) {
                let label = kind;
                try { label = h.label(ctx) || kind; } catch (_) {}
                best = { kind, label, priority: h.priority };
            }
        }
        return best ? { kind: best.kind, label: best.label } : null;
    }

    /** Execute the interaction. Returns true if handled. */
    interact(ctx) {
        const found = this.getInteractable(ctx);
        if (!found) return false;
        const h = this.handlers.get(found.kind);
        try {
            return !!h.act(ctx);
        } catch (_) {
            return false;
        }
    }

    kinds() {
        return [...this.handlers.keys()];
    }
}
