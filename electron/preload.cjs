// ============================================================
// RUSTGAME — Electron preload (isolated world, runs before page)
// .cjs: the package is "type": "module", so CommonJS is required.
// Exposes ONLY the runtime flag the game needs to pick its scheme
// (desktop by default) and to gate web-only layers (ads, SW).
// No Node APIs leak into the page.
// ============================================================

// Runs in an isolated world but shares `window`: visible to page,
// invisible to Node. Assigned before any page script executes.
window.RASHID_RUNTIME = 'electron';
