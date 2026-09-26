// ============================================================
// RUSTGAME — M1: Platform layer (phone / desktop / web + runtimes)
// Decides which control scheme + UI the game shows, on every target:
//   web (browser) · android (Capacitor APK) · electron (desktop .exe)
// Pure module: no DOM, no THREE, no direct window access. The host
// (game.js / tests) injects a small env snapshot + a storage backend.
// A manual mode override lives in localStorage; the save file is
// untouched (device preference is per-device, not per-save).
// Public API: detectDevice, detectRuntime, resolveDevice,
//   loadMode, saveMode, DEFAULT_MODE_FOR_RUNTIME, PLATFORM_MODE_KEY
// ============================================================

import type { SaveStorage } from '../types/game.ts';

/** Effective control/UI scheme. Web hosts both; the setting picks one. */
export type DeviceKind = 'phone' | 'desktop';

/** User preference. 'auto' = detect from device + runtime defaults. */
export type PlatformMode = 'auto' | 'phone' | 'desktop';

/** Where the same www/ build is running. */
export type RuntimeKind = 'web' | 'android' | 'electron';

export const PLATFORM_MODE_KEY = 'rust_platform_mode';

/** Runtime defaults used only when mode is 'auto'. */
export const DEFAULT_MODE_FOR_RUNTIME: Record<RuntimeKind, PlatformMode> = {
    web: 'auto',
    android: 'phone',
    electron: 'desktop',
};

/** Minimal injected device facts (game.js builds this from real APIs). */
export interface DeviceEnv {
    /** navigator.maxTouchPoints (0 when unknown). */
    touchPoints?: number;
    /** 'ontouchstart' in window. */
    touchEvents?: boolean;
    /** matchMedia('(pointer: coarse)').matches. */
    coarsePointer?: boolean;
    /** Smallest viewport side in CSS px (0 when unknown). */
    minViewportSide?: number;
}

/** Minimal injected runtime flags (set by shell: capacitor / preload). */
export interface RuntimeFlags {
    capacitorNative?: boolean;
    electron?: boolean;
}

function num(v: unknown, fallback: number): number {
    return typeof v === 'number' && isFinite(v) ? v : fallback;
}

/**
 * Guess the device from injected facts. Touch-capable OR coarse pointer
 * OR a phone-sized viewport counts as phone; desktops are the fallback.
 * Unknown/empty env → 'desktop' (never strand a desktop user).
 */
export function detectDevice(env: DeviceEnv = {}): DeviceKind {
    if ((env.touchEvents ?? false) || num(env.touchPoints, 0) > 0) return 'phone';
    if (env.coarsePointer ?? false) return 'phone';
    const side = num(env.minViewportSide, 0);
    if (side > 0 && side < 620) return 'phone';
    return 'desktop';
}

/** Map shell flags to a runtime. Electron wins over Capacitor if both set. */
export function detectRuntime(flags: RuntimeFlags = {}): RuntimeKind {
    if (flags.electron ?? false) return 'electron';
    if (flags.capacitorNative ?? false) return 'android';
    return 'web';
}

/**
 * Resolve the effective device: an explicit mode always wins; 'auto'
 * honors runtime defaults first (android→phone, electron→desktop)
 * and falls back to device detection on plain web.
 */
export function resolveDevice(
    mode: PlatformMode,
    env: DeviceEnv = {},
    runtime: RuntimeKind = 'web',
): DeviceKind {
    if (mode === 'phone') return 'phone';
    if (mode === 'desktop') return 'desktop';
    const def = DEFAULT_MODE_FOR_RUNTIME[runtime] ?? 'auto';
    if (def === 'phone') return 'phone';
    if (def === 'desktop') return 'desktop';
    return detectDevice(env);
}

/** Read the stored mode. Unknown values repair to 'auto', never throw. */
export function loadMode(storage: SaveStorage): PlatformMode {
    try {
        const v = storage.getItem(PLATFORM_MODE_KEY);
        if (v === 'phone' || v === 'desktop' || v === 'auto') return v;
        return 'auto';
    } catch {
        return 'auto';
    }
}

/** Persist the mode. Returns false (never throws) when storage fails. */
export function saveMode(storage: SaveStorage, mode: PlatformMode): boolean {
    try {
        storage.setItem(PLATFORM_MODE_KEY, mode);
        return true;
    } catch {
        return false;
    }
}
