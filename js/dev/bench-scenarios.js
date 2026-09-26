// ============================================================
// RUSTGAME — Phase 2: repeatable benchmark scenarios
// Each scenario prepares the world through the game's own code
// paths (respawnObject / placeStructure / placeCampfire), then the
// monitor measures while the camera turns a deterministic 360°.
// Run with a seed for reproducible worlds:
//   http://localhost:5173/?seed=42&bench=resource_heavy
//   window.__perf.run('building_heavy')
// ============================================================

const RESOURCE_TYPES = ['tree', 'rock', 'iron', 'sulfur', 'hemp', 'berry_bush', 'barrel'];

function orbit(api, pitch = -0.08) {
    return (t) => api.setLook(t * Math.PI * 2, pitch);
}

// A fixed pseudo-random sequence independent of Math.random so the extra
// objects are identical run-to-run even without ?seed.
function lcg(seed) {
    let s = seed >>> 0;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export const SCENARIOS = {
    // A — standard world, player idle at spawn, simulation paused (render cost only).
    baseline_world: {
        desc: 'Standard world at noon, idle camera turning 360°, no simulation',
        setup(api) { api.setClock(0.3); api.setWeather('clear'); api.forceSimulation(false); },
        onFrame: orbit,
    },
    // B — normal gameplay: survival sim, NPC AI, physics, building ghost raycasts.
    gameplay: {
        desc: 'Survival sim + NPC AI + physics + building-plan ghost active',
        setup(api) {
            api.setClock(0.3); api.setWeather('clear'); api.forceSimulation(true);
            api.selectBlueprint('foundation');
        },
        onFrame: orbit,
    },
    // C — resource heavy: +1500 nodes spread over the whole map.
    resource_heavy: {
        desc: '+1500 resource nodes (all types) across the map, gameplay sim on',
        setup(api) {
            api.setClock(0.3); api.setWeather('clear'); api.forceSimulation(true);
            const rnd = lcg(1337);
            const half = api.worldSize / 2 - 20;
            for (let i = 0; i < 1500; i++) {
                const type = RESOURCE_TYPES[i % RESOURCE_TYPES.length];
                api.spawnResource(type, (rnd() * 2 - 1) * half, (rnd() * 2 - 1) * half);
            }
        },
        onFrame: orbit,
    },
    // D — building heavy: 14x14 base of foundations, walls on every edge, ceilings on top.
    building_heavy: {
        desc: '14x14 base: 196 foundations + 196 walls + 196 ceilings around the player',
        setup(api) {
            api.setClock(0.3); api.setWeather('clear'); api.forceSimulation(true);
            const n = 14, step = 3, origin = -((n - 1) * step) / 2;
            for (let ix = 0; ix < n; ix++) {
                for (let iz = 0; iz < n; iz++) {
                    const x = origin + ix * step, z = origin + iz * step + 30;
                    api.placeStructure('foundation', x, 0.1, z, { tier: 'stone' });
                    api.placeStructure('wall', x, 1.5, z, { tier: 'wood', rotY: (ix + iz) % 2 ? Math.PI / 2 : 0 });
                    api.placeStructure('ceiling', x, 3, z, { tier: 'metal' });
                }
            }
        },
        onFrame: (api) => orbit(api, -0.05),
    },
    // E — weather + night: storm, night lighting, 4 campfires (point lights) nearby.
    weather_night: {
        desc: 'Storm at night with 4 campfires (dynamic point lights) near the player',
        setup(api) {
            api.setClock(0.7); api.setWeather('storm'); api.forceSimulation(true);
            api.placeCampfire(5, 5); api.placeCampfire(-5, 6); api.placeCampfire(6, -5); api.placeCampfire(-6, -6);
        },
        onFrame: orbit,
    },
    // F — combat: 20 hostile animals chasing the player (health pinned so sim keeps running).
    combat: {
        desc: '20 wolves/bears aggro on the player, sim on, health pinned at 100',
        setup(api) {
            api.setClock(0.3); api.setWeather('clear'); api.forceSimulation(true);
            for (let i = 0; i < 20; i++) {
                const a = (i / 20) * Math.PI * 2;
                api.spawnNpc(i % 3 ? 'wolf' : 'bear', Math.cos(a) * 12, Math.sin(a) * 12);
            }
        },
        onFrame: (api) => {
            const turn = orbit(api);
            return (t) => { api.pinHealth(); turn(t); };
        },
    },
};

export const SCENARIO_ORDER = ['baseline_world', 'gameplay', 'resource_heavy', 'building_heavy', 'weather_night', 'combat'];

/** Run one scenario on the live game. Returns the monitor's result object. */
export async function runScenario(monitor, api, name, opts = {}) {
    const sc = SCENARIOS[name];
    if (!sc) throw new Error(`unknown scenario: ${name}`);
    const t0 = performance.now();
    await sc.setup(api);
    const setupMs = Math.round(performance.now() - t0);
    const result = await monitor.measure(name, {
        durationMs: opts.durationMs || 8000,
        warmupMs: opts.warmupMs || 2000,
        onFrame: sc.onFrame(api),
    });
    result.setupMs = setupMs;
    result.desc = sc.desc;
    return result;
}
