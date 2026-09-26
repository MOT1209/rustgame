import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---- Phase 1 modular systems (pure, testable, no DOM/THREE) ----
import { SURVIVAL_CONFIG, SAVE_VERSION, SAVE_KEY } from './core/config.ts';
import { DamageSystem, DamageTypes } from './player/damage.ts';
import { StaminaSystem } from './player/stamina.ts';
import { SurvivalSystem } from './player/survival.ts';
import { FOOD_DEFS } from './inventory/items.js';
import { StorageInventory } from './inventory/storage.js';
import { PHASE1_RECIPES } from './crafting/recipes.js';
import { NODE_TYPES, getNodeDef, yieldForHit } from './world/resources.js';
import { WATER_SOURCES, drink as drinkFromSource } from './world/water.js';
import { WeatherSystem } from './world/weather.js';
import { DayNight } from './world/day-night.js';
import { InteractionSystem, InteractKinds } from './interaction/interaction.js';
import { SaveSystem } from './save/save-system.ts';
import { detectRuntime, loadMode, resolveDevice, saveMode } from './core/platform.ts';
import { InputSystem, Actions, keyboardProvider, touchProvider, gamepadProvider } from './input/input.js';
import { UnifiedGameControls } from './input/touch-controls.js';
import { updateSurvivalHud, setPrompt } from './ui/hud.js';

// Rust Survival Engine v2.5: Initializing with Collision Physics...

// ==================== CONFIGURATION ====================
const CONFIG = {
    WORLD_SIZE: 400,
    TREE_COUNT: 70,
    ROCK_COUNT: 40,
    SULFUR_COUNT: 25,
    BARREL_COUNT: 30,
    BUILD_DISTANCE: 7,
    INTERACT_DISTANCE: 5.0,
    PLAYER_SPEED: 95,
    FRICTION: 10.0,
    GRAVITY: 26.0,
    JUMP_FORCE: 9.5,
    PLAYER_RADIUS: 0.8,
    DAY_LENGTH: 800,
    RAD_ZONE_RADIUS: 25,
    TC_RADIUS: 25
};

// ==================== STATE ====================
const state = {
    inventory: [
        { id: 'wood', count: 2000 },
        { id: 'stone', count: 1000 },
        { id: 'frag', count: 500 },
        { id: 'hqm', count: 100 },
        { id: 'building_plan', count: 1 },
        { id: 'hammer', count: 1 }
    ],
    gear: { head: null, chest: null, legs: null, feet: null },
    belt: ['building_plan', 'hammer', null, null, null, null],
    stats: { health: 100, hunger: 100, thirst: 100, radiation: 0, stamina: 100, temperature: 100, bleeding: 0 },
    day: 1,
    dead: false,
    deathCount: 0,
    reviveCount: 0,
    buildMode: false,
    viewMode: 'first',
    controls: { forward: false, backward: false, left: false, right: false, jump: false, canJump: false, crouch: false, sprint: false },
    selectedBeltSlot: 0,
    selectedCategory: 'common',
    selectedItem: null,
    craftQty: 1,
    time: 300,
    // Building System
    building: {
        blueprintOpen: false,
        selectedBlueprint: null, // 'foundation', 'wall', 'doorway', 'ceiling'
        rotationY: 0, // Current Y-axis rotation for the blueprint in radians
        placingStructure: false,
        lookingAtStructure: null,
        toolCupboards: [] // [{pos, radius}]
    }
};

// Building Materials Database
const BUILDING_TIERS = {
    twig: { name: 'Twig', health: 10, color: 0xd7ccc8, cost: {} },
    wood: { name: 'Wood', health: 250, color: 0x8d6e63, cost: { wood: 300 } },
    stone: { name: 'Stone', health: 500, color: 0xb0bec5, cost: { stone: 300 } },
    metal: { name: 'Sheet Metal', health: 1000, color: 0x90a4ae, cost: { frag: 200 } },
    hqm: { name: 'Armored', health: 2000, color: 0xeceff1, cost: { hqm: 50 } },
    door: { name: 'Wooden Door', health: 200, color: 0x5d4037, cost: { wood: 300 } }
};

const BUILDING_TYPES = {
    foundation: { name: 'Foundation', geometry: [3, 0.2, 3], offset: [0, 0.1, 0], requiresSupport: false },
    wall: { name: 'Wall', geometry: [3, 3, 0.2], offset: [0, 1.5, 0], requiresSupport: true },
    doorway: { name: 'Doorway', geometry: [3, 3, 0.2], offset: [0, 1.5, 0], requiresSupport: true },
    ceiling: { name: 'Ceiling', geometry: [3, 0.2, 3], offset: [0, 3, 0], requiresSupport: true },
    tool_cupboard: { name: 'Tool Cupboard', geometry: [1, 1.8, 0.8], offset: [0, 0.9, 0], requiresSupport: true },
    wooden_door: { name: 'Door', geometry: [0.9, 2.1, 0.1], offset: [0, 1.05, 0], isDoor: true }
};

const ITEMS_DATA = {
    // Resources (Natural)
    'wood': { name: 'Wood', category: 'resources', icon: 'fa-tree', color: '#8d6e63', rarity: 'common', desc: 'Harvested from trees. Used for base building and Fuel.' },
    'stone': { name: 'Stone', category: 'resources', icon: 'fa-gem', color: '#b0bec5', rarity: 'common', desc: 'Raw stone for primitive tools and base stabilization.' },
    'iron': { name: 'Metal Ore', category: 'resources', icon: 'fa-mountain', color: '#90a4ae', rarity: 'common', desc: 'Raw iron ore. Smelt this to get metal fragments.' },
    'sulfur': { name: 'Sulfur Ore', category: 'resources', icon: 'fa-flask', color: '#fff176', rarity: 'common', desc: 'Volatile ore used in explosives and gunpowder.' },
    'hqm': { name: 'High Quality Metal', category: 'resources', icon: 'fa-diamond', color: '#eceff1', rarity: 'elite', desc: 'Rare refined metal for modular weapons and armor.' },

    // Processed Resources
    'frag': { name: 'Metal Fragments', category: 'resources', icon: 'fa-cube', color: '#ef5350', rarity: 'rare', desc: 'Refined iron used for most mid-tier items.' },
    'lgf': { name: 'Low Grade Fuel', category: 'resources', icon: 'fa-gas-pump', color: '#e53935', rarity: 'common', desc: 'Tallow and cloth mix. Powering your survival.' },
    'cloth': { name: 'Cloth', category: 'resources', icon: 'fa-scroll', color: '#f5f5f5', rarity: 'common', desc: 'Fibers from hemp plants. Used for clothing and meds.' },
    'leather': { name: 'Leather', category: 'resources', icon: 'fa-hide', color: '#795548', rarity: 'rare', desc: 'High-durability animal skin.' },

    // Components
    'scrap': { name: 'Scrap', category: 'items', icon: 'fa-nut-bolt', color: '#d1c4e9', rarity: 'rare', desc: 'Essential material for unlocking higher technology.' },
    'gear_comp': { name: 'Gears', category: 'items', icon: 'fa-gear', color: '#bdbdbd', rarity: 'rare', desc: 'Rusty mechanical parts for machinery.' },
    'pipe': { name: 'Metal Pipe', category: 'items', icon: 'fa-water', color: '#90a4ae', rarity: 'rare', desc: 'Sturdy pipe used for firearms barrels.' },
    'spring': { name: 'Spring', category: 'items', icon: 'fa-coil', color: '#cfd8dc', rarity: 'rare', desc: 'Tension spring for automatic weapons.' },
    'sewing': { name: 'Sewing Kit', category: 'items', icon: 'fa-needle', color: '#bdbdbd', rarity: 'common', desc: 'Required for advanced clothing.' },

    // Tools (Survival)
    'stone_hatchet': { name: 'Stone Hatchet', category: 'tools', icon: 'fa-axe', color: '#bcaae1', rarity: 'common', recipe: { wood: 200, stone: 100 }, desc: 'Primitive tool for wood harvesting.' },
    'stone_pickaxe': { name: 'Stone Pickaxe', category: 'tools', icon: 'fa-hammer-war', color: '#bcaae1', rarity: 'common', recipe: { wood: 200, stone: 100 }, desc: 'Slow but effective for basic mining.' },
    'hammer': { name: 'Building Hammer', category: 'tools', icon: 'fa-hammer', color: '#1e88e5', rarity: 'common', recipe: { wood: 100 }, desc: 'Construct and upgrade your base.' },
    'torch': { name: 'Torch', category: 'tools', icon: 'fa-fire', color: '#fb8c00', rarity: 'common', recipe: { wood: 50, lgf: 1 }, desc: 'Provides light and subtle heat.' },

    // Weapons (Defense)
    'spear': { name: 'Wooden Spear', category: 'weapons', icon: 'fa-pencil', color: '#8d6e63', rarity: 'common', recipe: { wood: 300 }, desc: 'Cheap long-range melee option.' },
    'machete': { name: 'Machete', category: 'weapons', icon: 'fa-knife', color: '#90a4ae', rarity: 'rare', recipe: { iron: 100 }, desc: 'Standard industrial blade.' },
    'bow': { name: 'Hunting Bow', category: 'weapons', icon: 'fa-bow-arrow', color: '#8d6e63', rarity: 'common', recipe: { wood: 200, cloth: 50 }, desc: 'Silent and deadly ranged tool.' },
    'pistol': { name: 'Semi-Pistol', category: 'weapons', icon: 'fa-gun', color: '#546e7a', rarity: 'rare', recipe: { iron: 150, pipe: 1 }, desc: 'P250 clone. Fast firing sidearm.' },
    'ak47': { name: 'Assault Rifle', category: 'weapons', icon: 'fa-gun', color: '#6d4c41', rarity: 'elite', recipe: { hqm: 50, wood: 200, scrap: 50, pipe: 1 }, desc: 'The king of Rust weapons. High recoil, high reward.' },

    // Industrial
    'furnace': { name: 'Furnace', category: 'items', icon: 'fa-fire-burner', color: '#ff7043', rarity: 'rare', recipe: { stone: 200, wood: 100, lgf: 10 }, desc: 'Smelts ores into metal/sulfur using wood.' },
    'campfire': { name: 'Campfire', category: 'items', icon: 'fa-fire', color: '#ffab40', rarity: 'common', recipe: { wood: 100 }, desc: 'Useful for light and cooking meat.' },

    // Construction
    'building_plan': { name: 'Building Plan', category: 'tools', icon: 'fa-scroll', color: '#64b5f6', rarity: 'common', recipe: { wood: 20 }, desc: 'Select building pieces to place.' },
    'door': { name: 'Wood Door', category: 'construction', icon: 'fa-door-closed', color: '#8d6e63', rarity: 'common', recipe: { wood: 300 }, desc: 'Access point with minimal security.' },
    'lock': { name: 'Key Lock', category: 'construction', icon: 'fa-lock', color: '#546e7a', rarity: 'common', recipe: { iron: 100 }, desc: 'Basic protection for your base.' },

    // Medical
    'bandage': { name: 'Bandage', category: 'medical', icon: 'fa-band-aid', color: '#e57373', rarity: 'common', recipe: { cloth: 2 }, desc: 'Stops bleeding immediately.' },
    'syringe': { name: 'Medical Syringe', category: 'medical', icon: 'fa-syringe', color: '#ef5350', rarity: 'rare', recipe: { iron: 20, scrap: 5, cloth: 10 }, desc: 'Instant adrenaline-boosted recovery.' },
    'wooden_door': { name: 'Wooden Door', category: 'construction', icon: 'fa-door-closed', color: '#5d4037', rarity: 'common', recipe: { wood: 300 }, desc: 'Fits into doorways.' },
    'codelock': { name: 'Code Lock', category: 'items', icon: 'fa-calculator', color: '#78909c', rarity: 'rare', recipe: { frag: 100 }, desc: 'Secure your doors with a 4-digit code.' },
    'wooden_box': { name: 'Wooden Storage Box', category: 'survival', icon: 'fa-box-archive', color: '#a1887f', rarity: 'common', recipe: { wood: 150 }, desc: 'Placeable container. Stores 12 stacks. Press E near ground to place.' }
};

// Phase 1: merge food/consumable defs (spoil-ready model) into the item registry.
Object.assign(ITEMS_DATA, FOOD_DEFS);

// ==================== GLOBAL HELPERS ====================
function showNotification(msg, color = '#4caf50') {
    let note = document.getElementById('game-notification');
    if (!note) {
        note = document.createElement('div');
        note.id = 'game-notification';
        note.style.cssText = "position:fixed; top:20px; right:20px; background:rgba(0,0,0,0.7); color:#4caf50; padding:10px 20px; border-radius:5px; font-weight:bold; z-index:2000; display:none;";
        document.body.appendChild(note);
    }
    note.textContent = msg;
    note.style.color = color;
    note.style.display = 'block';
    setTimeout(() => note.style.display = 'none', 2000);
}






let playerMesh;



const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// ==================== CORE FUNCTIONS ====================
// ==================== TERRAIN GENERATION ====================
// Simple pseudo-noise for terrain
function hash(x, z) {
    let h = x * 374761393 + z * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) / 2147483647;
}

function smoothNoise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    const v00 = hash(ix, iz);
    const v10 = hash(ix + 1, iz);
    const v01 = hash(ix, iz + 1);
    const v11 = hash(ix + 1, iz + 1);
    const v0 = v00 + (v10 - v00) * sx;
    const v1 = v01 + (v11 - v01) * sx;
    return v0 + (v1 - v0) * sz;
}

function fbm(x, z, octaves = 4) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxVal = 0;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * smoothNoise(x * frequency, z * frequency);
        maxVal += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    return value / maxVal;
}

function getTerrainHeight(x, z) {
    // Multi-octave noise for varied terrain
    const h1 = fbm(x * 0.015, z * 0.015, 4) * 8;  // Large hills
    const h2 = fbm(x * 0.04, z * 0.04, 3) * 3;    // Medium detail
    const h3 = Math.sin(x * 0.02) * Math.cos(z * 0.025) * 1.5; // Ridge effect
    const baseHeight = h1 + h2 + h3;

    // Flatten near origin (spawn area)
    const distFromOrigin = Math.sqrt(x * x + z * z);
    const flattenRadius = 15;
    const blend = Math.min(1, distFromOrigin / flattenRadius);
    const spawnHeight = 0;
    return spawnHeight + (baseHeight - spawnHeight) * Math.max(0, blend * blend * (3 - 2 * blend));
}

function getItemCount(id) {
    const item = state.inventory.find(i => i.id === id);
    return item ? item.count : 0;
}

function addItem(id, count) {
    // Phase 1 validation (§28): unknown items and bad counts never crash or corrupt.
    if (!id || typeof id !== 'string' || !ITEMS_DATA[id]) {
        console.warn('[inventory] rejected unknown item:', id);
        return 0;
    }
    if (typeof count !== 'number' || !isFinite(count) || count <= 0) return 0;
    const whole = Math.floor(count);
    let item = state.inventory.find(i => i.id === id);
    if (item) item.count += whole;
    else state.inventory.push({ id, count: whole });
    updateHUD();
    return whole;
}

// Phase 1: clamped removal — never lets counts go negative. Returns removed.
function removeItem(id, count) {
    if (!id || typeof count !== 'number' || !isFinite(count) || count <= 0) return 0;
    const item = state.inventory.find(i => i.id === id);
    if (!item) return 0;
    const actual = Math.min(item.count, Math.floor(count));
    item.count -= actual;
    if (item.count <= 0) state.inventory.splice(state.inventory.indexOf(item), 1);
    updateHUD();
    return actual;
}

// Phase 1: all-or-nothing consume. Returns true only when fully consumed.
function consumeItem(id, count) {
    if (getItemCount(id) < count) return false;
    removeItem(id, count);
    return true;
}

// Phase 1: use a consumable (food/medical) from the inventory.
function useConsumable(id) {
    const def = FOOD_DEFS[id] || ITEMS_DATA[id];
    if (!def || getItemCount(id) <= 0) return false;
    if (!consumeItem(id, 1)) return false;
    if (def.hungerRestore) state.stats.hunger = Math.min(100, state.stats.hunger + def.hungerRestore);
    if (def.thirstRestore) state.stats.thirst = Math.min(100, state.stats.thirst + def.thirstRestore);
    if (def.healthRestore) {
        if (def.healthRestore > 0) DamageSystem.heal(state.stats, def.healthRestore);
        else DamageSystem.applyDamage(state.stats, -def.healthRestore, DamageTypes.GENERIC);
    }
    if ((id === 'bandage' || (ITEMS_DATA[id] && ITEMS_DATA[id].category === 'medical')) && SURVIVAL_CONFIG.bandageStopsBleeding) {
        state.stats.bleeding = 0;
    }
    showNotification(`Used ${def.name}`, '#2ecc71');
    SoundFX.ui_click();
    updateHUD();
    return true;
}

function updateHUD() {
    const woodSpan = document.getElementById('wood-count');
    const stoneSpan = document.getElementById('stone-count');
    const ironSpan = document.getElementById('iron-count');
    if (woodSpan) woodSpan.innerText = getItemCount('wood');
    if (stoneSpan) stoneSpan.innerText = getItemCount('stone');
    if (ironSpan) ironSpan.innerText = getItemCount('iron');
    updateHUDSimulation();
}

function updateHUDSimulation() {
    // Phase 1: throttled HUD writer (bars + clock), DOM touched only on change.
    updateSurvivalHud(state.stats, { day: state.day || 1, time: state.time }, SURVIVAL_CONFIG.dayLength);

    const overlay = document.getElementById('rad-overlay');
    if (overlay) overlay.style.opacity = state.stats.radiation / 200;

    // HitMarker fade
    const hm = document.getElementById('hitmarker');
    if (hm && parseFloat(hm.style.opacity) > 0) {
        hm.style.opacity = parseFloat(hm.style.opacity) - 0.05;
    }
}

function showHitMarker() {
    let hm = document.getElementById('hitmarker');
    if (!hm) {
        hm = document.createElement('div');
        hm.id = 'hitmarker';
        hm.style.cssText = 'position:fixed; top:50%; left:50%; width:20px; height:20px; border:2px solid #fff; transform:translate(-50%,-50%) rotate(45deg); pointer-events:none; z-index:100; opacity:0; transition:none;';
        document.body.appendChild(hm);
    }
    hm.style.opacity = '1';
}

function screenFlash(color = 'rgba(255,0,0,0.3)') {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:${color}; pointer-events:none; z-index:1000; animation: fadeOut 0.3s forwards;`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
}

function createPlayer(scene) {
    const group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x8b322c }));
    torso.position.y = 1.25; torso.castShadow = true; group.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    head.position.y = 1.85; head.castShadow = true; group.add(head);
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const lLeg = new THREE.Mesh(legGeo, legMat); lLeg.position.set(-0.15, 0.4, 0); lLeg.castShadow = true; group.add(lLeg);
    const rLeg = new THREE.Mesh(legGeo, legMat); rLeg.position.set(0.15, 0.4, 0); rLeg.castShadow = true; group.add(rLeg);
    scene.add(group);
    return group;
}

// ==================== SYSTEMS ====================
class NPC {
    constructor(scene, type, position, world) {
        this.scene = scene;
        this.world = world || null; // { collisionObjects, npcs } — fixes scope crash in die()
        this.type = type;
        this.mesh = new THREE.Group();
        const color = type === 'wolf' ? 0x5d4037 : (type === 'bear' ? 0x3e2723 : 0x01579b);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.4), new THREE.MeshStandardMaterial({ color }));
        body.position.y = 0.7; this.mesh.add(body);

        if (type === 'scientist') {
            const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x212121 }));
            gun.position.set(0.4, 1.0, 0.4); this.mesh.add(gun);
        }

        this.mesh.position.copy(position);
        this.mesh.userData = { npc: this, radius: 0.6 };
        scene.add(this.mesh);
        this.velocity = new THREE.Vector3();
        this.health = type === 'bear' ? 120 : (type === 'scientist' ? 80 : 50);
        this.maxHealth = this.health;
        this.lastAttack = 0;
        this.dead = false;
    }
    takeDamage(amount) {
        if (this.dead) return;
        this.health -= amount;
        // Flash red
        this.mesh.children.forEach(c => { if (c.isMesh) c.material.emissive.setHex(0xff0000); c.material.emissiveIntensity = 0.5; });
        setTimeout(() => {
            this.mesh.children.forEach(c => { if (c.isMesh) { c.material.emissiveIntensity = 0; } });
        }, 100);
        if (this.health <= 0) this.die();
    }
    die() {
        this.dead = true;
        // Drop loot
        const lootMap = { wolf: { cloth: 10, leather: 5 }, bear: { cloth: 15, leather: 10 }, scientist: { scrap: 15, frag: 10 } };
        const loot = lootMap[this.type] || { cloth: 5 };
        Object.entries(loot).forEach(([id, count]) => addItem(id, count));
        showNotification(`${this.type} killed! +${Object.values(loot).reduce((a,b)=>a+b,0)} resources`, '#e74c3c');
        // Remove from collision (Phase 1: world refs injected via constructor)
        const colArr = (this.world && this.world.collisionObjects) || [];
        const idx = colArr.indexOf(this.mesh);
        if (idx !== -1) colArr.splice(idx, 1);
        // Fade out and remove
        const self = this;
        const interval = setInterval(() => {
            self.mesh.scale.multiplyScalar(0.9);
            self.mesh.position.y -= 0.05;
            if (self.mesh.scale.x < 0.1) {
                clearInterval(interval);
                if (self.scene) self.scene.remove(self.mesh);
                // Remove from npcs array
                const arr = (self.world && self.world.npcs) || [];
                const npcIdx = arr.indexOf(self);
                if (npcIdx !== -1) arr.splice(npcIdx, 1);
            }
        }, 30);
    }
    update(delta, playerPos) {
        if (this.dead) return;
        const dist = this.mesh.position.distanceTo(playerPos);
        const agroRange = this.type === 'scientist' ? 30 : 18;
        const attackRange = this.type === 'scientist' ? 12 : 2.5;

        if (dist < agroRange) {
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
            if (dist > attackRange - 1) {
                const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
                this.mesh.position.addScaledVector(dir, (this.type === 'bear' ? 3 : 5) * delta);
            }
            if (dist < attackRange && performance.now() - this.lastAttack > (this.type === 'scientist' ? 800 : 1200)) {
                // Phase 1: centralized damage + bleeding from animal attacks.
                const dmg = (this.type === 'bear' ? 20 : (this.type === 'scientist' ? 8 : 12));
                DamageSystem.applyDamage(state.stats, dmg, DamageTypes.ANIMAL);
                if (this.type !== 'scientist' && Math.random() < 0.25) {
                    state.stats.bleeding = 1;
                    showNotification('🩸 You are bleeding! Use a bandage.', '#e74c3c');
                }
                updateHUD(); this.lastAttack = performance.now();
                SoundFX.hit();
            }
        }
    }
}

const radZones = [];
const npcs = [];

function createMonument(scene, x, z) {
    const tower = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 20, 8), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
    base.position.y = 10; tower.add(base);
    tower.position.set(x, getTerrainHeight(x, z), z);
    scene.add(tower);
    radZones.push({ x, z, r: CONFIG.RAD_ZONE_RADIUS });
    const loot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), new THREE.MeshStandardMaterial({ color: 0xffa000 }));
    loot.position.set(x + 2, getTerrainHeight(x + 2, z) + 0.5, z);
    loot.userData = { type: 'crate', health: 999, radius: 0.8 }; // Phase 1: looted with E, not hits
    scene.add(loot);
}

// ==================== ENGINE START ====================
try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const pointerControls = new PointerLockControls(camera, document.body);
    playerMesh = createPlayer(scene);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c2e, 0.6);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(100, 200, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    sun.shadow.camera.far = 500;
    scene.add(sun);

    // World Detail
    const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE, 120, 120);
    groundGeo.rotateX(-Math.PI / 2);
    const groundPos = groundGeo.attributes.position;
    const colors = new Float32Array(groundPos.count * 3);
    for (let i = 0; i < groundPos.count; i++) {
        const x = groundPos.getX(i);
        const z = groundPos.getZ(i);
        const y = getTerrainHeight(x, z);
        groundPos.setY(i, y);
        // Vertex color based on height
        const normY = (y + 4) / 16; // normalize roughly
        let r, g, b;
        if (y < 0.5) {
            // Low: sandy/dirt
            r = 0.6; g = 0.5 + normY * 0.2; b = 0.2;
        } else if (y < 3) {
            // Mid: grass
            const t = (y - 0.5) / 2.5;
            r = 0.2 + t * 0.3;
            g = 0.5 + t * 0.15;
            b = 0.1 + t * 0.1;
        } else {
            // High: rocky
            const t = Math.min(1, (y - 3) / 5);
            r = 0.4 + t * 0.3;
            g = 0.35 + t * 0.25;
            b = 0.2 + t * 0.2;
        }
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.05
    }));
    ground.receiveShadow = true;
    scene.add(ground);

    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const interactables = [];
    const collisionObjects = [];
    const builtStructures = [];

    // ==================== PLATFORM / DEVICE MODE (M1) ====================
    // One build, three targets: web hosts both schemes, APK defaults to
    // phone, Electron .exe defaults to desktop. The user override lives in
    // localStorage (per-device preference, never in the save file).
    const deviceEnv = {
        touchPoints: Number(navigator.maxTouchPoints) || 0,
        touchEvents: 'ontouchstart' in window,
        coarsePointer: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
        minViewportSide: Math.min(window.innerWidth || 0, window.innerHeight || 0),
    };
    const runtimeKind = detectRuntime({
        capacitorNative: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
        electron: window.RASHID_RUNTIME === 'electron',
    });
    let deviceKind = resolveDevice(loadMode(localStorage), deviceEnv, runtimeKind);

    /** Apply a mode: persist, resolve, toggle UI scheme + touch layer. */
    function applyDeviceMode(mode) {
        saveMode(localStorage, mode);
        deviceKind = resolveDevice(mode, deviceEnv, runtimeKind);
        document.body.dataset.device = deviceKind;
        if (deviceKind === 'phone') gameControls.init(true);
        else gameControls.destroy();
        for (const m of ['auto', 'phone', 'desktop']) {
            const btn = document.getElementById('device-mode-' + m);
            if (btn) btn.classList.toggle('active', loadMode(localStorage) === m);
        }
    }
    window.__setDeviceMode = (mode) => applyDeviceMode(mode);

    // ==================== BUILDING SYSTEM ====================
    function initBlueprintSelector() {
        const blueprintItems = document.querySelectorAll('.blueprint-item');
        blueprintItems.forEach(item => {
            item.onclick = () => {
                selectBlueprintPiece(item.dataset.type);
            };
        });
        initRadialMenu();
    }

    function selectBlueprintPiece(type) {
        state.building.selectedBlueprint = type;
        state.building.blueprintOpen = false;
        document.getElementById('blueprint-selector').style.display = 'none';
        document.getElementById('radial-menu').style.display = 'none';

        updateBlueprintIndicator();

        // Lock controls back if we came from radial/blueprint menu
        pointerControls.lock();
    }

    function initRadialMenu() {
        const container = document.getElementById('radial-pieces-container');
        if (!container) return;
        container.innerHTML = '';

        const pieces = [
            { type: 'foundation', icon: 'fa-square' },
            { type: 'wall', icon: 'fa-border-all' },
            { type: 'doorway', icon: 'fa-door-open' },
            { type: 'ceiling', icon: 'fa-th-large' },
            { type: 'tool_cupboard', icon: 'fa-box-archive' },
            { type: 'wooden_door', icon: 'fa-door-closed' }
        ];

        const radius = 160;
        pieces.forEach((p, i) => {
            const angle = (i / pieces.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const el = document.createElement('div');
            el.className = 'radial-piece';
            el.style.left = `calc(50% + ${x}px - 42px)`;
            el.style.top = `calc(50% + ${y}px - 42px)`;
            el.innerHTML = `<i class="fas ${p.icon}"></i><span>${p.type.replace('_', ' ')}</span>`;
            el.onclick = (e) => {
                e.stopPropagation();
                selectBlueprintPiece(p.type);
            };
            container.appendChild(el);
        });
    }

    function updateBlueprintIndicator() {
        let indicator = document.getElementById('blueprint-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'blueprint-indicator';
            indicator.style.cssText = 'position:fixed; top:100px; left:50%; transform:translateX(-50%); background:rgba(205,92,44,0.95); color:white; padding:12px 25px; border-radius:6px; font-weight:900; font-size:1rem; z-index:200; box-shadow:0 4px 12px rgba(0,0,0,0.5);';
            document.body.appendChild(indicator);
        }

        if (state.building.selectedBlueprint) {
            const name = BUILDING_TYPES[state.building.selectedBlueprint].name;
            indicator.innerHTML = `📐 Selected: <span style="color:#ffd700;">${name}</span> | Angle: ${Math.round(state.building.rotationY * 180 / Math.PI)}° (Press R to rotate, G to cancel)`;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    function canBuildHere(position, type) {
        const buildData = BUILDING_TYPES[type];

        // 1. TC Overlap Check
        if (type === 'tool_cupboard') {
            for (let tc of state.building.toolCupboards) {
                const dist = Math.sqrt((position.x - tc.pos.x) ** 2 + (position.z - tc.pos.z) ** 2);
                if (dist < CONFIG.TC_RADIUS) return false;
            }
        }

        // 2. Stability / Support Check
        if (buildData.requiresSupport) {
            let hasFoundation = false;
            for (let s of builtStructures) {
                const dist = s.position.distanceTo(new THREE.Vector3(position.x, s.position.y, position.z));
                if (dist < 0.5 && (s.userData.buildType === 'foundation' || s.userData.buildType === 'ceiling')) {
                    hasFoundation = true;
                    break;
                }
            }
            if (!hasFoundation && type !== 'foundation') return false;
        }

        // 3. Door placement check
        if (type === 'wooden_door') {
            let onDoorway = false;
            for (let s of builtStructures) {
                const dist = s.position.distanceTo(new THREE.Vector3(position.x, s.position.y, position.z));
                if (dist < 0.5 && s.userData.buildType === 'doorway') {
                    onDoorway = true;
                    break;
                }
            }
            if (!onDoorway) return false;
        }

        return true;
    }

    function placeStructure() {
        if (!state.building.selectedBlueprint) return;
        const blueprint = state.building.selectedBlueprint;
        const buildData = BUILDING_TYPES[blueprint];

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = raycaster.intersectObjects([ground, ...builtStructures], true);

        if (hits.length > 0 && hits[0].distance < 10) {
            const point = hits[0].point;

            const snapX = Math.round(point.x / 3) * 3;
            const snapY = buildData.offset[1];
            const snapZ = Math.round(point.z / 3) * 3;

            // Offset for ceiling/walls if placing on existing structures
            let targetY = snapY;
            if (hits[0].object.userData.type === 'structure') {
                if (blueprint === 'ceiling') targetY = hits[0].object.position.y + 3;
                if (blueprint === 'wall' || blueprint === 'doorway') targetY = hits[0].object.position.y;
            }

            if (!canBuildHere({ x: snapX, z: snapZ }, blueprint)) {
                showNotification("Cannot build here: Invalid Support");
                return;
            }

            const geometry = new THREE.BoxGeometry(...buildData.geometry);
            const material = new THREE.MeshStandardMaterial({
                color: BUILDING_TIERS.twig.color,
                roughness: 0.8
            });
            const structure = new THREE.Mesh(geometry, material);
            structure.position.set(snapX, targetY, snapZ);
            structure.rotation.y = state.building.rotationY;
            structure.castShadow = true;
            structure.receiveShadow = true;

            structure.userData = {
                type: buildData.isDoor ? 'door' : 'structure',
                buildType: blueprint,
                tier: 'twig',
                health: BUILDING_TIERS.twig.health,
                maxHealth: BUILDING_TIERS.twig.health,
                isOpen: false,
                isDoor: buildData.isDoor
            };

            if (blueprint === 'tool_cupboard') {
                structure.userData.type = 'tool_cupboard';
                state.building.toolCupboards.push({ pos: { x: snapX, z: snapZ }, radius: CONFIG.TC_RADIUS });
            }

            scene.add(structure);
            builtStructures.push(structure);
            collisionObjects.push(structure);

            // Build Animation
            structure.scale.set(0.1, 0.1, 0.1);
            let sc = 0.1;
            const ani = setInterval(() => {
                sc += 0.2;
                structure.scale.set(sc, sc, sc);
                if (sc >= 1) {
                    structure.scale.set(1, 1, 1);
                    clearInterval(ani);
                }
            }, 20);

            // Build Sound/VFX
            screenFlash('rgba(255,255,255,0.1)');
            SoundFX.build();
            try { saveGame(); } catch (_) {} // Phase 1: persist after major events
        }
    }

    function upgradeStructure(structure) {
        const currentTier = structure.userData.tier;
        const tierOrder = ['twig', 'wood', 'stone', 'metal', 'hqm'];
        const currentIndex = tierOrder.indexOf(currentTier);

        if (currentIndex >= tierOrder.length - 1) {
            return;
        }

        const nextTier = tierOrder[currentIndex + 1];
        const cost = BUILDING_TIERS[nextTier].cost;

        // Check resources
        let canAfford = true;
        for (let [res, amt] of Object.entries(cost)) {
            if (getItemCount(res) < amt) {
                canAfford = false;
                break;
            }
        }

        if (!canAfford) {
            return;
        }

        // Consume resources
        for (let [res, amt] of Object.entries(cost)) {
            const inv = state.inventory.find(i => i.id === res);
            if (inv) inv.count -= amt;
        }

        // Apply upgrade
        structure.userData.tier = nextTier;
        structure.userData.maxHealth = BUILDING_TIERS[nextTier].health;
        structure.userData.health = BUILDING_TIERS[nextTier].health;
        structure.material.color.setHex(BUILDING_TIERS[nextTier].color);

        updateHUD();
        SoundFX.upgrade();
    }

    function repairStructure(structure) {
        if (structure.userData.health >= structure.userData.maxHealth) {
            return;
        }

        const tier = structure.userData.tier;
        const cost = BUILDING_TIERS[tier].cost;
        const repairAmount = structure.userData.maxHealth * 0.1; // 10% per repair

        // Check resources (uses same cost as upgrade)
        if (tier !== 'twig') {
            let canAfford = true;
            for (let [res, amt] of Object.entries(cost)) {
                const needed = Math.ceil(amt * 0.1); // 10% of upgrade cost
                if (getItemCount(res) < needed) {
                    canAfford = false;
                    break;
                }
            }

            if (!canAfford) {
                return;
            }

            // Consume resources
            for (let [res, amt] of Object.entries(cost)) {
                const needed = Math.ceil(amt * 0.1);
                const inv = state.inventory.find(i => i.id === res);
                if (inv) inv.count -= needed;
            }
        }

        structure.userData.health = Math.min(structure.userData.maxHealth, structure.userData.health + repairAmount);
        updateHUD();
    }

    function updateBuildInfo(structure) {
        const panel = document.getElementById('build-info');
        if (!structure || (structure.userData.type !== 'structure' && structure.userData.type !== 'door')) {
            panel.style.display = 'none';
            return;
        }

        const tier = structure.userData.tier;
        const tierOrder = ['twig', 'wood', 'stone', 'metal', 'hqm'];
        const currentIndex = tierOrder.indexOf(tier);
        const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

        // Calculate simple stability based on height (Y)
        // Foundations (Y=0.1) have 100%, higher levels reduce stability
        const stability = Math.max(20, 100 - Math.floor((structure.position.y - 0.1) * 10));

        document.getElementById('build-tier').innerHTML = `<i class="fas fa-layer-group"></i> ${BUILDING_TIERS[tier].name} (${stability}%)`;
        document.getElementById('build-health').textContent = `${Math.round(structure.userData.health)}/${structure.userData.maxHealth}`;

        if (nextTier) {
            const cost = BUILDING_TIERS[nextTier].cost;
            const costStr = Object.entries(cost).map(([res, amt]) => `${res} (${amt})`).join(', ');
            document.getElementById('build-upgrade').innerHTML = `<i class="fas fa-arrow-up"></i> ${BUILDING_TIERS[nextTier].name}: ${costStr}`;
        } else {
            document.getElementById('build-upgrade').textContent = 'MAX TIER';
        }

        panel.style.display = 'block';
        state.building.lookingAtStructure = structure;
    }

    // Realistic Procedural Trees
    for (let i = 0; i < CONFIG.TREE_COUNT; i++) {
        const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 40);
        const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 40);
        const y = getTerrainHeight(x, z);

        const tree = new THREE.Group();
        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.4, 3, 8),
            new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 })
        );
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        tree.add(trunk);

        // Leaves in clusters
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
        for (let j = 0; j < 3; j++) {
            const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 - j * 0.2, 1), leafMat);
            cluster.position.y = 2.5 + j * 0.8;
            cluster.position.x = (Math.random() - 0.5) * 0.5;
            cluster.position.z = (Math.random() - 0.5) * 0.5;
            cluster.castShadow = true;
            tree.add(cluster);
        }

        tree.position.set(x, y, z);
        tree.userData = { type: 'tree', health: (getNodeDef('tree') || {}).health || 5, radius: 0.5 };
        scene.add(tree);
        interactables.push(tree);
        collisionObjects.push(tree);
    }

    // Realistic Rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 1.0 });
    const sulfurMat = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.9, emissive: 0x444400, emissiveIntensity: 0.1 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.4, roughness: 0.7 });

    for (let i = 0; i < CONFIG.ROCK_COUNT + CONFIG.SULFUR_COUNT; i++) {
        const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 40);
        const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 40);
        const isSulfur = i >= CONFIG.ROCK_COUNT;
        const isIron = !isSulfur && Math.random() > 0.7;

        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.2, 0),
            isSulfur ? sulfurMat : (isIron ? ironMat : rockMat)
        );
        const y = getTerrainHeight(x, z);
        rock.position.set(x, y + 0.3, z);
        const scale = 0.6 + Math.random();
        rock.scale.set(scale, scale * 0.8, scale);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.userData = { type: isSulfur ? 'sulfur' : (isIron ? 'iron' : 'rock'), health: (getNodeDef(isSulfur ? 'sulfur' : (isIron ? 'iron' : 'rock')) || {}).health || 6, radius: scale };
        scene.add(rock);
        interactables.push(rock);
        collisionObjects.push(rock);
    }

    // Industrial Barrels
    const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0277bd, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < CONFIG.BARREL_COUNT; i++) {
        const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 60);
        const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 60);
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(x, getTerrainHeight(x, z) + 0.6, z);
        barrel.castShadow = true;
        barrel.userData = { type: 'barrel', health: (getNodeDef('barrel') || {}).health || 3, radius: 0.5 };
        scene.add(barrel);
        interactables.push(barrel);
        collisionObjects.push(barrel);
    }

    // ==================== PHASE 1: SURVIVAL SYSTEMS & WORLD ====================
    CONFIG.HEMP_COUNT = CONFIG.HEMP_COUNT || 25;
    CONFIG.BERRY_COUNT = CONFIG.BERRY_COUNT || 20;

    const weather = new WeatherSystem();
    const interaction = new InteractionSystem();
    const inputSys = new InputSystem();
    try { inputSys.addProvider(gamepadProvider(0)); } catch (_) {}
    const storageBoxes = [];  // { id, mesh, inv: StorageInventory, pos }
    const campfires = [];     // { mesh, light, pos }
    const waterBodies = [];   // { mesh, source: {type, level}, pos, radius }
    let storageSeq = 0;
    let currentInteractTarget = null; // set by the E prompter
    let sprintActive = false;

    function surfaceY(x, z, lift = 0) {
        return getTerrainHeight(x, z) + lift;
    }

    // ---- Hemp (cloth) & Berry bushes (food) ----
    const hempMat = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 1.0 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0 });
    for (let i = 0; i < CONFIG.HEMP_COUNT; i++) {
        const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 60);
        const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 60);
        const hemp = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 6), stemMat);
        stem.position.y = 0.6; hemp.add(stem);
        const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), hempMat);
        top.position.y = 1.3; top.castShadow = true; hemp.add(top);
        hemp.position.set(x, surfaceY(x, z), z);
        hemp.userData = { type: 'hemp', health: (getNodeDef('hemp') || {}).health || 2, radius: 0.5 };
        scene.add(hemp); interactables.push(hemp); collisionObjects.push(hemp);
    }
    const berryLeafMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 1.0 });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xd81b60, roughness: 0.6 });
    for (let i = 0; i < CONFIG.BERRY_COUNT; i++) {
        const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 60);
        const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - 60);
        const bush = new THREE.Group();
        const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), berryLeafMat);
        leaves.position.y = 0.5; leaves.castShadow = true; bush.add(leaves);
        for (let b = 0; b < 4; b++) {
            const berry = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), berryMat);
            const a = (b / 4) * Math.PI * 2;
            berry.position.set(Math.cos(a) * 0.55, 0.5 + (Math.random() - 0.5) * 0.4, Math.sin(a) * 0.55);
            bush.add(berry);
        }
        bush.position.set(x, surfaceY(x, z), z);
        bush.userData = { type: 'berry_bush', health: (getNodeDef('berry_bush') || {}).health || 2, radius: 0.6 };
        scene.add(bush); interactables.push(bush); collisionObjects.push(bush);
    }

    // ---- Lake (infinite) + camp water container (finite) ----
    function spawnWaterBody(kind, x, z, radius) {
        const def = WATER_SOURCES[kind] || WATER_SOURCES.lake;
        let mesh;
        if (kind === 'lake') {
            mesh = new THREE.Mesh(
                new THREE.CircleGeometry(radius, 28),
                new THREE.MeshStandardMaterial({ color: 0x0288d1, transparent: true, opacity: 0.8, roughness: 0.2 })
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, surfaceY(x, z, 0.15), z);
        } else {
            mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6, 0.6, 1.1, 14),
                new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.5, roughness: 0.5 })
            );
            mesh.position.set(x, surfaceY(x, z, 0.55), z);
            mesh.castShadow = true;
        }
        const entry = { mesh, source: { type: kind, level: def.capacity || 0 }, pos: { x, z }, radius, kind };
        mesh.userData = { type: 'water', sourceKind: kind, radius };
        scene.add(mesh);
        if (kind !== 'lake') collisionObjects.push(mesh);
        waterBodies.push(entry);
        return entry;
    }
    spawnWaterBody('lake', 70, 60, 7);
    spawnWaterBody('container', 4, 3, 3);

    // ---- Storage boxes ----
    const boxWoodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });
    const boxDarkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    function spawnStorageBox(x, z, savedInv) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), boxWoodMat);
        body.position.y = 0.4; body.castShadow = true; g.add(body);
        const lid = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.12, 0.84), boxDarkMat);
        lid.position.y = 0.86; g.add(lid);
        const y = surfaceY(x, z);
        g.position.set(x, y, z);
        const id = 'box_' + (++storageSeq);
        g.userData = { type: 'storage', boxId: id, radius: 0.9 };
        const entry = { id, mesh: g, inv: StorageInventory.fromJSON(savedInv || [], ITEMS_DATA), pos: { x, y, z } };
        scene.add(g); interactables.push(g); collisionObjects.push(g);
        storageBoxes.push(entry);
        return entry;
    }
    spawnStorageBox(-4, 3, null); // camp box

    // ---- Campfires (warmth + cooking) ----
    const stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 1 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 1 });
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff6d00, emissiveIntensity: 2 });
    function placeCampfire(x, z) {
        const g = new THREE.Group();
        for (let s = 0; s < 6; s++) {
            const a = (s / 6) * Math.PI * 2;
            const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat2);
            stone.position.set(Math.cos(a) * 0.8, 0.15, Math.sin(a) * 0.8);
            g.add(stone);
        }
        for (let l = 0; l < 2; l++) {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), logMat);
            log.rotation.z = Math.PI / 2; log.rotation.y = l * Math.PI / 2;
            log.position.y = 0.2; g.add(log);
        }
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), flameMat);
        flame.position.y = 0.6; flame.name = 'flame'; g.add(flame);
        const light = new THREE.PointLight(0xff8c3a, 12, 14, 1.6);
        light.position.y = 1.0; g.add(light);
        g.position.set(x, surfaceY(x, z), z);
        g.userData = { type: 'campfire', radius: 1.0 };
        scene.add(g); interactables.push(g); collisionObjects.push(g);
        campfires.push({ mesh: g, light, pos: { x, z } });
        return g;
    }

    function nearestCampfireDist(x, z) {
        let best = Infinity;
        for (const c of campfires) {
            const d = Math.sqrt((x - c.pos.x) ** 2 + (z - c.pos.z) ** 2);
            if (d < best) best = d;
        }
        return best;
    }

    // ==================== PHASE 1: UNIFIED INTERACTION (E) ====================
    function findBoxById(boxId) {
        return storageBoxes.find(b => b.id === boxId) || null;
    }
    function findWaterByMesh(mesh) {
        return waterBodies.find(w => w.mesh === mesh) || null;
    }

    interaction.register(InteractKinds.STORAGE, {
        priority: 30,
        canInteract: (c) => !!(c && c.kind === 'storage' && c.root && findBoxById(c.root.userData.boxId)),
        label: () => 'E — Open storage box',
        act: (c) => { openStoragePanel(c.root.userData.boxId); return true; },
    });
    interaction.register(InteractKinds.DRINK, {
        priority: 25,
        canInteract: (c) => !!(c && c.kind === 'drink' && c.root && findWaterByMesh(c.root)),
        label: (c) => {
            const w = findWaterByMesh(c.root);
            const name = (w && w.kind === 'container') ? 'Water container' : 'Lake';
            return `E — Drink (${name})`;
        },
        act: (c) => {
            const w = findWaterByMesh(c.root);
            if (!w) return false;
            const r = drinkFromSource(state.stats, w.source, SURVIVAL_CONFIG.maxThirst);
            if (r.empty) { showNotification('Container is empty', '#e74c3c'); return true; }
            showNotification(`Drank water (+${Math.round(r.drank)} thirst)`, '#4fc3f7');
            SoundFX.ui_click();
            updateHUD();
            return true;
        },
    });
    interaction.register(InteractKinds.LOOT, {
        priority: 20,
        canInteract: (c) => !!(c && c.kind === 'loot' && c.root),
        label: () => 'E — Loot crate',
        act: (c) => {
            const root = c.root;
            const gained = [];
            const scrap = 4 + Math.floor(Math.random() * 5);
            addItem('scrap', scrap); gained.push(`${scrap} scrap`);
            if (Math.random() < 0.45) { addItem('canned_food', 1); gained.push('canned food'); }
            if (Math.random() < 0.3) { addItem('cloth', 3); gained.push('3 cloth'); }
            if (Math.random() < 0.15) { addItem('water', 1); gained.push('water'); }
            showNotification(`Looted: ${gained.join(', ')}`, '#f39c12');
            SoundFX.harvest();
            scene.remove(root);
            for (const arr of [interactables, collisionObjects]) {
                const i = arr.indexOf(root);
                if (i !== -1) arr.splice(i, 1);
            }
            scheduleRespawn(root, root.position, 'crate', null, 200);
            updateHUD();
            return true;
        },
    });
    interaction.register(InteractKinds.DOOR, {
        priority: 15,
        canInteract: (c) => !!(c && c.kind === 'door' && c.root),
        label: (c) => (c.root.userData.isOpen ? 'E — Close door' : 'E — Open door'),
        act: (c) => {
            const root = c.root;
            root.userData.isOpen = !root.userData.isOpen;
            root.rotation.y = root.userData.isOpen ? Math.PI / 2 : 0;
            SoundFX.door();
            return true;
        },
    });
    interaction.register(InteractKinds.USE, {
        priority: 12,
        canInteract: (c) => !!(c && (c.kind === 'cook' || c.kind === 'place-box' || c.kind === 'place-campfire')),
        label: (c) => {
            if (c.kind === 'cook') return getItemCount('raw_meat') > 0 ? 'E — Cook raw meat' : 'Campfire (need raw meat)';
            if (c.kind === 'place-box') return 'E — Place storage box';
            return 'E — Place campfire';
        },
        act: (c) => {
            if (c.kind === 'cook') {
                if (!consumeItem('raw_meat', 1)) { showNotification('Need raw meat', '#e74c3c'); return true; }
                addItem('cooked_meat', 1);
                state.stats.temperature = Math.min(100, state.stats.temperature + 5);
                showNotification('Cooked meat (+5 warmth)', '#ff9800');
                SoundFX.build();
                updateHUD();
                return true;
            }
            if (c.kind === 'place-box') {
                if (!consumeItem('wooden_box', 1)) return true;
                spawnStorageBox(c.point.x, c.point.z, null);
                showNotification('Storage box placed', '#2ecc71');
                SoundFX.build();
                updateHUD();
                return true;
            }
            if (c.kind === 'place-campfire') {
                if (!consumeItem('campfire', 1)) return true;
                placeCampfire(c.point.x, c.point.z);
                showNotification('Campfire placed', '#ff9800');
                SoundFX.build();
                updateHUD();
                return true;
            }
            return false;
        },
    });

    function doInteract(target) {
        try {
            interaction.interact(target);
        } catch (err) {
            console.error('[interact]', err);
        }
    }

    // E key: capture phase so contextual interaction wins over inventory toggle.
    window.addEventListener('keydown', (e) => {
        if (e.code !== 'KeyE' || e.repeat) return;
        const ae = document.activeElement;
        if (ae && ae.tagName === 'INPUT') return;
        if (storagePanelOpen) {
            closeStoragePanel();
            e.preventDefault(); e.stopPropagation();
            return;
        }
        if (currentInteractTarget) {
            e.preventDefault(); e.stopPropagation();
            doInteract(currentInteractTarget);
        }
    }, true);

    const _promptRay = new THREE.Raycaster();
    function refreshInteractPrompt() {
        currentInteractTarget = null;
        if (state.dead) { setPrompt(null); return; }
        if (typeof pointerControls !== 'undefined' && !pointerControls.isLocked && isTouchDevice === false) {
            // Only prompt while playing (pointer locked) on desktop.
            if (document.getElementById('inventory').style.display === 'flex') { setPrompt(null); return; }
        }
        _promptRay.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = _promptRay.intersectObjects([...interactables, ...builtStructures], true);
        if (hits.length > 0 && hits[0].distance < CONFIG.INTERACT_DISTANCE) {
            let root = hits[0].object;
            while (root.parent && root.parent !== scene) root = root.parent;
            const ud = root.userData || {};
            let kind = null;
            if (ud.type === 'storage') kind = 'storage';
            else if (ud.type === 'water') kind = 'drink';
            else if (ud.type === 'crate') kind = 'loot';
            else if (ud.type === 'door') kind = 'door';
            else if (ud.type === 'campfire') {
                const d = Math.sqrt((camera.position.x - root.position.x) ** 2 + (camera.position.z - root.position.z) ** 2);
                if (d < 3.5) kind = 'cook';
            }
            if (kind) {
                const target = { kind, root };
                const found = interaction.getInteractable(target);
                if (found) {
                    currentInteractTarget = target;
                    setPrompt(found.label);
                    return;
                }
            }
        }
        // Ground placement: storage box / campfire from inventory.
        const gHits = _promptRay.intersectObject(ground);
        if (gHits.length > 0 && gHits[0].distance < 4) {
            if (getItemCount('wooden_box') > 0) {
                currentInteractTarget = { kind: 'place-box', point: gHits[0].point };
                setPrompt('E — Place storage box');
                return;
            }
            if (getItemCount('campfire') > 0) {
                currentInteractTarget = { kind: 'place-campfire', point: gHits[0].point };
                setPrompt('E — Place campfire');
                return;
            }
        }
        setPrompt(null);
    }
    setInterval(refreshInteractPrompt, 150); // throttled: no per-frame DOM/raycast cost

    // ==================== PHASE 1: STORAGE PANEL ====================
    let storagePanel = null;
    let storagePanelOpen = false;
    let openBoxId = null;

    function buildStoragePanel() {
        if (storagePanel) return storagePanel;
        const p = document.createElement('div');
        p.id = 'storage-panel';
        p.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(560px,92vw);background:rgba(12,14,18,0.96);border:1px solid #444;border-radius:10px;z-index:1500;display:none;color:#eee;font-family:inherit;';
        p.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #333;">
                <b>📦 Storage Box</b><span style="font-size:0.75rem;opacity:0.6;">click: move 10 · right-click: move all · [E] close</span>
                <button id="storage-close" style="background:#c0392b;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">✕</button>
            </div>
            <div style="display:flex;gap:10px;padding:12px 14px;">
                <div style="flex:1;"><div style="opacity:0.7;font-size:0.8rem;margin-bottom:6px;">🎒 YOU</div><div id="storage-player-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;min-height:120px;"></div></div>
                <div style="flex:1;"><div style="opacity:0.7;font-size:0.8rem;margin-bottom:6px;">📦 BOX</div><div id="storage-box-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;min-height:120px;"></div></div>
            </div>`;
        document.body.appendChild(p);
        p.querySelector('#storage-close').onclick = () => closeStoragePanel();
        storagePanel = p;
        return p;
    }

    function storageSlotEl(itemId, count, tip) {
        const d = document.createElement('div');
        const def = ITEMS_DATA[itemId] || { icon: 'fa-cube', color: '#fff', name: itemId };
        d.style.cssText = 'position:relative;background:#1c2128;border:1px solid #3a434e;border-radius:6px;padding:10px 4px;text-align:center;cursor:pointer;';
        d.innerHTML = `<i class="fas ${def.icon}" style="color:${def.color};font-size:1.2rem;"></i><span style="position:absolute;bottom:2px;right:4px;font-size:0.65rem;font-weight:900;">${count}</span>`;
        d.title = `${def.name || itemId} — ${tip}`;
        return d;
    }

    function renderStoragePanel() {
        const box = findBoxById(openBoxId);
        if (!box) { closeStoragePanel(); return; }
        buildStoragePanel();
        const pg = storagePanel.querySelector('#storage-player-grid');
        const bg = storagePanel.querySelector('#storage-box-grid');
        pg.innerHTML = ''; bg.innerHTML = '';
        for (const it of state.inventory) {
            if (it.count <= 0) continue;
            const el = storageSlotEl(it.id, it.count, 'to box');
            el.onclick = () => depositToBox(box, it.id, 10);
            el.oncontextmenu = (e) => { e.preventDefault(); depositToBox(box, it.id, Infinity); };
            pg.appendChild(el);
        }
        if (!state.inventory.length) pg.innerHTML = '<span style="opacity:0.4;font-size:0.8rem;">empty</span>';
        for (const it of box.inv.items) {
            const el = storageSlotEl(it.id, it.count, 'to you');
            el.onclick = () => withdrawFromBox(box, it.id, 10);
            el.oncontextmenu = (e) => { e.preventDefault(); withdrawFromBox(box, it.id, Infinity); };
            bg.appendChild(el);
        }
        if (!box.inv.items.length) bg.innerHTML = '<span style="opacity:0.4;font-size:0.8rem;">empty</span>';
    }

    function depositToBox(box, id, amount) {
        if (!box) return;
        const have = getItemCount(id);
        if (have <= 0) return;
        if (box.inv.count(id) <= 0 && box.inv.items.length >= 12) {
            showNotification('Box is full (12 stacks)', '#e74c3c');
            return;
        }
        const want = (amount === Infinity) ? have : Math.min(have, amount);
        const added = box.inv.add(id, want);
        if (added > 0) {
            removeItem(id, added);
            SoundFX.ui_click();
            renderStoragePanel();
            updateHUD();
        }
    }

    function withdrawFromBox(box, id, amount) {
        if (!box) return;
        const have = box.inv.count(id);
        if (have <= 0) return;
        const want = (amount === Infinity) ? have : Math.min(have, amount);
        const removed = box.inv.remove(id, want);
        if (removed > 0) {
            addItem(id, removed);
            SoundFX.ui_click();
            renderStoragePanel();
            updateHUD();
        }
    }

    function openStoragePanel(boxId) {
        const box = findBoxById(boxId);
        if (!box) return;
        openBoxId = boxId;
        buildStoragePanel();
        renderStoragePanel();
        storagePanel.style.display = 'block';
        storagePanelOpen = true;
        try { pointerControls.unlock(); } catch (_) {}
    }

    function closeStoragePanel() {
        openBoxId = null;
        storagePanelOpen = false;
        if (storagePanel) storagePanel.style.display = 'none';
        try {
            const inv = document.getElementById('inventory');
            if (!isTouchDevice && (!inv || inv.style.display !== 'flex')) pointerControls.lock();
        } catch (_) {}
    }

    // Monuments & Rad Zones
    createMonument(scene, 40, -40);
    createMonument(scene, -60, 50);

    // Spawn NPCs
    for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
        const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
        const type = Math.random() > 0.3 ? 'wolf' : 'bear';
        const npc = new NPC(scene, type, new THREE.Vector3(x, getTerrainHeight(x, z), z), { collisionObjects, npcs });
        npcs.push(npc);
        collisionObjects.push(npc.mesh);
    }

    const builtObjects = [];

    // Respawn system
    const respawnQueue = [];
    const RESPAWN_DELAY = 30000; // 30 seconds

    function scheduleRespawn(obj, pos, type, worldData, delaySec) {
        // Phase 1: per-node respawn time from config, persisted for save/load.
        const def = (typeof getNodeDef === 'function') ? getNodeDef(type) : null;
        const delay = (typeof delaySec === 'number' && delaySec > 0) ? delaySec
            : (def && def.respawnTime) || 30;
        const data = { pos: { x: pos.x, y: pos.y, z: pos.z }, type, worldData, time: Date.now(), delay: delay * 1000 };
        respawnQueue.push(data);
    }

    function processRespawns() {
        const now = Date.now();
        for (let i = respawnQueue.length - 1; i >= 0; i--) {
            const r = respawnQueue[i];
            if (now - r.time >= (r.delay || RESPAWN_DELAY)) {
                respawnObject(r);
                respawnQueue.splice(i, 1);
            }
        }
    }

    function respawnObject(data) {
        const { pos, type } = data;
        let obj;
        const y = getTerrainHeight(pos.x, pos.z);

        switch (type) {
            case 'tree': {
                const tree = new THREE.Group();
                const trunk = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.4, 3, 8),
                    new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 })
                );
                trunk.position.y = 1.5; trunk.castShadow = true; tree.add(trunk);
                const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
                for (let j = 0; j < 3; j++) {
                    const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 - j * 0.2, 1), leafMat);
                    cluster.position.y = 2.5 + j * 0.8;
                    cluster.position.x = (Math.random() - 0.5) * 0.5;
                    cluster.position.z = (Math.random() - 0.5) * 0.5;
                    cluster.castShadow = true; tree.add(cluster);
                }
                tree.position.set(pos.x, y, pos.z);
                tree.userData = { type: 'tree', health: (getNodeDef('tree') || {}).health || 5, radius: 0.5 };
                obj = tree;
                break;
            }
            case 'rock': {
                const rockMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 1.0 });
                obj = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), rockMat);
                obj.position.set(pos.x, y + 0.3, pos.z);
                const scale = 0.6 + Math.random();
                obj.scale.set(scale, scale * 0.8, scale);
                obj.rotation.set(Math.random(), Math.random(), Math.random());
                obj.castShadow = true;
                obj.userData = { type: 'rock', health: (getNodeDef('rock') || {}).health || 6, radius: scale };
                break;
            }
            case 'iron': {
                const ironMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.4, roughness: 0.7 });
                obj = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), ironMat);
                obj.position.set(pos.x, y + 0.3, pos.z);
                const s = 0.6 + Math.random();
                obj.scale.set(s, s * 0.8, s);
                obj.rotation.set(Math.random(), Math.random(), Math.random());
                obj.castShadow = true;
                obj.userData = { type: 'iron', health: (getNodeDef('iron') || {}).health || 6, radius: s };
                break;
            }
            case 'sulfur': {
                const sulfurMat = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.9, emissive: 0x444400, emissiveIntensity: 0.1 });
                obj = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), sulfurMat);
                obj.position.set(pos.x, y + 0.3, pos.z);
                const s2 = 0.6 + Math.random();
                obj.scale.set(s2, s2 * 0.8, s2);
                obj.rotation.set(Math.random(), Math.random(), Math.random());
                obj.castShadow = true;
                obj.userData = { type: 'sulfur', health: (getNodeDef('sulfur') || {}).health || 6, radius: s2 };
                break;
            }
            case 'barrel': {
                const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0277bd, metalness: 0.6, roughness: 0.4 });
                obj = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), barrelMat);
                obj.position.set(pos.x, y + 0.6, pos.z);
                obj.castShadow = true;
                obj.userData = { type: 'barrel', health: (getNodeDef('barrel') || {}).health || 3, radius: 0.5 };
                break;
            }
            case 'hemp': {
                const hg = new THREE.Group();
                const hstem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 6), stemMat);
                hstem.position.y = 0.6; hg.add(hstem);
                const htop = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), hempMat);
                htop.position.y = 1.3; htop.castShadow = true; hg.add(htop);
                hg.position.set(pos.x, y, pos.z);
                hg.userData = { type: 'hemp', health: (getNodeDef('hemp') || {}).health || 2, radius: 0.5 };
                obj = hg;
                break;
            }
            case 'berry_bush': {
                const bg = new THREE.Group();
                const bleaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), berryLeafMat);
                bleaves.position.y = 0.5; bleaves.castShadow = true; bg.add(bleaves);
                for (let b = 0; b < 4; b++) {
                    const bb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), berryMat);
                    const ba = (b / 4) * Math.PI * 2;
                    bb.position.set(Math.cos(ba) * 0.55, 0.5, Math.sin(ba) * 0.55);
                    bg.add(bb);
                }
                bg.position.set(pos.x, y, pos.z);
                bg.userData = { type: 'berry_bush', health: (getNodeDef('berry_bush') || {}).health || 2, radius: 0.6 };
                obj = bg;
                break;
            }
            case 'crate': {
                const cmat = new THREE.MeshStandardMaterial({ color: 0xffa000, roughness: 0.7 });
                obj = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), cmat);
                obj.position.set(pos.x, y + 0.5, pos.z);
                obj.castShadow = true;
                obj.userData = { type: 'crate', health: 999, radius: 0.8 };
                break;
            }
        }

        if (obj) {
            scene.add(obj);
            interactables.push(obj);
            collisionObjects.push(obj);
        }
    }

    // Animation & Logic Functions
    let ghostMesh = null;

    function updateGhost() {
        const activeTool = state.belt[state.selectedBeltSlot || 0];

        // Only show ghost if Building Plan is active
        if (activeTool !== 'building_plan' || !state.building.selectedBlueprint) {
            if (ghostMesh) ghostMesh.visible = false;
            return;
        }

        const blueprint = state.building.selectedBlueprint;
        const buildData = BUILDING_TYPES[blueprint];

        // Create or recreate ghost if blueprint type changed
        if (!ghostMesh || ghostMesh.userData.blueprintType !== blueprint) {
            if (ghostMesh) {
                scene.remove(ghostMesh);
                ghostMesh.geometry.dispose();
                ghostMesh.material.dispose();
            }
            const geometry = new THREE.BoxGeometry(...buildData.geometry);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.4,
                wireframe: false
            });
            ghostMesh = new THREE.Mesh(geometry, material);
            ghostMesh.userData.blueprintType = blueprint;
            scene.add(ghostMesh);
        }

        const r = new THREE.Raycaster();
        r.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hit = r.intersectObjects([ground, ...builtStructures]);

        if (hit.length > 0 && hit[0].distance < 10) {
            const p = hit[0].point;

            // Snap to grid
            const snapX = Math.round(p.x / 3) * 3;
            const snapY = buildData.offset[1];
            const snapZ = Math.round(p.z / 3) * 3;

            let targetY = snapY;
            if (hit[0].object.userData.type === 'structure') {
                if (blueprint === 'ceiling') targetY = hit[0].object.position.y + 3;
                if (blueprint === 'wall' || blueprint === 'doorway') targetY = hit[0].object.position.y;
            }

            ghostMesh.position.set(snapX, targetY, snapZ);
            ghostMesh.rotation.y = state.building.rotationY;
            ghostMesh.visible = true;

            const canBuild = canBuildHere({ x: snapX, z: snapZ }, blueprint);
            ghostMesh.material.color.setHex(canBuild ? 0x00ff00 : 0xff0000);
        } else {
            if (ghostMesh) ghostMesh.visible = false;
        }
    }

    function checkCollisions(newPos) {
        for (let obj of [...collisionObjects, ...builtObjects]) {
            const dx = newPos.x - obj.position.x;
            const dz = newPos.z - obj.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const minDistance = CONFIG.PLAYER_RADIUS + (obj.userData.radius || 0.5);
            if (distance < minDistance) {
                const angle = Math.atan2(dz, dx);
                newPos.x = obj.position.x + Math.cos(angle) * minDistance;
                newPos.z = obj.position.z + Math.sin(angle) * minDistance;
                return true;
            }
        }
        return false;
    }

    const raycaster = new THREE.Raycaster();
    function performAction() {
        // Rust Tools Logic
        const activeToolId = state.belt[state.selectedBeltSlot || 0];

        // 1. Building Plan (Paper)
        if (activeToolId === 'building_plan') {
            if (state.building.selectedBlueprint) {
                placeStructure();
            } else {
                showNotification("Right Click to select piece", "#ffa000");
            }
            return;
        }

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const npcMeshes = npcs.filter(n => !n.dead).map(n => n.mesh);
        const hits = raycaster.intersectObjects([...interactables, ...builtStructures, ...npcMeshes], true);

        if (hits.length > 0 && hits[0].distance < CONFIG.INTERACT_DISTANCE) {
            let obj = hits[0].object;
            while (obj.parent && obj.parent !== scene) obj = obj.parent;

            // Door Logic
            if (obj.userData.type === 'door') {
                obj.userData.isOpen = !obj.userData.isOpen;
                obj.rotation.y = obj.userData.isOpen ? Math.PI / 2 : 0;
                showHitMarker();
                SoundFX.door();
                return;
            }

            // Hammer Upgrade (H is fallback, but LMB also works if tool is active)
            if (activeToolId === 'hammer' && obj.userData.tier) {
                if (obj.userData.health < obj.userData.maxHealth) {
                    repairStructure(obj);
                } else {
                    upgradeStructure(obj);
                }
                showHitMarker();
                return;
            }

            // NPC Damage
            const hitNpc = obj.userData.npc || (obj.parent && obj.parent.userData && obj.parent.userData.npc);
            if (hitNpc && !hitNpc.dead) {
                hitNpc.takeDamage(15);
                showHitMarker();
                screenFlash('rgba(255,0,0,0.1)');
                SoundFX.hit();
                return;
            }

            if (!obj.userData.type) return;

            // Combat / Gathering
            showHitMarker();
            screenFlash('rgba(255,255,255,0.05)');
            SoundFX.harvest();

            camera.position.x += (Math.random() - 0.5) * 0.05;
            camera.position.z += (Math.random() - 0.5) * 0.05;

            obj.userData.health -= 1;
            obj.position.y += 0.05; setTimeout(() => obj.position.y -= 0.05, 50);

            const type = obj.userData.type;
            // Phase 1: config-driven yields + tool bonus + stamina cost.
            const ndef = (typeof getNodeDef === 'function') ? getNodeDef(type) : null;
            if (ndef) {
                const tool = state.belt[state.selectedBeltSlot || 0];
                const yields = yieldForHit(ndef, tool);
                for (const [rid, rcount] of Object.entries(yields)) addItem(rid, rcount);
                StaminaSystem.drainGather(state.stats);
            } else if (type === 'crate') {
                showNotification('Press E to loot the crate', '#f39c12');
            }

            if (obj.userData.health <= 0) {
                const pos = obj.position.clone();
                const objType = obj.userData.type;
                // Determine actual type for respawn
                let worldType = objType;
                if (objType === 'tree' || objType === 'rock' || objType === 'iron' || objType === 'sulfur' || objType === 'barrel') {
                    scheduleRespawn(obj, pos, worldType, null);
                }
                scene.remove(obj);
                if (interactables.includes(obj)) interactables.splice(interactables.indexOf(obj), 1);
                if (builtStructures.includes(obj)) builtStructures.splice(builtStructures.indexOf(obj), 1);
                if (collisionObjects.includes(obj)) collisionObjects.splice(collisionObjects.indexOf(obj), 1);
            }
            updateHUD();
        }
    }

    // UI Logic
    function renderCraftingGrid() {
        const grid = document.getElementById('crafting-item-grid');
        const searchTerm = document.getElementById('item-search')?.value.toLowerCase() || "";
        if (!grid) return;
        grid.innerHTML = '';
        Object.keys(ITEMS_DATA).forEach(id => {
            const item = ITEMS_DATA[id];
            if (!item.recipe) return;
            const matchCat = state.selectedCategory === 'common' || item.category === state.selectedCategory;
            const matchSearch = item.name.toLowerCase().includes(searchTerm);
            if (matchCat && matchSearch) {
                const slot = document.createElement('div');
                slot.className = `craft-slot rarity-${item.rarity || 'common'}${state.selectedItem === id ? ' active' : ''}`;
                slot.innerHTML = `<i class="fas ${item.icon}" style="color:${item.color}"></i><span class="item-name-label">${item.name}</span>`;
                slot.onclick = () => { state.selectedItem = id; state.craftQty = 1; renderCraftingGrid(); showCraftingDetail(id); };
                grid.appendChild(slot);
            }
        });
    }

    function showCraftingDetail(id) {
        const panel = document.getElementById('crafting-detail-panel');
        const item = ITEMS_DATA[id];
        if (!panel || !item) return;
        let costHTML = ''; let canCraft = true;
        Object.entries(item.recipe).forEach(([res, amt]) => {
            const needed = amt * state.craftQty; const have = getItemCount(res); const missing = have < needed;
            if (missing) canCraft = false;
            costHTML += `<div class="cost-item ${missing ? 'missing' : ''}"><span>${needed}</span><span>${ITEMS_DATA[res]?.name || res}</span><span>${needed}</span><span>${have}</span></div>`;
        });
        panel.innerHTML = `
            <div class="detail-header"><div class="detail-title">${item.name}</div><div class="detail-subtitle">WORKBENCH REQUIRED</div></div>
            <div class="detail-desc">${item.desc}</div>
            <div class="cost-list"><div class="cost-header"><span>AMT</span><span>ITEM</span><span>TOTAL</span><span>HAVE</span></div>${costHTML}</div>
            <div class="action-row">
                <div class="qty-control"><div class="qty-btn" onclick="updateCraftQty(-1)">-</div><div class="qty-val">${state.craftQty}</div><div class="qty-btn" onclick="updateCraftQty(1)">+</div></div>
                <button class="craft-btn" ${canCraft ? '' : 'disabled'} onclick="performCraft('${id}')">CRAFT</button>
            </div>`;
    }

    function initInventoryTabs() {
        const tabs = document.querySelectorAll('.tab-item');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.tab;
                const cPane = document.getElementById('crafting-pane');
                const iPane = document.getElementById('inventory-pane');
                if (cPane) cPane.classList.toggle('active', target === 'crafting');
                if (iPane) iPane.classList.toggle('active', target === 'inventory');
                if (target === 'inventory') renderInventoryGrid();
                else renderCraftingGrid();
                initPlayerPreview();
            };
        });

        const cats = document.querySelectorAll('.category-item');
        cats.forEach(c => {
            c.onclick = () => {
                cats.forEach(k => k.classList.remove('active'));
                c.classList.add('active');
                state.selectedCategory = c.dataset.category;
                renderCraftingGrid();
            };
        });

        const search = document.getElementById('item-search');
        if (search) search.oninput = () => renderCraftingGrid();
    }

    function renderInventoryGrid() {
        const grid = document.getElementById('player-inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-grid-slot';
            const item = state.inventory[i];
            if (item && item.count > 0) {
                const data = ITEMS_DATA[item.id];
                if (data) {
                    slot.classList.add(`rarity-${data.rarity || 'common'}`);
                    slot.innerHTML = `<i class="fas ${data.icon}" style="color:${data.color}; font-size: 1.2rem;"></i><span style="position:absolute;bottom:2px;right:4px;font-size:0.65rem;font-weight:900;color:#fff;">${item.count}</span>`;
                    slot.title = `Click to equip to belt slot ${state.selectedBeltSlot + 1}`;
                    // Highlight if already in belt
                    if (state.belt.includes(item.id)) {
                        slot.style.borderColor = 'var(--primary)';
                        slot.style.background = 'rgba(205,92,44,0.15)';
                    }
                    slot.onclick = () => {
                        state.belt[state.selectedBeltSlot] = item.id;
                        renderBelt();
                        updateHotbarUI();
                        renderInventoryGrid();
                    };
                    // Phase 1: double-click food/medical items to use them.
                    if (data.category === 'food' || data.category === 'medical') {
                        slot.title = `${data.name} — double-click to use`;
                        slot.ondblclick = () => {
                            useConsumable(item.id);
                            renderInventoryGrid();
                            renderBelt();
                        };
                    }
                }
            }
            grid.appendChild(slot);
        }
    }

    window.updateCraftQty = (val) => { state.craftQty = Math.max(1, state.craftQty + val); if (state.selectedItem) showCraftingDetail(state.selectedItem); };
    window.performCraft = (id) => {
        // Phase 1 (§28): validate BEFORE deducting — inventory can never go negative.
        const item = ITEMS_DATA[id];
        if (!item || !item.recipe) return;
        const qty = Math.max(1, state.craftQty || 1);
        const missing = [];
        for (const [res, amt] of Object.entries(item.recipe)) {
            const needed = amt * qty;
            if (getItemCount(res) < needed) missing.push(`${needed - getItemCount(res)}× ${ITEMS_DATA[res]?.name || res}`);
        }
        if (missing.length > 0) {
            showNotification(`Missing: ${missing.join(', ')}`, '#e74c3c');
            return;
        }
        for (const [res, amt] of Object.entries(item.recipe)) {
            removeItem(res, amt * qty);
        }
        addItem(id, qty);
        showNotification(`Crafted: ${item.name}`, '#2ecc71');
        SoundFX.build();
        updateHUD(); showCraftingDetail(id);
    };

    function renderBelt() {
        const beltGrid = document.getElementById('belt-inventory-grid');
        if (!beltGrid) return;
        beltGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = `inv-slot ${state.selectedBeltSlot === i ? 'active' : ''}`;
            const itemId = state.belt[i];

            if (itemId) {
                const item = ITEMS_DATA[itemId];
                slot.innerHTML = `<i class="fas ${item.icon}" style="color:${item.color}"></i>`;
                slot.title = 'Right-click to unequip';
            } else {
                // Default placeholders
                if (i === 0) slot.innerHTML = `<i class="fas fa-hand-fist" style="opacity:0.2"></i>`;
                if (i === 1) slot.innerHTML = `<i class="fas fa-axe" style="opacity:0.2"></i>`;
                slot.title = 'Click inventory item to equip';
            }

            slot.onclick = () => {
                state.selectedBeltSlot = i;
                renderBelt();
                updateHotbarUI();
            };
            slot.oncontextmenu = (e) => {
                e.preventDefault();
                state.belt[i] = null;
                renderBelt();
                updateHotbarUI();
            };
            beltGrid.appendChild(slot);
        }
    }

    function updateHotbarUI() {
        const defaultIcons = ['fa-hand-fist', 'fa-axe', 'fa-hammer', 'fa-shield', 'fa-pizza-slice', 'fa-bottle-water'];
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((s, idx) => {
            s.classList.toggle('active', state.selectedBeltSlot === idx);
            const itemId = state.belt[idx];
            if (itemId) {
                const item = ITEMS_DATA[itemId];
                s.innerHTML = `<i class="fas ${item.icon}"></i>`;
            } else {
                const icon = defaultIcons[idx] || 'fa-circle';
                s.innerHTML = `<i class="fas ${icon}" style="opacity:0.2"></i>`;
            }
        });
    }


    // ==================== KEYBOARD/MOUSE OVERRIDES ====================
    // These handle specific game logic not covered by the generic GameControls layer
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT') return;

        // Hotbar Slots (1-6)
        if (e.code.startsWith('Digit')) {
            const slot = parseInt(e.code.replace('Digit', '')) - 1;
            if (slot >= 0 && slot < 6) {
                state.selectedBeltSlot = slot;
                updateHotbarUI();
            }
        }

        // Hammer Actions (Upgrade/Repair)
        if (e.code === 'KeyH') {
            const activeTool = state.belt[state.selectedBeltSlot || 0];
            if (activeTool !== 'hammer') {
                showNotification("Requires Hammer", "#e74c3c");
                return;
            }
            if (state.building.lookingAtStructure) {
                const s = state.building.lookingAtStructure;
                if (s.userData.health < s.userData.maxHealth) repairStructure(s);
                else upgradeStructure(s);
            }
        }

        // Rotate blueprint (R key)
        if (e.code === 'KeyR' && state.building.selectedBlueprint) {
            state.building.rotationY = (state.building.rotationY + Math.PI / 2) % (Math.PI * 2);
            showNotification(`Rotated ${Math.round(state.building.rotationY * 180 / Math.PI)}°`, "#ffa000");
            updateBlueprintIndicator();
        }

        // Phase 1: sprint + keyboard jump (stamina-driven).
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state.controls.sprint = true;
        if (e.code === 'Space' && !e.repeat && state.controls.canJump && !state.dead) {
            velocity.y += CONFIG.JUMP_FORCE;
            state.controls.canJump = false;
            StaminaSystem.drainJump(state.stats);
        }

        // Escape to force lock/close everything
        if (e.code === 'Escape') {
            const inv = document.getElementById('inventory');
            const menu = document.getElementById('radial-menu');
            inv.style.display = 'none';
            menu.style.display = 'none';
            closeStoragePanel();
            pointerControls.lock();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state.controls.sprint = false;
    });

    window.addEventListener('mousedown', (e) => {
        if (!pointerControls.isLocked) return;
        if (e.button === 0) performAction();
        if (e.button === 2) { // RMB
            const activeTool = state.belt[state.selectedBeltSlot || 0];
            if (activeTool === 'building_plan') {
                document.getElementById('radial-menu').style.display = 'flex';
                pointerControls.unlock();
            }
        }
    });

    // ==================== ADVANCED UNIFIED CONTROLS (v3.0) ====================
    const gameControls = new UnifiedGameControls({
        requireLandscape: true,
        showCameraControls: true, // Rust needs camera control
        mouseSensitivity: 0.002,
        actionButtons: [
            { id: 'attack', label: '⚔️', action: 'attack', key: 'KeyF', color: '#e74c3c' },
            { id: 'build', label: '🏗️', action: 'build', key: 'KeyB', color: '#f39c12' },
            { id: 'jump', label: '⬆️', action: 'jump', key: 'Space', color: '#3498db' },
            { id: 'inventory', label: '🎒', action: 'inventory', key: 'KeyE', color: '#9b59b6' },
            { id: 'crouch', label: '🔽', action: 'crouch', key: 'ControlLeft', color: '#34495e' },
            { id: 'view', label: '👁️', action: 'view', key: 'KeyV', color: '#1abc9c' },
            { id: 'sprint', label: '💨', action: 'sprint', key: 'ShiftLeft', color: '#27ae60', hold: true }
        ],
        onMove: (dx, dy) => {
            state.controls.left = dx < -0.1;
            state.controls.right = dx > 0.1;
            state.controls.forward = dy < -0.1;
            state.controls.backward = dy > 0.1;
        },
        onCamera: (dx, dy) => {
            // Camera look control for touch/gamepad
            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= dx * 0.05;
            euler.x -= dy * 0.05;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
        },
        onAction: (action) => {
            switch(action) {
                case 'attack':
                    if (state.building.selectedBlueprint) placeStructure();
                    else performAction();
                    break;
                case 'build':
                    const radialMenu = document.getElementById('radial-menu');
                    if (radialMenu.style.display === 'flex') {
                        radialMenu.style.display = 'none';
                        state.building.selectedBlueprint = null;
                        if (!isTouchDevice) pointerControls.lock();
                    } else {
                        radialMenu.style.display = 'flex';
                        pointerControls.unlock();
                    }
                    break;
                case 'jump':
                    if (state.controls.canJump) {
                        velocity.y += CONFIG.JUMP_FORCE;
                        state.controls.canJump = false;
                    }
                    break;
                case 'inventory':
                    const inv = document.getElementById('inventory');
                    if (inv.style.display === 'flex') {
                        inv.style.display = 'none';
                        if (!isTouchDevice) pointerControls.lock();
                    } else {
                        inv.style.display = 'flex';
                        pointerControls.unlock();
                        renderCraftingGrid();
                        renderInventoryGrid();
                        renderBelt();
                        initPlayerPreview();
                    }
                    break;
                case 'crouch':
                    state.controls.crouch = !state.controls.crouch;
                    camera.position.y = state.controls.crouch ? 1.2 : 1.8;
                    showNotification(state.controls.crouch ? 'Crouch ON' : 'Crouch OFF', '#34495e');
                    break;
                case 'view':
                    state.viewMode = state.viewMode === 'first' ? 'third' : 'first';
                    if (playerMesh) playerMesh.visible = (state.viewMode === 'third');
                    showNotification(`View: ${state.viewMode.toUpperCase()}`, '#3498db');
                    break;
                case 'sprint':
                    // Sprint is a hold state: onHoldChange below owns it.
                    break;
            }
        },
        onHoldChange: (action, isDown) => {
            if (action === 'sprint') state.controls.sprint = isDown;
        },
        debug: false
    });
    
    // Initial device scheme (replaces the unconditional touch init).
    applyDeviceMode(loadMode(localStorage));

    // Init sound on first user interaction
    function initSoundOnInteraction() {
        SoundFX.init();
        document.removeEventListener('click', initSoundOnInteraction);
        document.removeEventListener('keydown', initSoundOnInteraction);
        document.removeEventListener('touchstart', initSoundOnInteraction);
    }
    document.addEventListener('click', initSoundOnInteraction);
    document.addEventListener('keydown', initSoundOnInteraction);
    document.addEventListener('touchstart', initSoundOnInteraction);

    const startBtn = document.getElementById('start-button');
    if (startBtn) {
        startBtn.onclick = () => {
            // Pointer lock follows the effective scheme, not raw hardware:
            // manual "desktop" mode on a touchscreen still gets mouse look.
            if (deviceKind !== 'phone') pointerControls.lock();
            else document.getElementById('instructions').style.display = 'none';
        };
    }

    // Initialize Building System
    initBlueprintSelector();

    pointerControls.addEventListener('lock', () => {
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('inventory').style.display = 'none';
    });
    pointerControls.addEventListener('unlock', () => {
        if (document.getElementById('inventory').style.display !== 'flex') {
            document.getElementById('instructions').style.display = 'flex';
        }
    });

    // Main Loop
    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = Math.min((time - lastTime) / 1000, 0.1);

        // Phase 1: day clock (save-compatible) + weather.
        const adv = DayNight.advance(state.day || 1, state.time, delta, SURVIVAL_CONFIG.dayLength);
        if (adv.wrapped) {
            showNotification(`☀️ Day ${adv.day} — you survived another day`, '#f39c12');
        }
        state.day = adv.day;
        state.time = adv.time;
        const dayProgress = state.time / SURVIVAL_CONFIG.dayLength;

        if (weather.update(delta)) {
            showNotification(`${weather.def.icon} ${weather.def.name}`, '#7fb3d5');
        }

        // Day/Night Cycle
        const angle = dayProgress * Math.PI * 2;
        const wmod = weather.def;
        sun.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 20);
        sun.intensity = Math.max(0, Math.sin(angle) * 1.5) * wmod.lightMod;
        ambientLight.intensity = Math.max(0.1, Math.sin(angle) * 0.4) * wmod.lightMod;
        scene.fog.density = 0.005 * wmod.fogMod;
        // Day/Night fog: reuse the existing FogExp2 object, only update color when it changes
        const fogNight = dayProgress > 0.5 && dayProgress < 0.9;
        const fogTarget = fogNight ? 0x050510 : 0x87ceeb;
        if (scene.fog.color.getHex() !== fogTarget) {
            scene.fog.color.setHex(fogTarget);
        }

        const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (pointerControls.isLocked || isTouch) {
            if (state.dead) {
                // ☠️ اللاعب ميت — تجميد كل المحاكاة (شاشة الموت نشطة)
            } else {
            // Phase 1: centralized survival simulation (config-driven, no per-frame allocs).
            let inRad = false;
            for (const z of radZones) {
                const dx = camera.position.x - z.x;
                const dz = camera.position.z - z.z;
                if (dx * dx + dz * dz < z.r * z.r) { inRad = true; break; }
            }

            const moving = state.controls.forward || state.controls.backward || state.controls.left || state.controls.right;
            const stim = StaminaSystem.update(state.stats, delta, {
                wantSprint: !!state.controls.sprint && moving,
                freezing: state.stats.temperature <= SURVIVAL_CONFIG.freezingThreshold,
            });
            sprintActive = stim.sprinting;

            const surv = SurvivalSystem.tick(state.stats, delta, {
                sprinting: sprintActive,
                inRadiation: inRad,
                isNight: DayNight.isNight(state.time, SURVIVAL_CONFIG.dayLength),
                isRaining: weather.isRaining,
                nearFire: nearestCampfireDist(camera.position.x, camera.position.z) < 6,
            });
            for (const ev of surv.events) {
                if (ev.type === 'hunger' && (ev.to === 'hungry' || ev.to === 'starving')) {
                    showNotification(ev.to === 'hungry' ? '🍖 You feel hungry' : '🍖 You are STARVING!', '#e67e22');
                }
                if (ev.type === 'thirst' && (ev.to === 'thirsty' || ev.to === 'dehydrated')) {
                    showNotification(ev.to === 'thirsty' ? '💧 You feel thirsty' : '💧 You are DEHYDRATED!', '#3498db');
                }
            }

            // Update NPCs
            npcs.forEach(npc => npc.update(delta, camera.position));

            velocity.x -= velocity.x * CONFIG.FRICTION * delta;
            velocity.z -= velocity.z * CONFIG.FRICTION * delta;
            velocity.y -= CONFIG.GRAVITY * delta;
            direction.z = Number(state.controls.forward) - Number(state.controls.backward);
            direction.x = Number(state.controls.right) - Number(state.controls.left);
            if (direction.lengthSq() > 0) direction.normalize();
            const moveSpeed = CONFIG.PLAYER_SPEED * (sprintActive ? 1.55 : 1);
            if (state.controls.forward || state.controls.backward) velocity.z -= direction.z * moveSpeed * delta;
            if (state.controls.left || state.controls.right) velocity.x -= direction.x * moveSpeed * delta;
            pointerControls.moveRight(-velocity.x * delta);
            pointerControls.moveForward(-velocity.z * delta);
            const collisionPoint = { x: camera.position.x, z: camera.position.z };
            checkCollisions(collisionPoint);
            camera.position.x = collisionPoint.x; camera.position.z = collisionPoint.z;
            camera.position.y += (velocity.y * delta);
            const groundY = getTerrainHeight(camera.position.x, camera.position.z) + 1.6;
            if (camera.position.y < groundY) {
                // Phase 1: centralized fall damage.
                if (velocity.y < -20) {
                    const fallDmg = Math.round((-velocity.y - 20) * 5);
                    DamageSystem.applyDamage(state.stats, fallDmg, DamageTypes.FALL);
                    showNotification(`💥 Fall damage: ${fallDmg}`, '#e74c3c');
                    screenFlash('rgba(255,0,0,0.25)');
                }
                velocity.y = 0; camera.position.y = groundY; state.controls.canJump = true;
            }
            if (playerMesh) {
                playerMesh.position.set(camera.position.x, camera.position.y - 1.6, camera.position.z);
                const playerRot = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
                playerMesh.rotation.y = playerRot.y + Math.PI;
            }
            updateGhost();
            updateHUDSimulation();

            // Structure Inspection
            const inspectRay = new THREE.Raycaster();
            inspectRay.setFromCamera(new THREE.Vector2(0, 0), camera);
            const structureHits = inspectRay.intersectObjects(builtStructures, true);
            if (structureHits.length > 0 && structureHits[0].distance < 5) {
                updateBuildInfo(structureHits[0].object);
            } else {
                document.getElementById('build-info').style.display = 'none';
                state.building.lookingAtStructure = null;
            }

                // ☠️ فحص الموت — عند وصول الصحة للصفر
                if (state.stats.health <= 0 && !state.dead) {
                    triggerDeath();
                }
            } // نهاية else: اللاعب حي
        }
        // Camera Smoothing Logic
        if (state.viewMode === 'third') {
            const idealCameraOffset = new THREE.Vector3(0, 2, 5).applyQuaternion(camera.quaternion);
            const targetCamPos = camera.position.clone().add(idealCameraOffset);

            const realPos = camera.position.clone();
            camera.position.copy(targetCamPos);
            renderer.render(scene, camera);
            camera.position.copy(realPos);
        } else {
            renderer.render(scene, camera);
        }

        lastTime = time;
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ==================== PERSISTENCE SYSTEM (Phase 1: versioned + migrating) ====================
    let saveFutureVersionWarned = false; // avoid re-warning on every autosave tick
    function saveGame() {
        // Versioned save (v3); never throws; corruption-safe write.
        try {
            const saveData = {
                saveVersion: SAVE_VERSION,
                timestamp: Date.now(),
                player: {
                    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                    rotation: { y: camera.rotation.y }, // Camera rotation for yaw
                    stats: { ...state.stats },
                    belt: state.belt,
                    dead: state.dead
                },
                inventory: state.inventory.map(i => ({ id: i.id, count: i.count })),
                world: {
                    day: state.day || 1,
                    weather: weather.toJSON(),
                    campfires: campfires.map(c => ({ x: c.pos.x, z: c.pos.z })),
                    storages: storageBoxes.map(b => ({ id: b.id, x: b.pos.x, y: b.pos.y, z: b.pos.z, inv: b.inv.toJSON() })),
                    respawns: respawnQueue.map(r => ({
                        type: r.type,
                        pos: r.pos,
                        worldData: r.worldData || null,
                        remaining: Math.max(1, Math.round(((r.delay || RESPAWN_DELAY) - (Date.now() - r.time)) / 1000))
                    }))
                },
                buildings: {
                    structures: builtStructures.map(s => ({
                        type: s.userData.buildType || 'structure', // Use buildType for structures
                        pos: { x: s.position.x, y: s.position.y, z: s.position.z },
                        rot: s.rotation.y,
                        tier: s.userData.tier,
                        health: s.userData.health,
                        maxHealth: s.userData.maxHealth,
                        isTC: s.userData.type === 'tool_cupboard',
                        isDoor: s.userData.isDoor === true,
                        isOpen: s.userData.isOpen === true
                    })),
                    toolCupboards: state.building.toolCupboards
                },
                time: state.time
            };

            if (SaveSystem.write(localStorage, SAVE_KEY, saveData)) {
                showNotification("Game Saved");
            } else if (SaveSystem.lastWriteError === 'future-version-readonly' && !saveFutureVersionWarned) {
                saveFutureVersionWarned = true;
                showNotification('⚠️ Save is from a newer version — progress not written', '#e74c3c');
            }
        } catch (e) {
            console.error('Save failed:', e);
        }
    }

    function loadGame() {
        // Parse + migrate (v1→v3) + validate. Corrupt/future saves reset safely.
        const data = SaveSystem.read(localStorage, SAVE_KEY);
        if (!data) {
            if (SaveSystem.lastReadStatus === 'future-version') {
                showNotification('⚠️ Save is from a newer version — progress kept in memory only', '#e67e22');
            } else if (SaveSystem.lastReadStatus === 'corrupt' || SaveSystem.lastReadStatus === 'error') {
                showNotification('⚠️ Save corrupted — started fresh (previous slot kept)', '#e74c3c');
            }
            return;
        }

        try {
            // Restore Player
            camera.position.set(data.player.position.x, data.player.position.y, data.player.position.z);
            if (data.player.rotation && data.player.rotation.y !== undefined) {
                camera.rotation.y = data.player.rotation.y;
            }
            if (playerMesh) playerMesh.position.set(data.player.position.x, data.player.position.y - 1.6, data.player.position.z);

            // Restore State (normalized: missing Phase-1 fields get defaults)
            SurvivalSystem.normalize(data.player.stats);
            state.stats = data.player.stats;
            state.inventory = data.inventory;
            state.belt = (data.player.belt && data.player.belt.length) ? data.player.belt : state.belt;
            state.day = (data.world && data.world.day) || 1;
            state.time = data.time;
            if (data.world && data.world.weather) {
                const w = WeatherSystem.fromJSON(data.world.weather);
                weather.current = w.current;
                weather.timeLeft = w.timeLeft;
            }

            // Restore pending respawns (remaining seconds preserved across reloads).
            // The queue is rebuilt from scratch so loadGame() is safe to call twice.
            respawnQueue.length = 0;
            if (data.world && Array.isArray(data.world.respawns)) {
                for (const r of data.world.respawns) {
                    if (!r || !r.type || !r.pos) continue;
                    respawnQueue.push({
                        pos: r.pos, type: r.type, worldData: r.worldData || null,
                        time: Date.now(), delay: (r.remaining || 60) * 1000
                    });
                }
            }

            // Restore storage boxes (replace the fresh camp box to avoid duplicates)
            for (const b of storageBoxes.slice()) {
                scene.remove(b.mesh);
                for (const arr of [interactables, collisionObjects]) {
                    const i = arr.indexOf(b.mesh);
                    if (i !== -1) arr.splice(i, 1);
                }
                storageBoxes.splice(storageBoxes.indexOf(b), 1);
            }
            if (data.world && Array.isArray(data.world.storages)) {
                for (const s of data.world.storages) {
                    if (s && typeof s.x === 'number') spawnStorageBox(s.x, s.z, s.inv);
                }
            }
            if (!storageBoxes.length) spawnStorageBox(-4, 3, null);

            // Restore campfires (v3): clear existing ones first (idempotent load).
            for (const c of campfires.slice()) {
                scene.remove(c.mesh);
                for (const arr of [interactables, collisionObjects]) {
                    const i = arr.indexOf(c.mesh);
                    if (i !== -1) arr.splice(i, 1);
                }
                if (c.light && c.light.parent) c.light.parent.remove(c.light);
                c.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
                campfires.splice(campfires.indexOf(c), 1);
            }
            if (data.world && Array.isArray(data.world.campfires)) {
                for (const c of data.world.campfires) {
                    if (c && Number.isFinite(c.x) && Number.isFinite(c.z)) placeCampfire(c.x, c.z);
                }
            }

            // Restore Structures: dispose the current ones first so repeated loads
            // never duplicate meshes, colliders, tool cupboards or GPU resources.
            for (const s of builtStructures.slice()) {
                scene.remove(s);
                for (const arr of [interactables, collisionObjects]) {
                    const i = arr.indexOf(s);
                    if (i !== -1) arr.splice(i, 1);
                }
                if (s.geometry) s.geometry.dispose();
                if (s.material) s.material.dispose();
            }
            builtStructures.length = 0;
            state.building.toolCupboards.length = 0;

            (data.buildings.structures || []).forEach(s => {
                let layout = BUILDING_TYPES[s.type];
                if (!layout && s.isTC) layout = BUILDING_TYPES.tool_cupboard;
                if (!layout) layout = BUILDING_TYPES.foundation; // Fallback

                const geometry = new THREE.BoxGeometry(...layout.geometry);
                const tierData = BUILDING_TIERS[s.tier || 'twig'];
                const material = new THREE.MeshStandardMaterial({
                    color: tierData.color,
                    roughness: 0.8
                });

                const structure = new THREE.Mesh(geometry, material);
                structure.position.set(s.pos.x, s.pos.y, s.pos.z);
                if (s.rot) structure.rotation.y = s.rot;
                structure.castShadow = true;
                structure.receiveShadow = true;

                structure.userData = {
                    type: s.isTC ? 'tool_cupboard' : 'structure',
                    buildType: s.type,
                    tier: s.tier || 'twig',
                    health: s.health,
                    maxHealth: s.maxHealth,
                    // Door state must survive reload, otherwise the mesh looks open
                    // while userData says closed and the first tap appears to do nothing.
                    isDoor: s.isDoor === true,
                    isOpen: s.isOpen === true
                };
                if (structure.userData.isDoor && !structure.userData.isOpen) structure.rotation.y = 0;

                // Re-register TC
                if (s.isTC) {
                    state.building.toolCupboards.push({ pos: { x: s.pos.x, z: s.pos.z }, radius: CONFIG.TC_RADIUS });
                }

                scene.add(structure);
                builtStructures.push(structure);
                collisionObjects.push(structure);
            });

            updateHUD();

        } catch (e) {
            // Axis 4: corrupt save => visible notification + fresh state, never a crash.
            console.error("Failed to load save:", e);
            try {
                SurvivalSystem.normalize(state.stats);
                updateHUD();
                showNotification('⚠️ Save corrupted — started fresh (progress kept in memory only)', '#e74c3c');
            } catch (_) {}
        }
    }

    function updateBuildingPrivilegeUI() {
        let indicator = document.getElementById('privilege-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'privilege-indicator';
            indicator.style.cssText = "position:fixed; bottom:120px; right:20px; background:rgba(46, 204, 113, 0.2); color:#2ecc71; padding:8px 15px; border-radius:4px; font-weight:bold; font-size:0.9rem; border-left: 3px solid #2ecc71; display:none; pointer-events:none;";
            indicator.innerHTML = '<i class="fas fa-hammer"></i> BUILDING PRIVILEGE';
            document.body.appendChild(indicator);
        }

        let hasPrivilege = false;
        // Check if inside any TC range
        state.building.toolCupboards.forEach(tc => {
            const dist = Math.sqrt((camera.position.x - tc.pos.x) ** 2 + (camera.position.z - tc.pos.z) ** 2);
            if (dist < CONFIG.TC_RADIUS) {
                hasPrivilege = true;
            }
        });

        if (hasPrivilege) {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    // Auto-Save every 60 seconds + on tab hide/close + after major events.
    setInterval(saveGame, SURVIVAL_CONFIG.autosaveIntervalMs);
    window.addEventListener('pagehide', () => { try { saveGame(); } catch (_) {} });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { try { saveGame(); } catch (_) {} }
    });

    // Respawn check every 5 seconds
    setInterval(processRespawns, 5000);

    // Initial Load
    loadGame();

    animate();
    // Hook into animate loop without rewriting the whole function
    // We overwrite the existing animate function reference? No, that's messy.
    // Better to insert the call inside existing animate loop if possible, OR just use setInterval for UI check (cheaper).
    setInterval(updateBuildingPrivilegeUI, 500); // Check every 500ms is enough

    initInventoryTabs();
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';
        updateHUD();
    }, 1500);

    // 🌐 تصدير مراجع المحرك لنظام الموت/المكافأة (نطاق الوحدة)
    window.__rustCore = { camera, pointerControls };
    // Phase 1: QA bridge — exposes try-scoped systems to the top-level debug API.
    window.__phase1 = {
        save: () => saveGame(),
        load: () => loadGame(),
        use: (id) => useConsumable(id),
        craft: (id) => window.performCraft(id),
        weather: () => weather.current,
        storageCount: () => storageBoxes.length,
        // QA-only mutators: place world objects without the raycast/UI path so
        // save + reload round-trips can be verified in a real browser.
        placeStructure: (buildType, x, y, z, opts = {}) => {
            const layout = BUILDING_TYPES[buildType];
            if (!layout) return false;
            const tier = BUILDING_TIERS[opts.tier || 'twig'];
            const structure = new THREE.Mesh(
                new THREE.BoxGeometry(...layout.geometry),
                new THREE.MeshStandardMaterial({ color: tier.color, roughness: 0.8 })
            );
            structure.position.set(x, y, z);
            structure.rotation.y = opts.rotY || 0;
            structure.castShadow = true;
            structure.receiveShadow = true;
            structure.userData = {
                type: buildType === 'tool_cupboard' ? 'tool_cupboard' : (layout.isDoor ? 'door' : 'structure'),
                buildType,
                tier: opts.tier || 'twig',
                health: tier.health,
                maxHealth: tier.health,
                isDoor: layout.isDoor === true,
                isOpen: opts.isOpen === true,
            };
            if (buildType === 'tool_cupboard') {
                state.building.toolCupboards.push({ pos: { x, z }, radius: CONFIG.TC_RADIUS });
            }
            if (structure.userData.isOpen) structure.rotation.y = Math.PI / 2;
            scene.add(structure);
            builtStructures.push(structure);
            collisionObjects.push(structure);
            return true;
        },
        placeCampfire: (x, z) => !!placeCampfire(x, z),
        // Read-only snapshot so browser verification can assert on real game state.
        snapshot: () => ({
            device: deviceKind,
            deviceMode: loadMode(localStorage),
            runtime: runtimeKind,
            player: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            controls: { ...state.controls },
            day: state.day,
            time: state.time,
            weather: weather.current,
            dead: state.dead,
            structures: builtStructures.length,
            campfires: campfires.length,
            storages: storageBoxes.length,
            pendingRespawns: respawnQueue.length,
            toolCupboards: state.building.toolCupboards.length,
            doors: builtStructures.filter(s => s.userData.isDoor).map(s => ({
                buildType: s.userData.buildType,
                isOpen: s.userData.isOpen === true,
                rotY: Number(s.rotation.y.toFixed(3)),
            })),
        }),
    };

} catch (err) {
    console.error("Critical Failure:", err);
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
    alert("Game Crash: " + err.message);
}

// ==================== SOUND SYSTEM ====================
const SoundFX = {
    ctx: null,
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { console.warn('Audio not available'); }
    },
    _ensure() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    _noise(duration, volume = 0.15) {
        this._ensure(); if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        src.connect(gain).connect(this.ctx.destination);
        src.start();
    },
    _tone(freq, duration, volume = 0.1, type = 'sine') {
        this._ensure(); if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    },
    harvest() { this._noise(0.12, 0.12); this._tone(200, 0.08, 0.08, 'square'); },
    build() { this._noise(0.2, 0.18); this._tone(80, 0.15, 0.2, 'sine'); this._tone(120, 0.1, 0.1, 'square'); },
    hit() { this._noise(0.08, 0.1); this._tone(300, 0.06, 0.06, 'sawtooth'); },
    upgrade() { this._tone(400, 0.2, 0.12, 'sine'); this._tone(600, 0.15, 0.08, 'sine'); },
    ui_click() { this._tone(800, 0.05, 0.05); },
    door() { this._noise(0.1, 0.1); this._tone(150, 0.15, 0.1, 'triangle'); }
};

// ==================== INVENTORY 3D PREVIEW ====================
let previewRenderer, previewScene, previewCamera, previewPlayer;

function initPlayerPreview() {
    const container = document.getElementById('player-3d-preview');
    if (!container) return;
    container.innerHTML = '';
    // Dispose old renderer/scene to prevent memory leak
    if (previewRenderer) {
        previewRenderer.dispose();
        previewRenderer = null;
    }
    previewScene = new THREE.Scene();
    previewCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    previewCamera.position.set(0, 1.2, 3.5);
    previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    previewRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(previewRenderer.domElement);
    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    previewScene.add(ambient);
    previewPlayer = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x8b322c }));
    torso.position.y = 1.25; previewPlayer.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    head.position.y = 1.85; previewPlayer.add(head);
    previewScene.add(previewPlayer);
    function animatePreview() {
        if (document.getElementById('inventory').style.display === 'none') return;
        requestAnimationFrame(animatePreview);
        previewPlayer.rotation.y += 0.01;
        previewRenderer.render(previewScene, previewCamera);
    }
    animatePreview();
}




// ==================== ☠️ DEATH & REWARD SYSTEM (شاهد إعلان = عودة للحياة) ====================

function triggerDeath() {
    if (state.dead) return;
    state.dead = true;
    state.deathCount = (state.deathCount || 0) + 1;

    // فك قفل المؤشر لإظهار الشاشة
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {}

    const screen = document.getElementById('death-screen');
    const reason = document.getElementById('death-reason');
    if (state.stats.radiation >= 100) {
        reason.textContent = '💀 قتلتك الإشعاعات النووية... شاهد إعلانًا وانهض من جديد!';
    } else if (state.stats.hunger <= 0) {
        reason.textContent = '💀 مات جوعًا... شاهد إعلانًا وانهض من جديد!';
    } else if (state.stats.thirst <= 0) {
        reason.textContent = '💀 مات عطشًا... شاهد إعلانًا وانهض من جديد!';
    } else {
        reason.textContent = '💀 استنفدت قواك... شاهد إعلانًا وانهض من جديد!';
    }
    document.getElementById('death-count').textContent = state.deathCount;
    document.getElementById('revive-count').textContent = state.reviveCount || 0;
    screen.classList.remove('death-revive-flash');
    screen.style.display = 'flex';
    void screen.offsetWidth; // إعادة تشغيل الأنيميشن
    screen.classList.add('death-revive-flash');
}

async function reviveWithAd() {
    const btn = document.getElementById('revive-ad-btn');
    const status = document.getElementById('revive-status');
    btn.disabled = true;
    status.style.display = 'block';
    status.textContent = '⏳ جاري تحميل الإعلان...';

    let rewarded = false;
    try {
        // على الـ APK: إعلان Rewarded حقيقي من AdMob
        if (window.GameAds && window.GameAds.initialized) {
            const result = await window.GameAds.showRewarded();
            rewarded = !!result;
        }
    } catch (_) { rewarded = false; }

    if (!rewarded) {
        // المتصفح: لا يوجد AdMob — محاكاة إعلان بعداد تنازلي
        for (let i = 5; i > 0; i--) {
            status.textContent = `📺 إعلان تجريبي (وضع المتصفح) — العودة خلال ${i} ثانية...`;
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // النجاة!
    state.reviveCount = (state.reviveCount || 0) + 1;
    document.getElementById('revive-count').textContent = state.reviveCount;
    status.textContent = '✨ عُدت إلى الحياة!';
    const screen = document.getElementById('death-screen');
    setTimeout(() => {
        screen.style.display = 'none';
        btn.disabled = false;
        status.style.display = 'none';
    }, 700);

    doRevive();
    showNotification('✨ نجوت بفضل الإعلان!', '#f39c12');
    try { saveGame(); } catch (_) {} // Phase 1: persist after revive
}

function giveUpRespawn() {
    const screen = document.getElementById('death-screen');
    const status = document.getElementById('revive-status');
    const btn = document.getElementById('revive-ad-btn');
    screen.style.display = 'none';
    status.style.display = 'none';
    status.textContent = '';
    btn.disabled = false;
    doRevive();
    showNotification('🔄 بدأت من جديد بمعداتك الأساسية', '#e74c3c');
}

function doRevive() {
    // استعادة الصحة والجوع والعطش (+ Phase 1: stamina/temperature/bleeding)
    state.stats.health = 100;
    state.stats.hunger = 80;
    state.stats.thirst = 80;
    state.stats.radiation = 0;
    state.stats.stamina = 100;
    state.stats.temperature = 90;
    state.stats.bleeding = 0;
    state.dead = false;

    // العودة لنقطة البداية (المخيم الأساسي)
    const core = window.__rustCore || {};
    const groundY = getTerrainHeight(0, 0) + 1.6;
    if (core.camera) core.camera.position.set(0, groundY, 0);
    if (typeof velocity !== 'undefined') { velocity.x = 0; velocity.y = 0; velocity.z = 0; }
    if (playerMesh) playerMesh.position.set(0, groundY - 1.6, 0);

    // إعادة قفل المؤشر (قد تحتاج نقرة واحدة من اللاعب)
    try { if (core.pointerControls && !core.pointerControls.isLocked) core.pointerControls.lock(); } catch (_) {}

    updateHUD();
    updateHUDSimulation();
}

// ربط الأزرار
document.addEventListener('DOMContentLoaded', () => {
    const reviveBtn = document.getElementById('revive-ad-btn');
    const respawnBtn = document.getElementById('death-respawn-btn');
    if (reviveBtn) reviveBtn.addEventListener('click', () => { reviveWithAd(); });
    if (respawnBtn) respawnBtn.addEventListener('click', () => { giveUpRespawn(); });
});

// 🛠️ Debug/Test API — للاختبار الآلي والـ QA (لا يؤثر على اللعب)
window.RustGameDebug = {
    die: () => triggerDeath(),
    setHealth: (v) => { state.stats.health = Math.max(0, v); },
    getHealth: () => state.stats.health,
    isDead: () => state.dead,
    reviveCount: () => state.reviveCount,
    // Phase 1 probes (bridged into the engine scope via window.__phase1):
    getStats: () => ({ ...state.stats }),
    setStat: (k, v) => { if (k in state.stats) state.stats[k] = v; },
    give: (id, n) => addItem(id, n || 1),
    getDay: () => state.day,
    saveVersion: () => SAVE_VERSION,
    save: () => window.__phase1 && window.__phase1.save(),
    load: () => window.__phase1 && window.__phase1.load(),
    use: (id) => window.__phase1 && window.__phase1.use(id),
    craft: (id) => window.__phase1 && window.__phase1.craft(id),
    weather: () => (window.__phase1 ? window.__phase1.weather() : 'n/a'),
    clock: () => ({ day: state.day, time: state.time }),
    storageCount: () => (window.__phase1 ? window.__phase1.storageCount() : -1),
};
