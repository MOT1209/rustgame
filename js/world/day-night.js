// ============================================================
// RUSTGAME — Phase 1: Day/Night helpers (save-compatible)
// Tracks { day, time } where time is seconds into the cycle.
// Pure module: no DOM, no THREE.
// ============================================================

export const DayNight = {
    /** Advance clock. Returns { day, time, wrapped }. */
    advance(day, time, dt, dayLength) {
        const len = dayLength > 0 ? dayLength : 800;
        let t = time + dt;
        let d = day;
        let wrapped = false;
        while (t >= len) {
            t -= len;
            d += 1;
            wrapped = true;
        }
        return { day: d, time: t, wrapped };
    },

    /** 0..1 progress through the current day. */
    progress(time, dayLength) {
        const len = dayLength > 0 ? dayLength : 800;
        return ((time % len) + len) % len / len;
    },

    /** Sun angle in radians (matches existing game convention). */
    sunAngle(time, dayLength) {
        return this.progress(time, dayLength) * Math.PI * 2;
    },

    isNight(time, dayLength) {
        const p = this.progress(time, dayLength);
        return p > 0.5 && p < 0.9;
    },

    phaseName(time, dayLength) {
        const p = this.progress(time, dayLength);
        if (p < 0.22) return 'morning';
        if (p < 0.5) return 'afternoon';
        if (p < 0.62) return 'dusk';
        if (p < 0.9) return 'night';
        return 'dawn';
    },

    /** 0..1 daylight factor for lighting intensity. */
    daylightFactor(time, dayLength) {
        return Math.max(0, Math.sin(this.sunAngle(time, dayLength)));
    },
};
