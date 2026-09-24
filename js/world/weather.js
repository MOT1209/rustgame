// ============================================================
// RUSTGAME — Phase 1: Weather Foundation
// States: clear / cloudy / rain / storm. Phase 1 uses clear+rain
// weights by default; storm unlockable via config. Decoupled from
// player logic; exposes temperature & light modifiers.
// Serializable + seedable for tests. No DOM, no THREE.
// ============================================================

export const WEATHER_STATES = {
    clear: { id: 'clear', name: 'Clear', tempMod: 0, lightMod: 1.0, fogMod: 1.0, icon: '☀️' },
    cloudy: { id: 'cloudy', name: 'Cloudy', tempMod: -2, lightMod: 0.8, fogMod: 1.2, icon: '☁️' },
    rain: { id: 'rain', name: 'Rain', tempMod: -6, lightMod: 0.6, fogMod: 1.6, icon: '🌧️' },
    storm: { id: 'storm', name: 'Storm', tempMod: -8, lightMod: 0.45, fogMod: 2.0, icon: '⛈️' },
};

export class WeatherSystem {
    /**
     * @param {any} [opts] { weights, minDuration, maxDuration, rng }
     */
    constructor(opts = {}) {
        this.weights = opts.weights || { clear: 60, cloudy: 25, rain: 15, storm: 0 };
        this.minDuration = opts.minDuration || 90;
        this.maxDuration = opts.maxDuration || 240;
        this.rng = opts.rng || Math.random;
        this.current = 'clear';
        this.timeLeft = this.minDuration;
    }

    _pickNext() {
        const entries = Object.entries(this.weights).filter(([, w]) => w > 0);
        const total = entries.reduce((a, [, w]) => a + w, 0);
        if (total <= 0) return 'clear';
        let roll = this.rng() * total;
        for (const [id, w] of entries) {
            roll -= w;
            if (roll <= 0) return id;
        }
        return entries[0][0];
    }

    /** Advance clock; returns true when weather changed. */
    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft > 0) return false;
        this.current = this._pickNext();
        this.timeLeft = this.minDuration + this.rng() * (this.maxDuration - this.minDuration);
        return true;
    }

    get def() {
        return WEATHER_STATES[this.current] || WEATHER_STATES.clear;
    }

    get isRaining() {
        return this.current === 'rain' || this.current === 'storm';
    }

    toJSON() {
        return { current: this.current, timeLeft: Math.max(0, this.timeLeft) };
    }

    /**
     * @param {any} data
     * @param {any} [opts]
     */
    static fromJSON(data, opts = {}) {
        const w = new WeatherSystem(opts);
        if (data && WEATHER_STATES[data.current]) w.current = data.current;
        if (data && typeof data.timeLeft === 'number') w.timeLeft = Math.max(1, data.timeLeft);
        return w;
    }
}
