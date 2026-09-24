// ============================================================
// RUSTGAME — Phase 1: HUD helpers
// Pure formatting + a throttled DOM updater (perf: write the DOM
// only when a value actually changes). Game passes element ids.
// ============================================================

const _cache = new Map();

function changed(key, value) {
    if (_cache.get(key) === value) return false;
    _cache.set(key, value);
    return true;
}

export function resetHudCache() {
    _cache.clear();
}

export function formatClock(day, time, dayLength) {
    const len = dayLength > 0 ? dayLength : 800;
    const hours = Math.floor(((time / len) * 24 + 8) % 24);
    const mins = Math.floor((((time / len) * 24 + 8) % 1) * 60);
    const dd = String(day).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    return `Day ${dd} — ${hh}:${mm}`;
}

export function statPercent(value, max) {
    if (!(max > 0)) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
}

function setWidth(id, pct) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    const rounded = Math.round(pct * 2) / 2; // 0.5% granularity
    if (!changed('w:' + id, rounded)) return;
    el.style.width = rounded + '%';
}

function setText(id, text) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    if (!changed('t:' + id, text)) return;
    el.textContent = text;
}

/**
 * Update all survival bars + clock. Safe to call every frame
 * (writes are cached). stats: {health,hunger,thirst,radiation,
 * stamina,temperature}.
 */
export function updateSurvivalHud(stats, clock = null, dayLength = 800) {
    if (!stats) return;
    setWidth('health-fill', statPercent(stats.health, 100));
    setWidth('hunger-fill', statPercent(stats.hunger, 100));
    setWidth('thirst-fill', statPercent(stats.thirst, 100));
    setWidth('rad-fill', statPercent(stats.radiation, 100));
    if (stats.stamina !== undefined) setWidth('stamina-fill', statPercent(stats.stamina, 100));
    if (stats.temperature !== undefined) setWidth('temp-fill', statPercent(stats.temperature, 100));
    if (clock) setText('clock-label', formatClock(clock.day, clock.time, dayLength));
}

/** Interaction prompt: "E — Drink water" etc. Pass null to hide. */
export function setPrompt(text) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('interaction-hint');
    if (!el) return;
    if (text) {
        if (!changed('prompt', text)) { if (el.style.display === 'none') el.style.display = 'block'; return; }
        el.textContent = text;
        el.style.display = 'block';
    } else {
        if (el.style.display === 'none') return;
        el.style.display = 'none';
    }
}
