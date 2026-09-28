// ============================================================
// RUSTGAME — Phase 2: frame statistics (pure, no DOM / THREE)
// Fixed-size ring buffers so recording a frame never allocates.
// Used by the dev overlay, the benchmark runner and the dynamic
// resolution controller.
// ============================================================

export interface FrameSummary {
    frames: number;
    /** Mean FPS derived from mean frame interval. */
    fps: number;
    /** Mean frame interval (ms, rAF-to-rAF). */
    frameMs: number;
    /** 99th percentile frame interval (ms). */
    frameP99Ms: number;
    /** "1% low" FPS: mean FPS of the slowest 1% of frames. */
    low1Fps: number;
    /** Mean main-thread work per frame (ms, JS + render submit). */
    cpuMs: number;
    /** 95th percentile main-thread work (ms). */
    cpuP95Ms: number;
    /** Mean draw calls per frame (incl. shadow pass). */
    drawCalls: number;
    /** Mean triangles per frame (incl. shadow pass). */
    triangles: number;
}

export class FrameStats {
    readonly capacity: number;
    private readonly interval: Float32Array;
    private readonly cpu: Float32Array;
    private readonly calls: Float32Array;
    private readonly tris: Float32Array;
    private head = 0;
    private count = 0;
    private scratch: Float32Array;

    constructor(capacity = 600) {
        this.capacity = Math.max(8, Math.floor(capacity));
        this.interval = new Float32Array(this.capacity);
        this.cpu = new Float32Array(this.capacity);
        this.calls = new Float32Array(this.capacity);
        this.tris = new Float32Array(this.capacity);
        this.scratch = new Float32Array(this.capacity);
    }

    reset(): void {
        this.head = 0;
        this.count = 0;
    }

    get size(): number {
        return this.count;
    }

    record(intervalMs: number, cpuMs: number, drawCalls = 0, triangles = 0): void {
        if (!(intervalMs > 0) || !isFinite(intervalMs)) return;
        const i = this.head;
        this.interval[i] = intervalMs;
        this.cpu[i] = cpuMs > 0 && isFinite(cpuMs) ? cpuMs : 0;
        this.calls[i] = drawCalls;
        this.tris[i] = triangles;
        this.head = (i + 1) % this.capacity;
        if (this.count < this.capacity) this.count++;
    }

    /** Mean FPS over the most recent `n` frames (cheap; used every frame by DRS). */
    recentFps(n: number): number {
        const k = Math.min(n, this.count);
        if (k === 0) return 0;
        let sum = 0;
        for (let j = 0; j < k; j++) {
            sum += this.interval[(this.head - 1 - j + this.capacity) % this.capacity];
        }
        return sum > 0 ? (1000 * k) / sum : 0;
    }

    summarize(): FrameSummary {
        const n = this.count;
        if (n === 0) {
            return { frames: 0, fps: 0, frameMs: 0, frameP99Ms: 0, low1Fps: 0, cpuMs: 0, cpuP95Ms: 0, drawCalls: 0, triangles: 0 };
        }
        let sumI = 0, sumC = 0, sumCalls = 0, sumTris = 0;
        for (let j = 0; j < n; j++) {
            sumI += this.interval[j];
            sumC += this.cpu[j];
            sumCalls += this.calls[j];
            sumTris += this.tris[j];
        }
        const sortedI = this.sorted(this.interval, n);
        const p99 = percentileSorted(sortedI, n, 0.99);
        // 1% low: average of the slowest 1% of intervals (at least one frame).
        const worst = Math.max(1, Math.floor(n * 0.01));
        let worstSum = 0;
        for (let j = n - worst; j < n; j++) worstSum += sortedI[j];
        const low1 = worstSum > 0 ? (1000 * worst) / worstSum : 0;
        const sortedC = this.sorted(this.cpu, n);
        const cpuP95 = percentileSorted(sortedC, n, 0.95);
        return {
            frames: n,
            fps: round1((1000 * n) / sumI),
            frameMs: round2(sumI / n),
            frameP99Ms: round2(p99),
            low1Fps: round1(low1),
            cpuMs: round2(sumC / n),
            cpuP95Ms: round2(cpuP95),
            drawCalls: Math.round(sumCalls / n),
            triangles: Math.round(sumTris / n),
        };
    }

    private sorted(src: Float32Array, n: number): Float32Array {
        const out = this.scratch.subarray(0, n);
        out.set(src.subarray(0, n));
        out.sort();
        return out;
    }
}

function percentileSorted(sorted: Float32Array, n: number, p: number): number {
    if (n === 0) return 0;
    const idx = Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1));
    return sorted[idx];
}

function round1(v: number): number {
    return Math.round(v * 10) / 10;
}

function round2(v: number): number {
    return Math.round(v * 100) / 100;
}

/** Deterministic PRNG (mulberry32) so benchmark worlds are reproducible. */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
