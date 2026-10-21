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
 * @param {any} stats
 * @param {{day:number,time:number}|null} [clock]
 * @param {number} [dayLength]
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

/**
 * Phase 2.3: the compass readout — an arrow, the direction and the distance
 * to the nearest point of interest. Pass null to hide the whole strip.
 */
export function updateCompass(readout) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('compass');
    if (!el) return;
    if (!readout) {
        if (el.style.display === 'none') return;
        el.style.display = 'none';
        return;
    }
    if (el.style.display === 'none') el.style.display = 'flex';
    setText('compass-arrow', readout.arrow);
    setText('compass-label', readout.label);
    setText('compass-poi', `${readout.name} · ${Math.round(readout.distance)}m`);
}

/**
 * Phase 2.3: the minimap. The player is always in the middle and the map is
 * rotated so the player faces up. `points` come from js/world/pois.js.
 */
export function drawMinimap(points) {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('minimap');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // ring + north marker
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 10);

    // the points of interest
    for (const p of points || []) {
        const px = cx + p.x;
        const py = cy + p.y;
        const edge = Math.hypot(px - cx, py - cy) > Math.min(cx, cy) - 6;
        ctx.fillStyle = edge ? 'rgba(255,193,7,0.85)' : 'rgba(255,152,0,0.95)';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // the player
    ctx.fillStyle = '#cd5c2c';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.closePath();
    ctx.fill();
}

