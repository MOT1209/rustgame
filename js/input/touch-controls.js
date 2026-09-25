/**
 * Unified on-screen controls — layer 3 adapter.
 *
 * Owns every touch DOM node and pointer listener for the game. Knows nothing
 * about THREE, gameplay rules, or persistence: it translates raw touch input
 * into normalized vectors and edge events handed to the composition root.
 *
 * On non-touch devices `init()` is a no-op, so desktop behaviour is unchanged.
 */

const STICK_RADIUS = 55;
const DEADZONE = 0.18;
const LOOK_PIXELS_PER_CALL = 14;

export function createTouchState() {
    return { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, buttons: Object.create(null) };
}

/**
 * Clamps a raw drag into the analog-stick unit circle and applies a deadzone.
 * Dragging to `maxRadius` maps to magnitude 1, so `x`/`y` are always in [-1, 1].
 * @returns {{x:number,y:number,magnitude:number}} zeroed inside the deadzone
 */
export function readStickVector(dx, dy, maxRadius = STICK_RADIUS, deadzone = DEADZONE) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0, magnitude: 0 };
    const distance = Math.hypot(dx, dy);
    if (distance <= 0) return { x: 0, y: 0, magnitude: 0 };
    const clamped = distance > maxRadius ? (maxRadius / distance) * dx : dx;
    const clampedY = distance > maxRadius ? (maxRadius / distance) * dy : dy;
    const x = clamped / maxRadius;
    const y = clampedY / maxRadius;
    const magnitude = Math.hypot(x, y);
    if (magnitude < deadzone) return { x: 0, y: 0, magnitude: 0 };
    return { x, y, magnitude };
}

export function isTouchDevice(win = globalThis.window, nav = globalThis.navigator) {
    if (!win && !nav) return false;
    return ('ontouchstart' in (win || {})) || Number((nav || {}).maxTouchPoints) > 0;
}

export function isPortraitBlocked(width, height, requireLandscape = true) {
    if (!requireLandscape) return false;
    const w = Number(width);
    const h = Number(height);
    if (!(w > 0) || !(h > 0)) return false;
    return w < h;
}

export class UnifiedGameControls {
    constructor(options = {}) {
        this.options = {
            requireLandscape: false,
            showCameraControls: true,
            mouseSensitivity: 0.0025,
            actionButtons: [],
            onMove: null,
            onCamera: null,
            onAction: null,
            onHoldChange: null,
            debug: false,
            ...options,
        };
        this.state = createTouchState();
        this.mounted = false;
        this.movePointerId = null;
        this.lookPointerId = null;
        this.stickOrigin = { x: 0, y: 0 };
        this.nodes = {};
        this.listeners = [];
    }

    init() {
        if (this.mounted || !isTouchDevice()) return this;
        this.mounted = true;
        this.root = this.buildUi();
        document.body.appendChild(this.root);
        this.bindEvents();
        this.updateOrientation();
        if (this.options.debug) console.info('[touch-controls] ready', this.options.actionButtons.length);
        return this;
    }

    destroy() {
        for (const { target, type, handler } of this.listeners) {
            target.removeEventListener(type, handler);
        }
        this.listeners = [];
        if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        this.nodes = {};
        this.root = null;
        this.mounted = false;
        this.state = createTouchState();
    }

    buildUi() {
        const root = document.createElement('div');
        root.id = 'mobile-controls';
        root.hidden = false;

        const zone = document.createElement('div');
        zone.id = 'joystick-zone';
        const base = document.createElement('div');
        base.id = 'joystick-base';
        const stick = document.createElement('div');
        stick.id = 'joystick-stick';
        base.appendChild(stick);
        zone.appendChild(base);
        root.appendChild(zone);
        this.nodes.stick = stick;
        this.nodes.zone = zone;

        if (this.options.showCameraControls) {
            const look = document.createElement('div');
            look.id = 'look-zone';
            root.appendChild(look);
            this.nodes.look = look;
        }

        const buttons = document.createElement('div');
        buttons.id = 'action-buttons';
        for (const def of this.options.actionButtons) {
            buttons.appendChild(this.buildButton(def));
        }
        root.appendChild(buttons);
        this.nodes.buttons = buttons;

        const rotate = document.createElement('div');
        rotate.id = 'rotate-device';
        rotate.hidden = true;
        rotate.textContent = '↻ Rotate your device to landscape';
        root.appendChild(rotate);
        this.nodes.rotate = rotate;

        return root;
    }

    buildButton(def) {
        const button = document.createElement('div');
        button.className = 'mobile-btn' + (def.hold ? ' hold' : '');
        button.dataset.action = def.action;
        button.textContent = def.label;
        button.style.borderColor = def.color || 'rgba(255,255,255,0.25)';
        if (def.hold) button.dataset.hold = '1';
        this.bindButton(button, def);
        return button;
    }

    bindButton(button, def) {
        const down = (event) => {
            event.preventDefault();
            event.stopPropagation();
            button.classList.add('is-active');
            this.state.buttons[def.action] = true;
            if (this.options.onAction) this.options.onAction(def.action);
            if (def.hold && this.options.onHoldChange) this.options.onHoldChange(def.action, true);
        };
        const up = (event) => {
            if (!button.classList.contains('is-active')) return;
            event.preventDefault();
            event.stopPropagation();
            button.classList.remove('is-active');
            this.state.buttons[def.action] = false;
            if (def.hold && this.options.onHoldChange) this.options.onHoldChange(def.action, false);
        };
        this.on(button, 'pointerdown', down);
        this.on(button, 'pointerup', up);
        this.on(button, 'pointercancel', up);
        this.on(button, 'contextmenu', (event) => event.preventDefault());
    }

    bindEvents() {
        const zone = this.nodes.zone;
        this.on(zone, 'pointerdown', (event) => {
            if (this.movePointerId !== null) return;
            event.preventDefault();
            this.movePointerId = event.pointerId;
            this.capture(zone, event.pointerId);
            this.stickOrigin.x = event.clientX;
            this.stickOrigin.y = event.clientY;
        });
        this.on(zone, 'pointermove', (event) => {
            if (event.pointerId !== this.movePointerId) return;
            event.preventDefault();
            const v = readStickVector(event.clientX - this.stickOrigin.x, event.clientY - this.stickOrigin.y);
            this.state.moveX = v.x;
            this.state.moveY = v.y;
            this.nodes.stick.style.transform =
                `translate(calc(-50% + ${(v.x * STICK_RADIUS).toFixed(1)}px), calc(-50% + ${(v.y * STICK_RADIUS).toFixed(1)}px))`;
            if (this.options.onMove) this.options.onMove(v.x, v.y);
        });
        const releaseMove = (event) => {
            if (event.pointerId !== this.movePointerId) return;
            event.preventDefault();
            this.movePointerId = null;
            this.state.moveX = 0;
            this.state.moveY = 0;
            this.nodes.stick.style.transform = 'translate(-50%, -50%)';
            if (this.options.onMove) this.options.onMove(0, 0);
        };
        this.on(zone, 'pointerup', releaseMove);
        this.on(zone, 'pointercancel', releaseMove);

        if (this.nodes.look) {
            let lastX = 0;
            let lastY = 0;
            let accX = 0;
            let accY = 0;
            this.on(this.nodes.look, 'pointerdown', (event) => {
                if (this.lookPointerId !== null) return;
                event.preventDefault();
                this.lookPointerId = event.pointerId;
                this.capture(this.nodes.look, event.pointerId);
                lastX = event.clientX;
                lastY = event.clientY;
            });
            this.on(this.nodes.look, 'pointermove', (event) => {
                if (event.pointerId !== this.lookPointerId) return;
                event.preventDefault();
                accX += event.clientX - lastX;
                accY += event.clientY - lastY;
                lastX = event.clientX;
                lastY = event.clientY;
                this.state.lookDX = accX;
                this.state.lookDY = accY;
                if (this.options.onCamera) {
                    this.options.onCamera(
                        accX / LOOK_PIXELS_PER_CALL,
                        accY / LOOK_PIXELS_PER_CALL
                    );
                }
                accX = 0;
                accY = 0;
            });
            const releaseLook = (event) => {
                if (event.pointerId !== this.lookPointerId) return;
                event.preventDefault();
                this.lookPointerId = null;
            };
            this.on(this.nodes.look, 'pointerup', releaseLook);
            this.on(this.nodes.look, 'pointercancel', releaseLook);
        }

        this.on(window, 'resize', () => this.updateOrientation());
        this.on(window, 'orientationchange', () => this.updateOrientation());
        this.on(document, 'visibilitychange', () => this.onVisibilityChange());
    }

    on(target, type, handler) {
        target.addEventListener(type, handler, { passive: false });
        this.listeners.push({ target, type, handler });
    }

    /** Pointer capture is best-effort: it throws for synthetic or already-released pointers. */
    capture(target, pointerId) {
        try {
            target.setPointerCapture(pointerId);
        } catch (e) {
            /* capture unavailable — drag still works while the pointer stays inside */
        }
    }

    onVisibilityChange() {
        if (document.visibilityState !== 'hidden') return;
        this.resetAll();
    }

    /** Drops all held state (tab hidden, interruption) so the player never sticks. */
    resetAll() {
        this.movePointerId = null;
        this.lookPointerId = null;
        this.state.moveX = 0;
        this.state.moveY = 0;
        if (this.nodes.stick) this.nodes.stick.style.transform = 'translate(-50%, -50%)';
        for (const [action, active] of Object.entries(this.state.buttons)) {
            if (!active) continue;
            this.state.buttons[action] = false;
            if (this.options.onHoldChange) this.options.onHoldChange(action, false);
            const button = this.nodes.buttons && this.nodes.buttons.querySelector(`[data-action="${action}"]`);
            if (button) button.classList.remove('is-active');
        }
        if (this.options.onMove) this.options.onMove(0, 0);
    }

    updateOrientation() {
        if (!this.nodes.rotate) return;
        this.nodes.rotate.hidden = !isPortraitBlocked(
            window.innerWidth,
            window.innerHeight,
            this.options.requireLandscape
        );
    }
}
