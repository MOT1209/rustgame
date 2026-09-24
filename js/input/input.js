// ============================================================
// RUSTGAME — Phase 1: Input Abstraction (foundation)
// Gameplay queries ACTIONS, never raw keys. Providers:
// keyboard, mouse, touch (data passthrough from the existing
// touch layer), gamepad (polled). No DOM listeners are attached
// by default — the game wires providers to keep one owner of
// window events (no breakage of the current control layer).
// ============================================================

export const Actions = {
    FORWARD: 'forward',
    BACK: 'back',
    LEFT: 'left',
    RIGHT: 'right',
    JUMP: 'jump',
    SPRINT: 'sprint',
    CROUCH: 'crouch',
    ATTACK: 'attack',
    INTERACT: 'interact',
    INVENTORY: 'inventory',
    BUILD: 'build',
    RELOAD: 'reload',
};

export class InputSystem {
    constructor() {
        this.state = {};      // action -> bool
        this.providers = [];  // { name, read(input) }
        this.touch = { active: false, moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 };
        for (const a of Object.values(Actions)) this.state[a] = false;
    }

    addProvider(provider) {
        if (provider && typeof provider.read === 'function') this.providers.push(provider);
    }

    /** Feed external touch data (from unified-game-controls layer). */
    setTouch(data) {
        Object.assign(this.touch, data || {});
        if (typeof data?.moveX === 'number' || typeof data?.moveY === 'number') {
            this.touch.active = true;
        }
    }

    /** Poll all providers; call once per frame. */
    poll() {
        const next = {};
        for (const a of Object.values(Actions)) next[a] = false;
        for (const p of this.providers) {
            try {
                const partial = p.read(this) || {};
                for (const [k, v] of Object.entries(partial)) {
                    if (k in next && v) next[k] = true;
                }
            } catch (_) {}
        }
        this.state = next;
        return this.state;
    }

    isDown(action) {
        return !!this.state[action];
    }
}

/** Keyboard provider over a key-state map (game owns listeners). */
export function keyboardProvider(keyDown, map) {
    const codeMap = map || {
        KeyW: Actions.FORWARD, KeyS: Actions.BACK, KeyA: Actions.LEFT, KeyD: Actions.RIGHT,
        Space: Actions.JUMP, ShiftLeft: Actions.SPRINT, ShiftRight: Actions.SPRINT,
        KeyC: Actions.CROUCH, KeyF: Actions.ATTACK, KeyE: Actions.INTERACT,
        KeyB: Actions.BUILD, KeyR: Actions.RELOAD, Tab: Actions.INVENTORY,
    };
    return {
        name: 'keyboard',
        read() {
            const out = {};
            for (const [code, action] of Object.entries(codeMap)) {
                if (keyDown[code]) out[action] = true;
            }
            return out;
        },
    };
}

/** Touch provider: maps touch joystick/buttons to actions. */
export function touchProvider(buttons) {
    // buttons: { attack, jump, interact, sprint, crouch } booleans + move vector
    return {
        name: 'touch',
        read(input) {
            const b = buttons || {};
            const out = {};
            if (b.attack) out[Actions.ATTACK] = true;
            if (b.jump) out[Actions.JUMP] = true;
            if (b.interact) out[Actions.INTERACT] = true;
            if (b.sprint) out[Actions.SPRINT] = true;
            if (b.crouch) out[Actions.CROUCH] = true;
            if (input.touch.active) {
                if (input.touch.moveY < -0.2) out[Actions.FORWARD] = true;
                if (input.touch.moveY > 0.2) out[Actions.BACK] = true;
                if (input.touch.moveX < -0.2) out[Actions.LEFT] = true;
                if (input.touch.moveX > 0.2) out[Actions.RIGHT] = true;
            }
            return out;
        },
    };
}

/** Gamepad provider: standard mapping, polled. */
export function gamepadProvider(index = 0) {
    return {
        name: 'gamepad',
        read() {
            const out = {};
            try {
                const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
                const gp = pads && pads[index];
                if (!gp || !gp.connected) return out;
                const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
                const ax = (i) => gp.axes[i] || 0;
                if (btn(0)) out[Actions.JUMP] = true;            // A
                if (btn(2)) out[Actions.ATTACK] = true;          // X
                if (btn(3)) out[Actions.INTERACT] = true;        // Y
                if (btn(4) || btn(5)) out[Actions.SPRINT] = true;// LB/RB
                if (ax(1) < -0.25) out[Actions.FORWARD] = true;
                if (ax(1) > 0.25) out[Actions.BACK] = true;
                if (ax(0) < -0.25) out[Actions.LEFT] = true;
                if (ax(0) > 0.25) out[Actions.RIGHT] = true;
            } catch (_) {}
            return out;
        },
    };
}
