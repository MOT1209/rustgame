# RUSTGAME — Godot 4.7: خطة التحويل (خط التطوير الجديد)

> **قرار (2026-10-21):** التطوير الأساسي ينتقل إلى **Godot 4.7**.
> - `rust-1/` = **خط التطوير الجديد** (المشروع الأساسي).
> - `js/` (Three.js) = **الإصدار المُجمَّد 1.2.0** — ما زال يُبنى ويُنشر (ويب/أندرويد/‎.exe) ولا يُمس بعد.
> - `unity/` = **مرجع منطق مُختبَر** (38 اختبار) — يبقى في المستودع كمرجع للأرقام والبنى، وليس هدفاً.

---

## 1. الوضع الحالي لِـ`rust-1/`

### ✅ الموجود
| | |
|---|---|
| المحرّك | Godot 4.7 · GL Compatibility · Jolt Physics |
| خريطة الإدخال | `move_*` · `jump` · `sprint` · `interact` (E) · `build_open` (Q) · `upgrade_build` (H) · `cancel_build` (G) · `inventory` (T) · `heal` (B) · `eat_food` (F) · `drink_water` (R) · 3 خانات بناء |
| Autoload | `GameEvents` · `Inventory` |
| الطبقات | world / player / building / item / npc |
| السكربتات (13) | `player.gd` (13.6KB: مشي/جري/قفز/نظر/فأس/مشعل/ghost بناء/تذاكر/سقوط) · `inventory.gd` · `game_events.gd` · `hud.gd` · `main_menu.gd` · `world.gd` · `terrain.gd` · `resource_node.gd` · `pickup.gd` · `building.gd` · `bonfire.gd` · `tent.gd` |
| المشاهد (9) | player · world · terrain · resource_node · pickup · building · bonfire · tent · hud · main_menu |
| الأصول (37) | نماذج Blender 5.2 (Axe, Backpack, Bandages, Bonfire, Can, FirstAidKit, Knife, Matchbox, Shovel, Tent, Torch, WaterBottle…) + خامات + أنيميشن |
| الاختبار | `tests/smoke_test.gd` (SceneTree headless: جمع/ترقية/التقاط/استهلاك/تكلفة بناء) |

### ❌ الناقص (مقابل ما تحقّق في JS 1.2.0 بـ139 اختبار)
| نظام JS (مُختبَر) | الحالة في Godot |
|---|---|
| `survival.ts` (جوع/عطش/لياقة/حرارة/إشعاع/نزيف) | جزئي: صحة وجوع فقط |
| `stamina.ts` | ✗ |
| `damage.ts` (مركزي) | ✗ (‏`take_damage` على اللاعب) |
| `save-system.ts` (v5، A/B، ترحيل) | ✗ لا حفظ إطلاقاً |
| `recipes.js` (18 وصفة) | ✗ |
| `storage.js` (صندوق 12 خانة) | ✗ |
| `items.js` (37 عنصراً + حدود التكديس) | 7 عناصر ثابتة بسعة |
| `resources.js` (7 عقد + أداة ×2 + respawn) | جزئي |
| `animals.ts` (ذئب/دب + نهب الجثة) | ✗ |
| `smelting.js` (الفرن) | ✗ |
| `spoilage.js` (التلف) | ✗ |
| `weather.js` + `day-night.js` | ✗ |
| `pois.js` (بوصلة/خريطة) | ✗ |
| `contextual-action.js` + اللمس | ✗ |
| طبقة المنصات (ويب/أندرويد/إلكترون) | ✗ (Godot له أهداف تصدير خاصة) |

---

## 2. الاستراتيجية

### 2.1 مصدر بيانات واحد
الأرقام موحّدة في **ملفات JSON(seed)** الموجودة أصلاً في المستودع:
`unity/RustgameUnity/Assets/_Project/Data/Seed/*.json`
(37 عنصراً · 18 وصفة · 7 عقد · 5 طبقات بناء · 6 استهلاكية) — أرقامها متحقَّق منها مقابل `game.js`.
GDScript يقرأها عبر `FileAccess` + `JSON.parse_string` ⇒ **لا ازدواج للأرقام** بين JS وGodot.

### 2.2 منطق نقي + قابل للاختبار
نقل الأنظمة إلى GDScript **نقي** (لا `Node`، لا مشهد) ⇒ يُختبر headless:
`scripts/core/*.gd` (سلوك نقي) + `scripts/game/*.gd` (غلاف `Node`).
نفس معيار الـJS: منطق نقي + غلاف رفيع.

### 2.3 بوابة اختبار في CI
عدّاد اختبار صغير بلا تبعية خارجية (`tests/test_framework.gd`):
```gdscript
assert_eq(actual, expected, "label")
```
ومشغّل: `tests/run_tests.gd` (يمتد `SceneTree`) ⇒ نفس نمط `smoke_test.gd` الموجود.
تشغيل: `godot --headless --script tests/run_tests.gd` (يعمل على CI بلا واجهة).

### 2.4 خارطة التحويل
| # | النظام | المصدر (مرجع) | ملفات Godot | اختبار |
|---|---|---|---|---|
| G1 | الإعدادات + بقاء الأرقام | `js/core/config.ts` | `scripts/core/config.gd` | — |
| G2 | البقاء (جوع/عطش/حرارة/إشعاع/نزيف) | `js/player/survival.ts` | `scripts/core/survival.gd` | `tests/test_survival.gd` |
| G3 | اللياقة | `js/player/stamina.ts` | `scripts/core/stamina.gd` | `tests/test_stamina.gd` |
| G4 | الضرر المركزي | `js/player/damage.ts` | `scripts/core/damage.gd` | `tests/test_damage.gd` |
| G5 | المخزون (حدود التكديس + صندوق 12) | `js/inventory/storage.js` | `scripts/core/inventory.gd` | `tests/test_inventory.gd` |
| G6 | الصناعة (تحقّق⇒استهلاك⇒منح) | `js/crafting/recipes.js` | `scripts/core/crafting.gd` | `tests/test_crafting.gd` |
| G7 | الحفظ v5 (A/B + ترحيل) | `js/save/save-system.ts` | `scripts/core/save_system.gd` | `tests/test_save.gd` |
| G8 | الحيوانات (ضرر الأداة + نهب مرة واحدة) | `js/world/animals.ts` | `scripts/core/animals.gd` | `tests/test_animals.gd` |
| G9 | الصهر | `js/world/smelting.js` | `scripts/core/smelting.gd` | `tests/test_smelting.gd` |
| G10 | التلف | `js/inventory/spoilage.js` | `scripts/core/spoilage.gd` | `tests/test_spoilage.gd` |
| G11 | طبقات البناء | `js/game.js` (BUILDING_TIERS) | `scripts/core/building_tiers.gd` | `tests/test_building.gd` |
| G12 | البوصلة/الخريطة | `js/world/pois.js` | `scripts/core/pois.gd` | `tests/test_pois.gd` |
| G13 | ربط المشاهد | — | `scripts/game/*.gd` + `scenes/` | اختبار تكامل smoke |
| G14 | الطقس/الليل-النهار | `js/world/weather.js` | `scripts/core/weather.gd` | `tests/test_weather.gd` |
| G15 | تصدير أندرويد/ويندوز | — | `export_presets.cfg` | CI export |
| G16 | CI (اختبارات Godot headless) | — | `.github/workflows/godot-ci.yml` | — |

---

## 3. تعريف "تم"
1. كل نظام من G1–G12 له **سطر مقابل في JS** + اختبار Godot يمرّ.
2. `godot --headless --script tests/run_tests.gd` ⇒ **كل الاختبارات خضراء** ⇒ وCI يضرسها.
3. لا أرقام مكرّرة: كل الأرقام من `Data/Seed/*.json` أو من ملف `config.gd` واحد.

---

## 4. ما لا يُنسخ
- `js/game.js` (2738 سطراً) — منطق موزّع في `js/core|player|world|...` ✓
- طبقة المنصات في JS — Godot له تصديره الخاص (Android/Win/Linux/Web) ✓
- نظام البناء بـghost في Unity — Godot عنده `player.gd` ghost بالفعل ✓
