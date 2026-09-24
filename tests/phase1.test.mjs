// ============================================================
// RUSTGAME — Phase 1 test suite (Node, no DOM, no THREE).
// Run: vitest run
// ============================================================

import { strict as assert } from 'node:assert';
import { SURVIVAL_CONFIG, SAVE_VERSION } from '../js/core/config.ts';
import { DamageSystem, DamageTypes } from '../js/player/damage.ts';
import { StaminaSystem } from '../js/player/stamina.ts';
import { SurvivalSystem, hungerState, thirstState } from '../js/player/survival.ts';
import { FOOD_DEFS, getStackLimit } from '../js/inventory/items.js';
import { StorageInventory } from '../js/inventory/storage.js';
import { PHASE1_RECIPES, canCraft, craft, missingFor } from '../js/crafting/recipes.js';
import { NODE_TYPES, getNodeDef, yieldForHit, RespawnManager } from '../js/world/resources.js';
import { drink, getWaterSource } from '../js/world/water.js';
import { WeatherSystem } from '../js/world/weather.js';
import { DayNight } from '../js/world/day-night.js';
import { InteractionSystem } from '../js/interaction/interaction.js';
import { SaveSystem } from '../js/save/save-system.js';
import { InputSystem, Actions, keyboardProvider, touchProvider } from '../js/input/input.js';
import { formatClock, statPercent } from '../js/ui/hud.js';

import { test } from 'vitest';

const REG = { wood: 1, stone: 1, cloth: 1, berry: 1, bandage: 1, water: 1, canned_food: 1 };

// ---------- config ----------
test('config: thirst drains faster than hunger', () => {
    assert.ok(SURVIVAL_CONFIG.thirstDrain > SURVIVAL_CONFIG.hungerDrain);
    assert.equal(SAVE_VERSION, 2);
});

// ---------- damage ----------
test('damage: clamps at 0, reports dealt', () => {
    const s = { health: 10 };
    assert.equal(DamageSystem.applyDamage(s, 25, DamageTypes.FALL), 10);
    assert.equal(s.health, 0);
    assert.ok(DamageSystem.isDead(s));
});
test('damage: ignores invalid amounts', () => {
    const s = { health: 50 };
    assert.equal(DamageSystem.applyDamage(s, -5), 0);
    assert.equal(DamageSystem.applyDamage(s, NaN), 0);
    assert.equal(s.health, 50);
});
test('damage: heal clamps at max', () => {
    const s = { health: 90, maxHealth: 100 };
    assert.equal(DamageSystem.heal(s, 50), 10);
    assert.equal(s.health, 100);
});

// ---------- stamina ----------
test('stamina: sprint lockout below minimum', () => {
    const s = { stamina: 10 };
    assert.equal(StaminaSystem.canSprint(s), false);
    s.stamina = 50;
    assert.equal(StaminaSystem.canSprint(s), true);
});
test('stamina: drains on sprint, regens on rest', () => {
    const s = { stamina: 100 };
    StaminaSystem.update(s, 1, { wantSprint: true });
    assert.ok(s.stamina < 100);
    const low = s.stamina;
    StaminaSystem.update(s, 1, { wantSprint: false });
    assert.ok(s.stamina > low);
});
test('stamina: cold slows regen', () => {
    const a = { stamina: 50 }, b = { stamina: 50 };
    StaminaSystem.regen(a, 1, {});
    StaminaSystem.regen(b, 1, { freezing: true });
    assert.ok(a.stamina > b.stamina);
});

// ---------- survival ----------
test('survival: hunger states', () => {
    assert.equal(hungerState(80), 'normal');
    assert.equal(hungerState(50), 'hungry');
    assert.equal(hungerState(20), 'starving');
    assert.equal(hungerState(0), 'critical');
});
test('survival: thirst states', () => {
    assert.equal(thirstState(80), 'normal');
    assert.equal(thirstState(40), 'thirsty');
    assert.equal(thirstState(15), 'dehydrated');
    assert.equal(thirstState(0), 'critical');
});
test('survival: starvation damages, regen needs food+water', () => {
    const s = { health: 100, hunger: 0, thirst: 0, stamina: 100, temperature: 100, radiation: 0, bleeding: 0 };
    SurvivalSystem.tick(s, 1, {});
    assert.ok(s.health < 100);
    const s2 = { health: 50, hunger: 80, thirst: 80, stamina: 100, temperature: 100, radiation: 0, bleeding: 0 };
    SurvivalSystem.tick(s2, 1, {});
    assert.ok(s2.health > 50);
});
test('survival: night cools, fire warms', () => {
    const s = { health: 100, hunger: 100, thirst: 100, stamina: 100, temperature: 60, radiation: 0, bleeding: 0 };
    SurvivalSystem.tick(s, 10, { isNight: true });
    const cold = s.temperature;
    SurvivalSystem.tick(s, 10, { isNight: true, nearFire: true });
    assert.ok(s.temperature > cold);
});
test('survival: events fire on state change', () => {
    const s = { health: 100, hunger: 61, thirst: 100, stamina: 100, temperature: 100, radiation: 0, bleeding: 0 };
    const r = SurvivalSystem.tick(s, 60, {}); // hunger 61 - 3 = 58 -> hungry
    assert.ok(r.events.some(e => e.type === 'hunger' && e.to === 'hungry'));
});

// ---------- items / storage ----------
test('items: food defs have spoil-ready model', () => {
    for (const f of Object.values(FOOD_DEFS)) {
        assert.ok(f.id && f.hungerRestore !== undefined && f.spoilTime !== undefined && f.stackSize > 0);
    }
    assert.ok(getStackLimit('berry') <= 20);
});
test('storage: add/has/consume, no negatives', () => {
    const inv = new StorageInventory([], REG);
    assert.equal(inv.add('wood', 5), 5);
    assert.ok(inv.has('wood', 5));
    assert.equal(inv.consume('wood', 10), false);
    assert.equal(inv.count('wood'), 5);
    assert.ok(inv.consume('wood', 3));
    assert.equal(inv.count('wood'), 2);
});
test('storage: rejects unknown items, respects stack', () => {
    const inv = new StorageInventory([], REG);
    assert.equal(inv.add('nuke', 5), 0);
    assert.equal(inv.add('berry', 999), 20);
});
test('storage: transfer + serialize roundtrip', () => {
    const a = new StorageInventory([{ id: 'wood', count: 10 }], REG);
    const b = new StorageInventory([], REG);
    assert.equal(a.transferTo(b, 'wood', 4), 4);
    assert.equal(a.count('wood'), 6);
    assert.equal(b.count('wood'), 4);
    const c = StorageInventory.fromJSON(a.toJSON(), REG);
    assert.equal(c.count('wood'), 6);
});

// ---------- crafting ----------
function adapter(inv) {
    return {
        has: (id, n) => inv.has(id, n),
        consume: (id, n) => inv.consume(id, n),
        add: (id, n) => inv.add(id, n),
        count: (id) => inv.count(id),
    };
}
test('crafting: success consumes + grants', () => {
    const inv = new StorageInventory([], { ...REG, stone_hatchet: 1 });
    inv.add('wood', 100); inv.add('stone', 50);
    const r = craft(PHASE1_RECIPES.stone_axe, adapter(inv), 1);
    assert.ok(r.ok);
    assert.equal(inv.count('wood'), 50);
    assert.equal(inv.count('stone_hatchet'), 1);
});
test('crafting: failure never goes negative', () => {
    const inv = new StorageInventory([], REG);
    inv.add('wood', 10);
    const r = craft(PHASE1_RECIPES.stone_axe, adapter(inv), 1);
    assert.ok(!r.ok && r.missing.wood > 0);
    assert.equal(inv.count('wood'), 10);
});
test('crafting: qty multiplies cost', () => {
    const inv = new StorageInventory([], { ...REG, torch: 1 });
    inv.add('wood', 40); inv.add('cloth', 10);
    assert.ok(canCraft(PHASE1_RECIPES.torch, adapter(inv), 2));
    assert.ok(!canCraft(PHASE1_RECIPES.torch, adapter(inv), 3));
});

// ---------- resources ----------
test('resources: defs complete + tool bonus', () => {
    for (const d of Object.values(NODE_TYPES)) {
        assert.ok(d.health > 0 && d.resourceType && d.respawnTime > 0);
    }
    const tree = getNodeDef('tree');
    const bare = yieldForHit(tree, null);
    const axe = yieldForHit(tree, 'stone_hatchet');
    assert.ok(axe.wood > bare.wood);
});
test('resources: respawn manager due + persist', () => {
    let now = 1000000;
    const m = new RespawnManager(() => now);
    m.schedule('t1', 'tree', { x: 1, y: 0, z: 2 }, 60);
    assert.equal(m.due().length, 0);
    now += 61000;
    const due = m.due();
    assert.equal(due.length, 1);
    assert.equal(due[0].type, 'tree');
    m.schedule('t2', 'rock', { x: 0, y: 0, z: 0 }, 60);
    const m2 = RespawnManager.fromJSON(m.toJSON(), () => now);
    assert.equal(m2.pendingCount(), 1);
    now += 61000;
    assert.equal(m2.due().length, 1);
});

// ---------- water ----------
test('water: drink clamps at max, containers deplete', () => {
    const s = { thirst: 90 };
    const r = drink(s, { type: 'lake' });
    assert.equal(s.thirst, 100);
    assert.ok(r.drank > 0);
    const c = { type: 'container', level: 10 };
    const s2 = { thirst: 0 };
    drink(s2, c);
    assert.equal(c.level, 0);
    const r2 = drink(s2, c);
    assert.ok(r2.empty);
    assert.ok(getWaterSource('river').infinite);
});

// ---------- weather ----------
test('weather: transitions + rain flag + persist', () => {
    let seed = 42;
    const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const w = new WeatherSystem({ weights: { clear: 0, rain: 100 }, minDuration: 5, maxDuration: 5, rng });
    assert.equal(w.update(6), true);
    assert.equal(w.current, 'rain');
    assert.ok(w.isRaining);
    const w2 = WeatherSystem.fromJSON(w.toJSON(), { rng });
    assert.equal(w2.current, 'rain');
});

// ---------- day/night ----------
test('daynight: wraps day, phases, factors', () => {
    const r = DayNight.advance(1, 790, 20, 800);
    assert.equal(r.day, 2);
    assert.ok(r.wrapped);
    assert.ok(DayNight.isNight(500, 800));
    assert.ok(!DayNight.isNight(100, 800));
    assert.ok(DayNight.daylightFactor(100, 800) > 0.5);
});

// ---------- interaction ----------
test('interaction: priority + act dispatch', () => {
    const sys = new InteractionSystem();
    sys.register('a', { priority: 1, canInteract: () => true, label: () => 'A', act: () => 'a-done' });
    sys.register('b', { priority: 5, canInteract: (c) => c.near, label: () => 'B', act: () => 'b-done' });
    const found = sys.getInteractable({ near: true });
    assert.ok(found && found.kind === 'b');
    assert.equal(sys.interact({ near: true }), true);
    const fallback = sys.getInteractable({ near: false });
    assert.ok(fallback && fallback.kind === 'a');
});

// ---------- save ----------
test('save: v1 migrates with defaults', () => {
    const v1 = JSON.stringify({
        version: 1.0, timestamp: 1,
        player: { position: { x: 1, y: 2, z: 3 }, rotation: { y: 0.5 }, stats: { health: 80, hunger: 50, thirst: 60, radiation: 5 }, inventory: [{ id: 'wood', count: 10 }], belt: ['hammer', null] },
        time: 123, structures: [],
    });
    const s = SaveSystem.loadFromString(v1);
    assert.ok(s);
    assert.equal(s && s.saveVersion, 2);
    assert.equal(s && s.player.stats.stamina, 100);
    assert.equal(s && s.player.stats.temperature, 100);
    assert.equal(s && s.world.day, 1);
});
test('save: corruption rejected, negatives cleaned', () => {
    assert.equal(SaveSystem.loadFromString('not json{{'), null);
    assert.equal(SaveSystem.loadFromString(''), null);
    const s = SaveSystem.migrate({ saveVersion: 2, inventory: [{ id: 'wood', count: -5 }, { id: 'x' }], player: {} });
    assert.ok(s);
    assert.deepEqual(s && s.inventory, []);
});
test('save: fuzz garbage never throws (no crash, null or clean save)', () => {
    // Axis 4: a corrupt save must surface as rejection, never an exception.
    // The game turns rejection into a "Save corrupted — fresh start" notification.
    const garbage = [
        null, undefined, 42, 'x', [], {}, '{"a":',
        { saveVersion: 2, player: null, inventory: 'nope', world: 7, buildings: 0 },
        { version: 1.0, player: { stats: { health: 'a lot' }, inventory: [{ id: 5, count: {} }] } },
        { saveVersion: 99, player: { position: [1, 2] }, inventory: [{}, null, 3] },
        JSON.stringify({ saveVersion: 2, inventory: new Array(500).fill({ id: 'wood', count: 1 }) }),
    ];
    for (const g of garbage) {
        let out;
        if (typeof g === 'string' && (g.startsWith('{') || g.startsWith('['))) {
            out = SaveSystem.loadFromString(g);
        } else {
            out = SaveSystem.migrate(/** @type {any} */ (g));
        }
        assert.ok(out === null || out.saveVersion === 2, 'fuzz case must be null or v2');
        if (out) {
            assert.ok(Array.isArray(out.inventory));
            for (const e of out.inventory) {
                assert.ok(typeof e.id === 'string' && e.count > 0);
            }
        }
    }
});
test('save: storage backend roundtrip', () => {
    const mem = new Map();
    const backend = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
    const blank = SaveSystem.blank();
    assert.ok(SaveSystem.write(backend, 'k', blank));
    const back = SaveSystem.read(backend, 'k');
    assert.ok(back);
    assert.equal(back && back.saveVersion, 2);
});

// ---------- input ----------
test('input: keyboard maps to actions, touch moves', () => {
    const input = new InputSystem();
    const keys = { KeyW: true, Space: true };
    input.addProvider(keyboardProvider(keys));
    input.poll();
    assert.ok(input.isDown(Actions.FORWARD));
    assert.ok(input.isDown(Actions.JUMP));
    assert.ok(!input.isDown(Actions.ATTACK));
    const t = new InputSystem();
    t.addProvider(touchProvider({ attack: true }));
    t.setTouch({ moveX: 0, moveY: -0.8 });
    t.poll();
    assert.ok(t.isDown(Actions.ATTACK));
    assert.ok(t.isDown(Actions.FORWARD));
});

// ---------- hud ----------
test('hud: clock + percent', () => {
    assert.ok(formatClock(3, 400, 800).startsWith('Day 03'));
    assert.equal(statPercent(25, 100), 25);
    assert.equal(statPercent(999, 100), 100);
    assert.equal(statPercent(-5, 100), 0);
});


