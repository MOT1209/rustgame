import { describe, it, expect } from 'vitest';
import { FrameStats, mulberry32 } from '../js/core/perf-stats.ts';

describe('FrameStats', () => {
    it('summarizes a steady 60 fps run', () => {
        const s = new FrameStats(120);
        for (let i = 0; i < 100; i++) s.record(1000 / 60, 5, 100, 50000);
        const r = s.summarize();
        expect(r.frames).toBe(100);
        expect(r.fps).toBeCloseTo(60, 0);
        expect(r.cpuMs).toBe(5);
        expect(r.drawCalls).toBe(100);
        expect(r.low1Fps).toBeCloseTo(60, 0);
    });

    it('1% low reflects the slowest frames, not the mean', () => {
        const s = new FrameStats(200);
        for (let i = 0; i < 198; i++) s.record(16.67, 4);
        s.record(100, 90);
        s.record(100, 90);
        const r = s.summarize();
        expect(r.fps).toBeGreaterThan(55);
        expect(r.low1Fps).toBeCloseTo(10, 0);
        expect(r.frameP99Ms).toBeCloseTo(16.67, 1); // 2 outliers in 200 sit above p99
    });

    it('ring buffer keeps only the newest samples', () => {
        const s = new FrameStats(10);
        for (let i = 0; i < 10; i++) s.record(100, 1);
        for (let i = 0; i < 10; i++) s.record(10, 1);
        expect(s.size).toBe(10);
        expect(s.summarize().fps).toBeCloseTo(100, 0);
        expect(s.recentFps(5)).toBeCloseTo(100, 0);
    });

    it('ignores invalid intervals and handles empty state', () => {
        const s = new FrameStats(10);
        s.record(0, 1); s.record(NaN, 1); s.record(-5, 1);
        expect(s.size).toBe(0);
        expect(s.summarize().fps).toBe(0);
        expect(s.recentFps(10)).toBe(0);
    });
});

describe('mulberry32', () => {
    it('is deterministic and in [0,1)', () => {
        const a = mulberry32(42), b = mulberry32(42);
        for (let i = 0; i < 100; i++) {
            const v = a();
            expect(v).toBe(b());
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});
