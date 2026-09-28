// ============================================================
// RUSTGAME — Phase 2: performance monitor + benchmark runner
// Local-only measurement (no network, no analytics). Records every
// frame into FrameStats (allocation-free), drives the optional dev
// overlay, and runs repeatable benchmark scenarios on demand:
//   window.__perf.run('resource_heavy')   → Promise<result>
//   window.__perf.runAll()                → Promise<result[]>
//   window.__perf.results                 → everything recorded so far
// URL flags:  ?perf=1  show overlay   ?seed=N  deterministic world
// ============================================================

import * as THREE from 'three';
import { FrameStats, mulberry32 } from '../core/perf-stats.ts';

const params = (() => {
    try { return new URLSearchParams(window.location.search); } catch (_) { return new URLSearchParams(); }
})();

// Deterministic world for benchmarks: must run before game.js builds the world,
// which it does because ES module imports evaluate before the importer's body.
export const benchSeed = params.has('seed') ? (Number(params.get('seed')) || 1) : null;
if (benchSeed !== null) Math.random = mulberry32(benchSeed);

function overlayRequested() {
    if (params.get('perf') === '1') return true;
    try { return localStorage.getItem('rust_perf_overlay') === '1'; } catch (_) { return false; }
}

export class PerfMonitor {
    constructor({ renderer, scene, camera }) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.stats = new FrameStats(600);
        this.lastFrameStart = 0;
        this.frameStart = 0;
        this.profileName = '—';
        this.renderScale = 1;
        this.overlay = null;
        this.overlayNextUpdate = 0;
        this.objectCounts = { objects: 0, meshes: 0, visible: 0 };
        this._frustum = new THREE.Frustum();
        this._projScreen = new THREE.Matrix4();
        this.bench = null; // active benchmark state
        this.results = [];
        this.devEnabled = !!(import.meta.env && import.meta.env.DEV);
        if (overlayRequested()) this.setOverlay(true);
        if (this.devEnabled || overlayRequested()) {
            window.addEventListener('keydown', (e) => {
                if (e.code === 'F3') { e.preventDefault(); this.setOverlay(!this.overlay || this.overlay.style.display === 'none'); }
            });
        }
    }

    beginFrame(now) {
        this.frameStart = now;
    }

    /** Call after renderer.render(). Records interval, CPU cost, draw calls. */
    endFrame() {
        const end = performance.now();
        const info = this.renderer.info.render;
        if (this.lastFrameStart > 0) {
            this.stats.record(this.frameStart - this.lastFrameStart, end - this.frameStart, info.calls, info.triangles);
        }
        this.lastFrameStart = this.frameStart;
        if (this.bench) this._benchTick(end);
        if (this.overlay && this.overlay.style.display !== 'none' && end >= this.overlayNextUpdate) {
            this.overlayNextUpdate = end + 500;
            this._updateOverlay();
        }
    }

    countObjects() {
        let objects = 0, meshes = 0, visible = 0;
        const cam = this.camera;
        cam.updateMatrixWorld();
        this._projScreen.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreen);
        const walk = (o, parentVisible) => {
            objects++;
            const vis = parentVisible && o.visible;
            if (o.isMesh || o.isInstancedMesh) {
                meshes++;
                if (vis && (!o.frustumCulled || this._frustum.intersectsObject(o))) {
                    visible += o.isInstancedMesh ? o.count : 1;
                }
            }
            const ch = o.children;
            for (let i = 0; i < ch.length; i++) walk(ch[i], vis);
        };
        walk(this.scene, true);
        this.objectCounts = { objects, meshes, visible };
        return this.objectCounts;
    }

    memorySnapshot() {
        const m = performance.memory;
        const gl = this.renderer.info;
        return {
            heapMB: m ? Math.round((m.usedJSHeapSize / 1048576) * 10) / 10 : null,
            geometries: gl.memory.geometries,
            textures: gl.memory.textures,
            programs: gl.programs ? gl.programs.length : null,
        };
    }

    setOverlay(on) {
        if (on && !this.overlay) {
            const el = document.createElement('pre');
            el.id = 'perf-overlay';
            el.style.cssText = 'position:fixed;top:8px;left:8px;z-index:5000;margin:0;padding:6px 9px;background:rgba(0,0,0,0.72);color:#9f9;font:11px/1.35 monospace;pointer-events:none;border-radius:4px;white-space:pre;';
            document.body.appendChild(el);
            this.overlay = el;
        }
        if (this.overlay) this.overlay.style.display = on ? 'block' : 'none';
        if (on) this.overlayNextUpdate = 0;
    }

    _updateOverlay() {
        const s = this.stats;
        const fps = s.recentFps(60);
        const c = this.countObjects();
        const mem = this.memorySnapshot();
        const info = this.renderer.info.render;
        this.overlay.textContent =
            'RustGame Performance\n' +
            `FPS: ${fps.toFixed(0)}\n` +
            `Frame: ${(fps > 0 ? 1000 / fps : 0).toFixed(1)} ms\n` +
            `Draw Calls: ${info.calls}\n` +
            `Triangles: ${(info.triangles / 1000).toFixed(1)}K\n` +
            `Objects: ${c.objects} (meshes ${c.meshes}, visible ${c.visible})\n` +
            `Geo/Tex/Prog: ${mem.geometries}/${mem.textures}/${mem.programs}\n` +
            (mem.heapMB !== null ? `Heap: ${mem.heapMB} MB\n` : '') +
            `Profile: ${this.profileName}\n` +
            `Render Scale: ${this.renderScale.toFixed(2)}`;
    }

    // ---------------- benchmark runner ----------------

    /**
     * Run one timed measurement. `setup(api)` prepares the scenario (may be
     * async), `onFrame(t01)` is called every frame with progress 0..1 so the
     * scenario can drive the camera deterministically.
     */
    measure(name, { durationMs = 8000, warmupMs = 1500, onFrame = null } = {}) {
        if (this.bench) return Promise.reject(new Error('benchmark already running'));
        return new Promise((resolve) => {
            this.bench = { name, durationMs, warmupMs, onFrame, start: performance.now(), measuring: false, resolve };
        });
    }

    _benchTick(now) {
        const b = this.bench;
        b.ticks = (b.ticks || 0) + 1;
        // First frame after setup = upload/compile stall for everything the scenario created.
        if (b.ticks === 1) b.firstFrameMs = Math.round(now - b.start);
        if (b.onFrame) b.onFrame(b.measuring ? Math.min(1, (now - b.measureStart) / b.durationMs) : 0);
        // Warm up by time AND frame count, so one huge stall can't eat the whole warmup.
        if (!b.measuring && now - b.start >= b.warmupMs && b.ticks >= 30) {
            b.measuring = true;
            b.measureStart = now;
            this.stats.reset();
        }
        if (b.measuring && now - b.measureStart >= b.durationMs) {
            this.bench = null;
            const result = {
                scenario: b.name,
                firstFrameMs: b.firstFrameMs,
                ...this.stats.summarize(),
                ...this.countObjects(),
                ...this.memorySnapshot(),
                profile: this.profileName,
                renderScale: this.renderScale,
                viewport: `${window.innerWidth}x${window.innerHeight}@${this.renderer.getPixelRatio().toFixed(2)}`,
            };
            this.results.push(result);
            b.resolve(result);
        }
    }
}
