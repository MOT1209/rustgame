# RustGame — Blender 3D Art Pipeline

Professional game-art production system for RustGame (Three.js + TypeScript +
Capacitor, desktop + Android).

Art knowledge lives in **skills** at `.opencode/skills/<name>/SKILL.md` so
opencode loads them automatically. This folder holds the shared pipeline
documentation and the headless Blender scripts that enforce it.

```
.blender/
├── README.md              <- you are here: pipeline reference
└── scripts/
    ├── validate_asset.py  <- read-only QC, PASS/WARN/FAIL report
    └── export_glb.py      <- validation-gated GLB export
```

## Skills

| Role | Skills |
|---|---|
| Orchestration | `3d-art-director`, `asset-quality-control` |
| Modelling | `hard-surface-modeling`, `prop-modeling`, `character-modeling`, `animal-modeling`, `sculpting`, `modular-building` |
| Structure | `topology`, `retopology`, `uv-unwrapping`, `low-poly-optimization` |
| Surface | `texturing`, `materials`, `pbr-materials`, `high-to-low-baking` |
| World | `environment-art`, `vegetation`, `terrain`, `destruction`, `composition`, `lighting` |
| Categories | `weapons`, `tools`, `military-assets`, `industrial-assets` |
| Delivery | `lod-generation`, `collision-mesh`, `asset-naming`, `asset-validation`, `export-pipeline`, `game-ready-assets` |
| Rig/anim | `rigging`, `animation` |

Start every art request with `3d-art-director`. It classifies the asset, sets
the budgets, activates only the skills needed, and gates approval through
`asset-quality-control`.

## Universal asset pipeline

```
REQUEST → 3D ART DIRECTOR → REFERENCE → DESIGN → BLOCKOUT
→ PRIMARY FORMS → SECONDARY → TERTIARY → HIGH POLY
→ LOW POLY → RETOPOLOGY → UV → BAKE → PBR MATERIALS → TEXTURES → SHADING
→ LIGHTING → OPTIMIZATION → LOD → COLLISION → NAMING → SCALE CHECK
→ ORIGIN CHECK → EXPORT → RUSTGAME IMPORT → IN-ENGINE VALIDATION
→ QUALITY CONTROL → APPROVED
```

Never jump from idea to final model. Every stage is compared against
reference before moving on.

## Project standards

**Units** — 1 Blender unit = 1 meter, metric, scale 1.0. Blender is +Z up;
glTF export converts to +Y up. Model facing Blender −Y (Front view, Numpad 1)
→ becomes +Z forward in Three.js.

**References**

| Thing | Dimension |
|---|---|
| Player eye height | 1.8 m standing, 1.2 m crouched |
| Player capsule | ≈1.8 m tall |
| Building cell | 3.0 × 3.0 m |
| Wall / slab thickness | 0.2 m |
| Door opening | 0.9 × 2.1 m |
| Tool cupboard | 1.0 × 1.8 × 0.8 m |

**Origin** — building modules: centre of footprint on the ground plane
(bottom face at Y=0, X/Z centred). Weapons/tools: grip point. Doors: hinge.
Props: logical placement point. Vehicles: centre/root. All LODs of one asset
share the same origin or they will pop.

**Naming** — `SM_` static mesh, `SK_` skinned, `T_` texture (`_BC _N _R _M
_AO _H`), `M_` material, `UCX_` collision, `_LOD0..3`, `ATT_` attachments.
Example: `SM_Wood_Wall_A` → `T_Wood_Wall_A_BC` → `M_Wood_Old`.

**Textures** — power-of-two; ≤1024 px normal, ≤2048 px hero/landscape only,
never 4K. glTF packs occlusion/roughness/metallic into one ORM texture.

**Performance** — desktop 60 FPS / <300 draw calls, mobile ≥30 FPS. Anything
repeated must instance; anything distant must LOD.

## Budgets

| Category | Tris | Texture |
|---|---|---|
| Clutter prop (<0.5 m) | 100–300 | 512 |
| Medium prop | 300–1 500 | 1024 |
| Hero prop | 1 500–5 000 | 2048 |
| Building module | 200–800 | 1024 |
| Tool | 500–2 000 | 1024 |
| Weapon (LOD0 viewmodel) | 1 500–6 000 | 2048 |
| Character (LOD0 desktop) | 8 000–25 000 (≤12 000 mobile) | 2048 |
| Animal | 3 000–10 000 | 1024 |
| Tree (LOD0) | 1 000–5 000 | 1024 |
| Rock | 300–2 000 | 1024 |
| Vehicle | 5 000–20 000 | 2048 |

Budgets are per category, never global. `3d-art-director` adjusts them by
repetition, camera distance, hero status and platform.

## Visual direction

REALISTIC + SURVIVAL + RAW + WORN + INDUSTRIAL + environmental storytelling.
Every environment answers WHERE, WHEN, WHAT HAPPENED, WHY IT LOOKS THIS WAY.
No clean asset-store look, no fantasy detail, no impossible proportions.

Before modelling ask: how is it manufactured, assembled and used? Where does
it wear, where does dirt and water collect? What breaks first, what gets
repaired, what gets replaced?

## Scripts

Validate (read-only, never mutates the scene):

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background `
  path\to\asset.blend --python .blender\scripts\validate_asset.py -- `
  --object SM_Crate_A --budget 1500 --require-collision --report report.json
```

Checks: naming, transforms, scale, origin-independent geometry, non-manifold,
normals, UV, materials/colour spaces, texture size, triangle budget, LOD
chain + pivot match, collision, hidden/orphan data, skin influences.
Exit code 1 = FAIL, so it can gate a build.

Export (runs validation first, refuses on FAIL unless `--force`):

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background `
  path\to\asset.blend --python .blender\scripts\export_glb.py -- `
  --object SM_Crate_A --output public\assets\models\SM_Crate_A.glb --budget 1500
```

Load results with `three/addons/loaders/GLTFLoader.js`; a failed load must
fall back to a placeholder mesh, never crash the game.

## Definition of done

An asset is done only when `asset-quality-control` returns **APPROVED**:

geometry, topology, normals, UV, materials, textures, scale, origin, LOD,
collision, performance, export and visual quality all ✓ — plus an in-browser
import check (correct scale/orientation, textures present, console clean) and
`validate_asset.py` = PASS.

Any critical failure → **REJECT** → back to the owning skill → fix → validate
→ review again.
