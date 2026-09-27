# RUSTGAME → Unity: خطة إعادة بناء كاملة (Full Rebuild Plan)

> **مصدر الفحص:** المستودع `MOT1209/rustgame` تم فحصه فعليًا (PRD.md, README.md, BUILDING_SYSTEM.md, package.json, js/core/config.ts, js/player/survival.ts, js/player/stamina.ts, js/save/save-system.ts, js/crafting/recipes.js, js/inventory/items.js, js/interaction/interaction.js, js/world/resources.js, js/world/weather.js, js/world/day-night.js, tests/*, rust-1/*).
> كل قيمة أدناه إما **[FROM REPO]** (مأخوذة حرفيًا من الكود) أو **[ASSUMPTION]** (افتراض يجب التحقق منه لاحقًا).

---

## 0. ملخص تنفيذي (Executive Summary)

المشروع الحالي: لعبة بقاء بأسلوب Rust مبنية بـ **Three.js 0.160** + **Vite** + **Capacitor 8** (Android)، بحجم كود ES modules نظيفة تدريجيًا (Phase-1 modules) بجانب محرك قديم ضخم `js/game.js` (2774 سطر — **تمت قراءته بالكامل الآن**، انظر القسم 24 لكل النتائج المحدَّثة). يوجد نموذج موازٍ بـ **Godot 4.x** في `rust-1/` (أبسط، سكربتات `.gd` منفصلة للاعب/العالم/HUD/inventory). الاختبارات: `vitest` — 6 ملفات اختبار (`phase1.test.mjs`, `save-system.test.ts`, `platform.test.ts`, `phase2-update-checker.test.mjs`, `phase2-touch-controls.test.mjs`, `phase2-save-v3.test.mjs`).

> **⚠️ تحديث 2026-09-26:** تمت قراءة `js/game.js` (2774 سطر) و`js/inventory/storage.js` و`js/world/resources.js` بالكامل. **كل نقاط [NEEDS VERIFICATION FROM REPO] في النسخة السابقة من هذه الوثيقة تم حلّها** — انظر **القسم 24: نتائج التحقق الكامل** أدناه للتفاصيل والتصحيحات. الأقسام 1-23 أعلاه تبقى صحيحة **باستثناء** التصحيحات المذكورة صراحة في القسم 24 (تحديدًا: TC_RADIUS، أساس تكلفة الإصلاح، آلية الطبخ الفورية، زاوية الكاميرا الافتراضية، وسلوك الموت/الإحياء الكامل).

**الحالة:** Phase 1 مكتملة فعليًا (البقاء، الجمع، الصناعة، البناء، التخزين، الطبخ، الوقت/الطقس، الحفظ v3). Phase 2 مخطط (قتال حيواني، فرن صهر، تلف الطعام، خريطة/بوصلة، تحسين موبايل).

**القرار المعماري الأساسي:** لن نحاول "تشغيل" كود Three.js داخل Unity. سنعيد بناء **منطق اللعبة (gameplay logic)** بـ C# نظيف يحاكي نفس الأرقام والسلوك المُستخرج من `SURVIVAL_CONFIG` و`PHASE1_RECIPES` و`NODE_TYPES` وغيرها، مع معمارية Unity احترافية (ScriptableObjects + Event-driven + fully testable).

---

## 1. جدول Mapping: Three.js/Capacitor/Godot → Unity

| المصدر (Original) | الموقع في المستودع | يقابله في Unity |
|---|---|---|
| Three.js Scene/Renderer | `js/game.js`, `index.html` | Unity Scene + Camera + URP Renderer |
| `js/core/config.ts` (`SURVIVAL_CONFIG`) | ثابت مركزي لكل الأرقام | `SurvivalConfigSO` (ScriptableObject) |
| `js/game.js` (legacy engine core) | ملف ضخم أحادي | `GameManager` + `Bootstrap` + عدة `*Service` منفصلة |
| `js/player/survival.ts`, `stamina.ts`, `damage.ts` | أنظمة اللاعب | `SurvivalStats.cs`, `StaminaSystem.cs`, `DamageSystem.cs` |
| `js/inventory/items.js`, `js/inventory/storage.js` | تعريف العناصر + Storage class | `ItemDefinition` (SO) + `InventorySystem.cs` |
| `js/crafting/recipes.js` (`PHASE1_RECIPES`) | وصفات الصناعة | `RecipeDefinition` (SO) + `CraftingSystem.cs` |
| `js/world/resources.js` (`NODE_TYPES`) | عقد الموارد | `ResourceNodeDefinition` (SO) + `ResourceNode.cs` |
| `js/world/weather.js` (`WEATHER_STATES`) | حالات الطقس | `WeatherDefinition` (SO) + `WeatherSystem.cs` |
| `js/world/day-night.js` (`DayNight`) | دورة اليوم | `TimeSystem.cs` |
| `js/world/water.js` | تفاعل الشرب من الماء | `WaterSource.cs : IInteractable` |
| `js/interaction/interaction.js` (`InteractionSystem`, `InteractKinds`) | نظام E الموحّد | `InteractionController.cs` + `IInteractable` interface |
| `js/input/input.js`, `touch-controls.js` | تجريد الإدخال | Unity **Input System Package** (Action Maps: Desktop + Touch) |
| `js/ui/hud.js` + `css/*` | HUD DOM | UGUI Canvas (أو UI Toolkit) — Views منفصلة عن المنطق |
| `js/save/save-system.ts` (v3, A/B slots) | الحفظ | `SaveManager.cs` + JSON + نفس فكرة A/B slots لمقاومة التلف |
| BUILDING_SYSTEM.md (Twig→Wood→Stone→SheetMetal→Armored + TC) | نظام البناء | `BuildingSystem` كامل (المرحلة 9) |
| `js/release/update-checker.js`, `ads.js` | خدمات إصدار الويب | **لا تُنقل** — Unity لديها Play Store update API خاص بها؛ الإعلانات عبر Unity Ads/AdMob لاحقًا إن رغب المستخدم |
| Vitest tests (`tests/*.test.mjs/.ts`) | 30+ اختبار منطق | Unity **EditMode Tests** (NUnit) لنفس المنطق |
| Capacitor Android (`android/`) | تغليف الويب لأندرويد | Unity **Android Build (IL2CPP + ARM64)** مباشرة — لا حاجة لـ Capacitor إطلاقًا |
| `rust-1/` (Godot) | نموذج مرجعي ثانٍ لتنظيم السكربتات (`player.gd`, `world.gd`, `inventory.gd`, `bonfire.gd`, `building.gd`, `resource_node.gd`) | يُستخدم فقط **كمرجع لتقسيم الملفات** (لاحظ التطابق شبه الكامل مع تقسيم Unity المقترح أدناه — الفصل موجود بالفعل: player/world/ui/inventory) |
| PRD.md | Phase 1/2 scope | Game Design Spec (القسم 2 أدناه) |

**ملاحظة مهمة [ASSUMPTION]:** لم يتم قراءة `js/game.js` بالكامل (2600+ سطر) ولا `js/inventory/storage.js` بالكامل ولا سكربتات Godot بالتفصيل الكامل بسبب الحجم — الأرقام والمنطق المستخرجة أدناه من `config.ts`/`recipes.js`/`items.js`/`resources.js`/`weather.js`/`survival.ts` تُعتبر **المصدر الموثوق** (الأنظف والأكثر تنظيمًا)، حسب أولوية التعارض المطلوبة: PRD → الاختبارات → الكود الأنظف (Phase-1 modules) → `game.js` legacy كمرجع سلوكي فقط.

---

## 2. Game Design Document (مختصر) — نسخة Unity

- **اسم مؤقت:** *Outpost Survival* (اسم عمل داخلي، غير نهائي — [ASSUMPTION], يجب تجنّب أي تشابه مع "Rust"/Facepunch في الاسم/الشعار حسب "No-copy rule" في PRD).
- **النوع:** First/Third-person Open-World Survival Crafting.
- **المنصات المستهدفة:** Android أولًا (APK/AAB) → PC لاحقًا → WebGL اختياري لاحقًا (منخفض الأولوية بسبب قيود الأداء والحجم).
- **الجمهور:** لاعبو بقاء يفضلون جلسات قصيرة-متوسطة على الموبايل + جلسات طويلة على PC.
- **الحلقة الأساسية (Core Loop):** اجمع → أدر البقاء (جوع/عطش/ستامينا/حرارة) → اصنع أدوات ومباني أساسية → ابنِ واحمِ مأوى (Twig→Armored) → خزّن الغنائم → اطبخ اللحم → انجُ من الليل والمطر → احفظ تلقائيًا بأمان.
- **أنظمة البقاء [FROM REPO — `SURVIVAL_CONFIG`]:**
  - Health/Hunger/Thirst/Stamina/Temperature/Radiation/Bleeding — 7 قيم أساسية.
  - Hunger: يبدأ 100، ينزل 0.05/ثانية مشيًا، 0.09/ثانية جريًا، 0.08/ثانية في البرد. حالات: normal>60, hungry>30, starving>0, critical=0. ضرر تجويع 2.0 HP/ثانية عند 0.
  - Thirst: يبدأ 100، ينزل 0.08/ثانية (0.13 جريًا). حالات مطابقة (normal>60, thirsty>30). ضرر جفاف 2.5 HP/ثانية.
  - Stamina: يبدأ 100. جري -12/ثانية، قفزة -10 ثابتة، جمع -4 ثابتة لكل ضربة، تجدد +9/ثانية (idle)، +4/ثانية في البرد. لا جري تحت 15.
  - Temperature: يبدأ 100. نهار +1.2/ثانية، ليل -0.9/ثانية، مطر -1.6/ثانية، بجانب نار +6.0/ثانية، ماء بارد -2.0/ثانية إضافية. تجمّد (debuff) تحت 25، ضرر حرج تحت 10 بمعدل 1.5 HP/ثانية.
  - Radiation: +2.0/ثانية داخل منطقة، -1.0/ثانية خارجها، ضرر 2.0 HP/ثانية عند 100 (Phase 2 — مناطق خطرة).
  - Bleeding: 1.0 HP/ثانية × قيمة النزيف؛ الضمادة توقفه.
  - تجدد طبيعي: +1.0 HP/ثانية فقط إذا hunger≥60 وthirst≥50.
- **نظام الجمع [FROM REPO — `NODE_TYPES`]:** tree (health 5, 12 wood/ضربة, respawn 120s, أداة axe), rock (health 6, 10 stone, respawn 150s, pickaxe), iron (8 iron, respawn 180s), sulfur (8 sulfur, respawn 180s), hemp (6 cloth, respawn 90s, يدوي), berry_bush (غير مكتمل القراءة — [NEEDS VERIFICATION]). ملاحظة: الوصف النصي في PRD/README يقول "axe ×2 wood" لكن `NODE_TYPES.tree.yieldPerHit = 12` — **[تعارض يحتاج توضيح]**: يبدو أن "×2" يشير لمضاعفة العائد عند استخدام الأداة الصحيحة، وليس القيمة الأساسية. سيُعتمد `yieldPerHit` كقيمة أساس والمضاعفة ×2 كـ tool-bonus (يطابق PRD §4.3: "مكافأة الأداة الصحيحة ×2").
- **الصناعة [FROM REPO — `PHASE1_RECIPES`]:**
  | Recipe | المدخلات | المخرج | craftTime |
  |---|---|---|---|
  | stone_axe | wood 50, stone 25 | stone_hatchet ×1 | 5s |
  | torch | wood 20, cloth 5 | torch ×1 | 3s |
  | campfire | wood 100, stone 50 | campfire ×1 | 10s |
  | bandage | cloth 4 | bandage ×1 | 3s |
  | wooden_box | wood 150 | wooden_box ×1 (12 stacks) | 8s |
- **العناصر الاستهلاكية [FROM REPO — `FOOD_DEFS`]:** berry (+8 hunger/+4 thirst)، raw_meat (+10 hunger/**-5 health** خطر)، cooked_meat (+35 hunger/+5 health)، canned_food (+30 hunger/+5 thirst)، water (+40 thirst)، bandage (+25 health). `spoilTime` موجود بالبنية لكن = 0 حاليًا في كل العناصر (جاهز لـ Phase 2 food-spoilage).
- **حدود التكديس [FROM REPO — `STACK_LIMITS`]:** wood/stone 1000، iron/sulfur 500، hqm 100، frag 500، cloth 500، scrap 100، طعام 10-20.
- **البناء [FROM REPO — BUILDING_SYSTEM.md]:** Twig (health 10, مجاني) → Wood (250 HP, 300 wood) → Stone (500 HP, 300 stone) → Sheet Metal (1000 HP, 200 metal) → Armored/HQM (2000 HP, 50 HQM). Tool Cupboard (TC) بحماية منطقة قطرها 20 وحدة. H للترقية (كاملة الصحة) أو الإصلاح (تالفة، تكلفة = 10% من تكلفة الترقية). Snap-to-grid 3×3.
- **الوقت/الطقس [FROM REPO]:** يوم = 800 ثانية (`dayLength`)، بداية اليوم عند offset 300. حالات طقس: clear (60%)، cloudy (25%)، rain (15%)، storm (0% معطّل حاليًا) — مدة كل حالة عشوائية 90-240 ثانية. كل حالة لها `tempMod`/`lightMod`/`fogMod`.
- **الحفظ [FROM REPO — save-system.ts]:** SAVE_VERSION=3. بنية: `{saveVersion, timestamp, player, inventory, world, buildings, time}`. تخزين **A/B slot** (`key:a`/`key:b` + `key:active` pointer) لمنع التلف الجزئي — عند فشل قراءة slot نشط، النظام لا يرمي استثناء (`lastReadStatus`: `ok|missing|corrupt|future-version|error`)، بل يعيد حالة فارغة آمنة. Autosave كل 60000ms.
- **HUD:** Health/Hunger/Thirst/Stamina/Temperature bars، Belt 1-6، ساعة/يوم، مؤشر طقس، prompt تفاعل سياقي، إشعار حفظ/تلف حفظ.
- **التحكم PC:** WASD, Shift(hold sprint), Space, LMB/F gather, E context-interact/inventory, Q blueprint, H upgrade/repair, T bag, 1-6 belt, double-click use.
- **التحكم Mobile:** Virtual joystick (حركة) + أزرار: Sprint toggle, Jump, Gather/Attack, Interact (سياقي)، Inventory، Blueprint، Repair، Belt slots كصف أزرار سفلي، drag & drop أو tap-to-move للعناصر.
- **الموت/الإغماء [ASSUMPTION — غير مؤكد من الكود المقروء]:** health=0 → شاشة موت + إحياء عند نقطة respawn، فقدان جزئي/كامل للـ inventory غير محدد بعد — **[NEEDS VERIFICATION FROM REPO]** (ابحث في `js/game.js` عن `respawn`/`death`/`onDeath`).
- **نطاق Unity Phase 1 (يوازي ما هو منجز فعليًا):** حركة+كاميرا، survival stats كاملة، gathering، crafting (5 وصفات)، building (5 tiers + TC)، storage box، cooking عند campfire، day/night+weather، save v3-equivalent + autosave + corruption recovery، HUD كامل، PC controls.
- **نطاق Unity Phase 2:** قتال حيواني (ذئب/دب) + نهب بـ E، فرن صهر (خام→fragments)، تلف الطعام (تفعيل `spoilTime`)، خريطة مصغرة/بوصلة/POI، تحسين تحكم اللمس.
- **مخاطر تقنية:** (١) دقة إعادة إنتاج نفس "شعور" الحركة والبقاء بأرقام مختلفة الإطار (Unity FixedUpdate مقابل requestAnimationFrame). (٢) حجم عالم مفتوح + أداء موبايل منخفض الفئة. (٣) توازن نظام البناء (collision/placement) يختلف بين Three.js raycasting وUnity physics. (٤) عدم اكتمال قراءة `game.js` يعني احتمال منطق خفي غير موثق.
- **افتراضات يجب تثبيتها من الكود الأصلي قبل البدء الفعلي:**
  1. سلوك الموت/الإحياء بالتفصيل [NEEDS VERIFICATION].
  2. تفاصيل `js/inventory/storage.js` (حجم الحقيبة/الحزام بالضبط، عدد slots) [NEEDS VERIFICATION].
  3. تفاصيل الأبواب (`isDoor`/`isOpen`) وآلية القفل [NEEDS VERIFICATION].
  4. القيمة الدقيقة لـ berry_bush وباقي NODE_TYPES غير المقروءة بالكامل [NEEDS VERIFICATION].
  5. منطق `js/game.js` الكامل للتفاعل بين الأنظمة (وهو legacy وقد يحوي سلوكًا غير موثق بالوحدات الجديدة).

---

## 3. المعمارية التقنية في Unity

- **الإصدار:** Unity 6 LTS (الأحدث المستقر وقت التنفيذ) — [ASSUMPTION: يجب التحقق من رقم LTS الفعلي عند البدء].
- **Render Pipeline:** **URP** (Universal Render Pipeline) — توصية واضحة: أداء أفضل على أندرويد منخفض/متوسط الفئة، دعم mobile-friendly lighting/fog (يحاكي `fogMod` من الطقس)، ونظام Shader Graph لتأثيرات الطقس/الليل بسهولة.
- **Input:** **Input System Package** بـ Action Maps منفصلة: `Gameplay` (Desktop) و`Touch` (Mobile)، مع نفس الأسماء المنطقية (Move, Sprint, Jump, Interact, Gather, Belt1-6, Bag, Blueprint, RepairUpgrade) لتسهيل rebind لاحقًا.
- **UI:** **UGUI** (وليس UI Toolkit) — التوصية: HUD اللعبة بسيط نسبيًا (bars + belt + prompts) وUGUI أنضج لدعم اللمس/anchors على أحجام شاشات أندرويد المتفاوتة الآن؛ UI Toolkit أفضل لأدوات المحرر وليس أولوية هنا.
- **Cinemachine:** نعم — لكاميرا Third/First person سلسة (FreeLook أو Virtual Camera مع collision detection ضد المباني).
- **Addressables:** ليس ضروريًا في Phase 1 (حجم محتوى صغير)؛ يُدرج في الخارطة كـ **Phase 2+** عندما يكبر عدد الـ prefabs/textures.
- **Unity Test Framework:** EditMode tests لكل منطق Pure C# (يوازي `tests/*.mjs`)، PlayMode tests للتفاعل الفعلي.
- **ScriptableObjects:** لكل البيانات القابلة للضبط (بديل `SURVIVAL_CONFIG`/`PHASE1_RECIPES`/`NODE_TYPES`/`FOOD_DEFS`/`WEATHER_STATES`).
- **فصل الأنظمة:** **Event Bus خفيف** (C# `event`/`UnityEvent` عبر `GameEvents` استاتيكي أو ScriptableObject-based events) بدل Singleton ضخم — يمنع تحوّل `GameManager` إلى نسخة C# من `game.js` الضخم.
- **Service Locator خفيف:** `GameServices` (static class تحمل مراجع الأنظمة الأساسية: `PlayerServices`, `SaveService`, `TimeService`) بدل DI framework ثقيل (Zenject) — كافٍ لحجم مشروع بهذا النطاق، وقابل للترقية لاحقًا.
- **الفصل الطبقي:**
  - **Core Services:** GameManager, GameEvents, ServiceLocator, TimeService.
  - **Data Layer:** كل ScriptableObjects.
  - **Gameplay Systems:** Player, Inventory, Crafting, Building, Interaction, Survival, World.
  - **Presentation/UI Layer:** Views (HUD, Panels) — قراءة فقط من الحالة عبر events.
  - **Persistence Layer:** SaveManager, Serializer, Migration.
  - **Platform/Mobile Layer:** TouchInputAdapter, MobileUIController, AndroidLifecycleHooks.

### هيكل المجلدات المقترح

```
Assets/_Project/
  Art/{Models,Textures,Materials,VFX}/
  Audio/{SFX,Music,Ambience}/
  Data/
    Items/           (ItemDefinition assets: wood, stone, cooked_meat...)
    Recipes/         (RecipeDefinition assets)
    Buildings/       (BuildingDefinition + BuildingTier assets)
    World/           (ResourceNodeDefinition, WeatherDefinition)
    Survival/        (SurvivalConfigSO)
  Prefabs/
    Player/ World/ Buildings/ Items/ UI/
  Scenes/
    Boot.unity  MainMenu.unity  World.unity
  Scripts/
    Core/          (GameManager, GameEvents, ServiceLocator, Bootstrap)
    Player/        (PlayerController, PlayerInput, PlayerCamera, PlayerInteraction)
    Survival/      (SurvivalStats, StaminaSystem, DamageSystem)
    Inventory/     (InventorySystem, ItemStack, BeltController)
    Crafting/      (CraftingSystem, RecipeDatabase)
    Building/      (BuildingPlacer, BuildingGhost, BuildingInstance, BuildingUpgradeSystem, BuildingRepairSystem)
    Interaction/   (IInteractable, InteractionController, ResourceNode, StorageBox, Campfire, Door, LootContainer)
    World/         (TimeSystem, WeatherSystem, DayNightController)
    Save/          (SaveManager, SaveData, SaveSerializer, SaveMigrationService, CorruptionHandler, AutoSaveTimer)
    Input/         (InputActions asset wrapper, TouchInputAdapter)
    UI/            (HUDController, InventoryPanel, CraftingPanel, BuildMenu, PromptView, SaveNotification)
    Platform/      (AndroidLifecycleBridge, MobilePerformanceProfile)
    Testing/       (EditMode + PlayMode test doubles)
  Settings/ (URP assets, Input Actions asset, Quality presets)
```

---

## 4. طبقة البيانات (Data Layer) — نماذج أساسية

> جميع IDs تطابق المشروع الأصلي حرفيًا (wood, stone, iron, sulfur, hqm, frag, cloth, scrap, berry, raw_meat, cooked_meat, canned_food, water, bandage, stone_hatchet, torch, campfire, wooden_box).

```csharp
[CreateAssetMenu(menuName = "Rustgame/Item Definition")]
public class ItemDefinition : ScriptableObject {
    public string id;              // "wood", "raw_meat", ...
    public string displayName;
    public ItemCategory category;  // Resource, Food, Medical, Tool, Building, Placeable
    public int stackLimit;         // من STACK_LIMITS
    public Sprite icon;
    public GameObject worldPrefab; // عند الإسقاط بالعالم
}

[CreateAssetMenu(menuName = "Rustgame/Consumable Effect")]
public class ConsumableEffect : ScriptableObject {
    public ItemDefinition item;
    public float hungerRestore;
    public float thirstRestore;
    public float healthRestore;    // raw_meat = -5 (خطر)
    public float spoilTimeSeconds; // 0 = لا يفسد (Phase 1)؛ Phase 2 يفعّلها
}

[System.Serializable]
public struct ItemStack {
    public string itemId;
    public int count;
    public bool IsEmpty => count <= 0 || string.IsNullOrEmpty(itemId);
}

[CreateAssetMenu(menuName = "Rustgame/Recipe Definition")]
public class RecipeDefinition : ScriptableObject {
    public string id;                 // "stone_axe","torch","campfire","bandage","wooden_box"
    public string displayName;
    public CraftCategory category;    // Tools, Survival, Medical
    public List<ItemStack> ingredients;
    public ItemStack result;
    public float craftTimeSeconds;
    public bool workbenchRequired;
}

[CreateAssetMenu(menuName = "Rustgame/Resource Node Definition")]
public class ResourceNodeDefinition : ScriptableObject {
    public string nodeType;        // tree, rock, iron, sulfur, hemp, berry_bush
    public string resourceItemId;
    public int nodeHealth;         // 5,6,6,6,2,...
    public int yieldPerHit;        // 12,10,8,8,6,...
    public float respawnTimeSeconds;
    public ToolType requiredTool;  // Axe, Pickaxe, Hand
    public float correctToolMultiplier = 2f; // بونص الأداة الصحيحة ×2 (PRD §4.3)
}

[CreateAssetMenu(menuName = "Rustgame/Building Tier")]
public class BuildingTierDefinition : ScriptableObject {
    public BuildingTier tier;        // Twig, Wood, Stone, SheetMetal, Armored
    public int maxHealth;            // 10,250,500,1000,2000
    public List<ItemStack> upgradeCost;
    public float repairCostFraction = 0.10f;
}

[CreateAssetMenu(menuName = "Rustgame/Survival Config")]
public class SurvivalConfigSO : ScriptableObject {
    // نسخة مطابقة حرفيًا لـ js/core/config.ts SURVIVAL_CONFIG
    public float maxHealth = 100, maxHunger = 100, maxThirst = 100, maxStamina = 100, maxTemperature = 100, maxRadiation = 100;
    public float hungerDrain = 0.05f, hungerDrainSprint = 0.09f, hungerDrainCold = 0.08f;
    public float hungerNormalThreshold = 60, hungerHungryThreshold = 30, starvationDamage = 2.0f;
    public float thirstDrain = 0.08f, thirstDrainSprint = 0.13f;
    public float thirstNormalThreshold = 60, thirstThirstyThreshold = 30, dehydrationDamage = 2.5f;
    public float sprintDrain = 12f, jumpDrain = 10f, gatherDrain = 4f, regenRate = 9f, regenRateCold = 4f, minimumSprintStamina = 15f;
    public float tempDayRate = 1.2f, tempNightDrain = 0.9f, tempRainDrain = 1.6f, tempColdWaterDrain = 2.0f;
    public float freezingThreshold = 25f, criticalThreshold = 10f, freezingDamage = 1.5f, campfireWarmRate = 6.0f;
    public float radGainInZone = 2.0f, radDecay = 1.0f, radLethalAt = 100f, radDamage = 2.0f;
    public float bleedDamage = 1.0f;
    public float regenHungerMin = 60f, regenThirstMin = 50f, naturalRegen = 1.0f;
    public float dayLengthSeconds = 800f, dayStartOffset = 300f;
    public float autosaveIntervalSeconds = 60f;
}
```

### مثال JSON — SaveData (يوازي بنية v3 الأصلية)

```json
{
  "saveVersion": 1,
  "timestamp": 1758901234567,
  "player": {
    "position": { "x": 12.4, "y": 0.0, "z": -8.1 },
    "rotationY": 42.0,
    "stats": { "health": 82, "hunger": 61, "thirst": 45, "stamina": 90, "temperature": 88, "radiation": 0, "bleeding": 0 }
  },
  "inventory": {
    "belt": [ { "itemId": "stone_hatchet", "count": 1 }, null, null, null, null, null ],
    "bag": [ { "itemId": "wood", "count": 240 }, { "itemId": "cooked_meat", "count": 3 } ]
  },
  "world": {
    "resourceNodes": [ { "id": "tree_014", "depleted": false, "respawnAt": 0 } ],
    "campfires": [ { "x": 5.0, "z": 3.2, "fuel": 40 } ]
  },
  "buildings": [
    { "type": "wall", "position": { "x": 2, "y": 0, "z": 4 }, "rotationY": 90, "tier": "wood", "health": 250, "maxHealth": 250, "isTC": false, "isDoor": false, "isOpen": false }
  ],
  "time": { "day": 3, "timeOfDay": 415.2, "weather": "cloudy", "weatherTimeLeft": 130.0 }
}
```

---

## 5. أنظمة اللاعب والحركة

**السكربتات:**
| Script | المسؤولية |
|---|---|
| `PlayerController.cs` | Character Controller-based movement (يُنصح بـ `CharacterController` وليس Rigidbody لدقة تحكم أفضل واستقرار على الموبايل)، WASD نسبي للكاميرا، جري، قفز |
| `PlayerInput.cs` | يربط Input Actions بأحداث نظيفة (`OnMove`, `OnSprintHeld`, `OnJump`, `OnInteract`, `OnGather`, `OnBelt(int)`) — طبقة تجريد فوق PC/Mobile |
| `PlayerInteraction.cs` | Raycast من الكاميرا كل فريم لاكتشاف أقرب `IInteractable`، يعرض الـ prompt، ينفّذ عند الضغط |
| `SurvivalStats.cs` | يحمل القيم الحية (health/hunger/...) وaviva دورة `Tick(dt, env)` تطابق منطق `survival.ts` بالضبط |
| `PlayerCamera.cs` | التحكم بـ Cinemachine Virtual Camera (Third-person افتراضيًا؛ [ASSUMPTION] المشروع الأصلي Three.js — يُفترض first أو third-person: **يحتاج تأكيد من `game.js`/لقطات شاشة** [NEEDS VERIFICATION FROM REPO]) |
| `PlayerMovementConfig.cs` | ScriptableObject لسرعة المشي/الجري/قوة القفزة (Unity-only tuning، لا مصدر مباشر بالريبو لأن الفيزياء مختلفة تمامًا عن Three.js) |

**قواعد:**
- منع الحركة أثناء فتح Inventory/Crafting/Blueprint panels (نفس مبدأ منع تعارض E الحالي في `interaction.js`).
- الجري يُمنع تحت `minimumSprintStamina = 15` (مطابق للكود).
- كل حدث تغيّر حالة (hunger/thirst state change) يُبث عبر `GameEvents.OnSurvivalStateChanged` لتحديث الـ HUD دون coupling مباشر.

---

## 6. نظام التفاعل السياقي (Interaction)

المشروع الأصلي لديه بالفعل تصميم نظيف جدًا (`InteractionSystem` + `InteractKinds`: gather/storage/drink/pickup/loot/use/door) بأولوية priority-based handler registry. **سنعيد نفس الفكرة تمامًا بـ C# interface:**

```csharp
public interface IInteractable {
    string PromptText { get; }               // "اضغط E للتخزين"
    InteractionKind Kind { get; }             // Gather, Storage, Drink, Pickup, Loot, Use, Door, Cook, Place
    bool CanInteract(PlayerInteractionContext ctx);
    bool Interact(PlayerInteractionContext ctx);
}

public enum InteractionKind { Gather, Storage, Drink, Pickup, Loot, Use, Door, Cook, Place }

public struct PlayerInteractionContext {
    public GameObject Player;
    public float Distance;
    public Transform ToolEquipped;
    public InventorySystem Inventory;
}
```

**منفذون:** `ResourceNode : IInteractable` (Kind=Gather، يتحقق من الأداة والمسافة والستامينا)، `StorageBox : IInteractable` (Kind=Storage)، `Campfire : IInteractable` (Kind=Cook أو Storage حسب الحالة)، `Door : IInteractable` (Kind=Door، يبدّل isOpen)، `LootContainer : IInteractable` (Kind=Loot)، `BuildingGhost` (ليس IInteractable — يُعالج بمنطق Placement منفصل عبر Q/LMB).

**السلوك المطابق للأصل:** إن لم يوجد أي `IInteractable` صالح ضمن مدى الـ raycast/E → فتح Inventory تلقائيًا (نفس منطق README: "E context interact ... E otherwise inventory").

**`InteractionController.cs`** يطابق `getInteractable(ctx)`/`interact(ctx)` الأصليين: يفحص كل المرشحين، يختار الأعلى أولوية، يعرض label، وينفّذ عند الضغط — قابل للاختبار بـ EditMode tests بمعزل عن أي Raycast فعلي (Dependency Injection لقائمة المرشحين).

---

## 7. الجمع (Gathering)

منطق مطابق لـ `NODE_TYPES` + مكافأة الأداة ×2:

```csharp
public int ResolveYield(ResourceNodeDefinition node, ToolType equippedTool) {
    int baseYield = node.yieldPerHit;
    bool correctTool = equippedTool == node.requiredTool;
    return correctTool ? Mathf.RoundToInt(baseYield * node.correctToolMultiplier) : baseYield;
}
```

- كل ضربة تستهلك `SurvivalConfig.gatherDrain` (4.0) ستامينا (يُمنع الجمع إن الستامينا = 0 — [ASSUMPTION يحتاج تأكيد سلوك الحظ التام]).
- عند `node.health <= 0` بعد الضربات: العقدة تختفي وتُعاد بعد `respawnTimeSeconds` (تُدار مركزيًا عبر `ResourceRespawnService` بدل Update لكل عقدة — يوازي `resourceRespawnCheckMs=5000` الأصلية كفحص دوري بدل كل فريم، توفيرًا للأداء على الموبايل).
- اختبارات EditMode: تحقق من عدد الضربات اللازمة، مضاعفة الأداة الصحيحة، عدم النزول تحت صفر، توقيت respawn.

---

## 8. المخزون (Inventory / Bag / Belt)

```csharp
public class InventorySystem {
    public ItemStack[] beltSlots = new ItemStack[6];   // 1-6
    public List<ItemStack> bagSlots;                    // T panel
    public bool TryAdd(string itemId, int count);        // يحترم stackLimit ويُرجع الباقي غير المضاف
    public bool TryRemove(string itemId, int count);
    public bool Move(int fromIndex, bool fromBelt, int toIndex, bool toBelt);
    public void Split(int index, bool fromBelt, int amount);
    public void Merge(int a, int b, bool belt);
    public event Action OnChanged;   // لتحديث HUD/UI
}
```

- **Inventory Full أثناء الجمع:** يوقف إضافة المزيد ويُظهر تنبيه "Inventory Full" (بدلاً من فقدان صامت للموارد) — قاعدة قبول: **لا يفقد اللاعب عناصر عند الامتلاء إلا الفائض الذي لم يُستهلك أصلًا** (Acceptance criterion صريح، القسم 17).
- **الاستخدام:** double-click على PC → `OnUseRequested(itemId)`؛ على Mobile → tap-to-select ثم زر "Use" مخصص (long-press بديل، لأن double-tap على شاشة صغيرة عرضة لأخطاء).
- **Serialization:** `InventorySave` (belt[]/bag[] كـ `{itemId,count}[]`، فراغات = null) — نفس فكرة `cleanInventory` في `save-system.ts` (تجاهل count<=0، تجاهل عناصر غير معروفة).

---

## 9. الصناعة (Crafting)

```csharp
public class CraftingSystem {
    public RecipeDatabase database;   // يحمل كل RecipeDefinition (5 وصفات Phase 1)

    public CraftResult Craft(RecipeDefinition recipe, InventorySystem inv, int qty = 1) {
        var missing = MissingIngredients(recipe, inv, qty);
        if (missing.Count > 0) return CraftResult.Fail(missing);
        // All-or-nothing: تحقق كامل قبل أي استهلاك (مطابق لـ recipes.js craft())
        foreach (var ing in recipe.ingredients) inv.TryRemove(ing.itemId, ing.count * qty);
        inv.TryAdd(recipe.result.itemId, recipe.result.count * qty);
        return CraftResult.Success(qty);
    }
}
```

- **القاعدة الحرجة (منقولة حرفيًا من `recipes.js`):** التحقق يحدث **قبل** أي استهلاك — لا يوجد سيناريو يُستهلك فيه جزء من المكوّنات ثم يفشل. اختبار وحدة إلزامي لهذا بالضبط.
- UI: لوحة Crafting تعرض الوصفات الخمس، تُعطّل الزر رماديًا عند نقص المكوّنات، تعرض شريط تقدم لمدة `craftTimeSeconds`.
- Mobile-friendly: قائمة scrollable بأيقونات كبيرة (≥64dp لمس).

---

## 10. البناء (Blueprint / Build / Upgrade / Repair)

**Tiers [FROM REPO — BUILDING_SYSTEM.md]:** Twig(10 HP,مجاني) → Wood(250 HP,300 wood) → Stone(500 HP,300 stone) → SheetMetal(1000 HP,200 metal) → Armored(2000 HP,50 HQM).

**السكربتات:**
- `BuildingPlacer.cs` — يفتح قائمة البلوبرنت عند Q (Foundation/Wall/Doorway/Ceiling)، يتتبع موضع Ghost أمام اللاعب.
- `BuildingGhost.cs` — عرض شبح شفاف؛ أخضر=صالح/أحمر=غير صالح، Snap-to-grid 3×3 (Physics.OverlapBox للتحقق من التصادم).
- `BuildingInstance.cs` — الحالة الفعلية بعد الوضع (tier, health, maxHealth, isTC, isDoor, isOpen).
- `BuildingUpgradeSystem.cs` — عند H والصحة كاملة: يتحقق من موارد الـ tier التالي، يستهلك، يرفع الـ tier.
- `BuildingRepairSystem.cs` — عند H والبناء تالف: يستهلك 10% من تكلفة الترقية (`repairCostFraction`)، يعيد الصحة الكاملة (أو تدريجيًا — [ASSUMPTION: فوري مطابقًا للنمط البسيط الحالي]).
- **Tool Cupboard (TC):** منطقة حماية نصف قطرها 20 وحدة (`SphereCollider radius=20`)، يمنع TC آخر قريب، يمنح "Building Privilege" — Phase 1 من نسخة Unity (موجود بالفعل بالمستودع، ليس Phase 2).
- الحفظ: كل `BuildingInstance` يُسلسل ضمن `BuildingSave` (type, position, rotationY, tier, health, maxHealth, isTC, isDoor, isOpen) — مطابق حرفيًا لبنية `SaveStructure` بالكود الأصلي.

---

## 11. التخزين (Storage Box)

- `StorageBox : MonoBehaviour, IInteractable` — سعة 12 stack (مطابق `wooden_box.desc: "Stores 12 stacks"`).
- فتح UI منفصل (Storage Panel) بجانب لوحة اللاعب — نقل drag & drop بين اللوحتين (PC) أو tap-to-transfer (Mobile).
- **لا فقدان عناصر:** أي عملية نقل تتحقق من السعة قبل الإزالة من المصدر (all-or-nothing كما في crafting).
- Persistence: `StorageSave { id, position, items: ItemStack[12] }` يُحفظ كجزء من `world` في الـ SaveData.

---

## 12. الطبخ (Cooking)

- `Campfire : MonoBehaviour, IInteractable` — Kind=Cook عند وجود raw_meat في يد اللاعب/الحزام وdrag إلى الموقد.
- raw_meat → cooked_meat: تحويل فوري عند الإسقاط في الموقد (يطابق بساطة النموذج الحالي — لا يوجد `cookTime` في الكود المقروء [NEEDS VERIFICATION]؛ سنفترض [ASSUMPTION] 5 ثوانٍ لكل قطعة كخط أساس قابل للتعديل عبر SO، قابل للتصحيح فورًا إن ظهر `cookTime` في `game.js`).
- منع الطبخ بلا نار مشتعلة (Campfire يحتاج fuel > 0 أو دائمًا مشتعل بعد البناء — [NEEDS VERIFICATION]).
- بعد الطبخ: `raw_meat` يُزال، `cooked_meat` يُضاف للمخزون، وHUD يعرض تأكيدًا.

---

## 13. أنظمة البقاء (Survival Stats) — تفصيل التنفيذ

انظر جدول القسم 2 للأرقام. تنفيذ `SurvivalStats.Tick(dt, env)`:

```csharp
public SurvivalTickResult Tick(float dt, SurvivalEnv env) {
    // Hunger
    float hungerRate = env.sprinting ? cfg.hungerDrainSprint : cfg.hungerDrain;
    bool freezing = temperature <= cfg.freezingThreshold;
    if (freezing) hungerRate = Mathf.Max(hungerRate, cfg.hungerDrainCold);
    hunger = Mathf.Max(0, hunger - hungerRate * dt);
    // Thirst
    float thirstRate = env.sprinting ? cfg.thirstDrainSprint : cfg.thirstDrain;
    thirst = Mathf.Max(0, thirst - thirstRate * dt);
    // Temperature
    if (env.nearFire) temperature = Mathf.Min(cfg.maxTemperature, temperature + cfg.campfireWarmRate * dt);
    else if (env.isRaining) temperature = Mathf.Max(0, temperature - cfg.tempRainDrain * dt);
    else if (env.isNight) temperature = Mathf.Max(0, temperature - cfg.tempNightDrain * dt);
    else temperature = Mathf.Min(cfg.maxTemperature, temperature + cfg.tempDayRate * dt);
    // Damage sources + natural regen ... (مطابق لـ survival.ts بالكامل)
}
```

- **جميع الضرر يمر عبر `DamageSystem.ApplyDamage(stats, amount, DamageType)` مركزيًا** — نفس مبدأ `DamageSystem.applyDamage` بالأصل (7 أنواع ضرر: Hunger, Thirst, Radiation, Cold, Bleeding + على الأرجح Fall/Combat لاحقًا في Phase 2).
- شروط الخطر: hunger=0/thirst=0/temperature≤10/radiation≥100 → ضرر مستمر. الموت عند health≤0 → [NEEDS VERIFICATION FROM REPO] لتفاصيل الإحياء.

---

## 14. الوقت والطقس

- `TimeSystem.cs`: `dayLengthSeconds=800`, يتقدم كل فريم بـ Time.deltaTime، يبث `OnDayStart`/`OnNightStart` عند عبور عتبات (بحاجة لتعريف عتبة الليل بدقة — [ASSUMPTION: الليل يبدأ عند progress≈0.6-0.9 من اليوم، يحتاج تأكيد من الكود البصري الأصلي / shader الغلاف الجوي]).
- `WeatherSystem.cs`: نفس أوزان `WEATHER_STATES` (clear60/cloudy25/rain15/storm0)، مدة 90-240 ثانية عشوائية، قابلة للـ seed للاختبار (`IRandomProvider` قابل للحقن يوازي `rng` بالكود الأصلي).
- ربط بصري: Directional Light intensity/angle (`lightMod`)، RenderSettings.fog (`fogMod`)، Particle System للمطر، AudioSource للرياح/المطر.
- الحفظ: `TimeWeatherSave { day, timeOfDay, weather, weatherTimeLeft }`.

---

## 15. الحفظ (Save/Load/Autosave/Corruption Recovery)

هذا أهم جزء تقني — يجب محاكاة قوة تصميم `save-system.ts` الأصلي بدقة:

```csharp
public static class SaveManager {
    const string KeyBase = "rustgame_save";
    public static SaveReadStatus LastReadStatus { get; private set; }
    public static string LastWriteError { get; private set; }

    public static void Save(SaveData data) {
        var slot = GetInactiveSlot();               // A/B alternation
        var json = SaveSerializer.ToJson(data);
        try {
            PlayerPrefs.SetString($"{KeyBase}:{slot}", json);
            PlayerPrefs.SetString($"{KeyBase}:active", slot);
            PlayerPrefs.Save();
            LastWriteError = null;
        } catch (Exception e) { LastWriteError = e.GetType().Name; }
    }

    public static SaveData Load() {
        var active = PlayerPrefs.GetString($"{KeyBase}:active", null);
        if (string.IsNullOrEmpty(active)) { LastReadStatus = SaveReadStatus.Missing; return SaveData.Blank(); }
        var raw = PlayerPrefs.GetString($"{KeyBase}:{active}", null);
        var result = SaveSerializer.TryParse(raw);
        if (!result.Ok) { LastReadStatus = SaveReadStatus.Corrupt; CorruptionHandler.Notify(); return SaveData.Blank(); }
        if (result.Data.saveVersion > SaveData.CurrentVersion) { LastReadStatus = SaveReadStatus.FutureVersion; return SaveData.Blank(); }
        var migrated = SaveMigrationService.MigrateToLatest(result.Data);
        LastReadStatus = SaveReadStatus.Ok;
        return migrated;
    }
}
```

- **مبدأ أساسي (منقول حرفيًا):** القراءة **لا ترمي استثناءً أبدًا** — أي خطأ يُترجم لحالة `LastReadStatus` ويُعاد `SaveData.Blank()` بدلاً من Crash. هذا Acceptance criterion غير قابل للتفاوض (القسم 17).
- **A/B slots** بدلاً من ملف واحد: يمنع فقدان كل التقدم إذا تعطّل الحفظ منتصف الكتابة (نفس فكرة atomic-ish write بالمنصة الأصلية).
- **AutoSaveTimer.cs:** يستدعي `SaveManager.Save()` كل 60 ثانية (`autosaveIntervalSeconds`)، وأيضًا عند: `OnApplicationPause(true)` (خلفية الموبايل — يوازي "إخفاء التبويب" بالويب)، بعد كل عملية بناء ناجحة، بعد الإحياء.
- **CorruptionHandler.cs:** يبث `GameEvents.OnSaveCorrupted` → HUD يعرض إشعار "الحفظ تالف — بدأنا من جديد" (Toast/Panel قصير الأمد).
- **SaveMigrationService.cs:** يدعم ترقية من إصدارات أقدم من `SaveData` (v1→v2→v3 بنفس فلسفة الكود الأصلي: تعبئة قيم افتراضية للحقول الناقصة `normalize`).

---

## 16. واجهة المستخدم (HUD/UI)

مبدأ الفصل: **Views لا تُقرر شيئًا، Controllers تقرأ الحالة عبر Events وتُحدّث الـ Views فقط.**

| عنصر | ملاحظة |
|---|---|
| Health/Hunger/Thirst/Stamina/Temperature | 5 أشرطة، تتحدث عبر `OnSurvivalChanged` |
| Belt 1-6 | صف أيقونات سفلي، تمييز الفتحة النشطة |
| Inventory Panel (T) | Grid قابل للسحب |
| Crafting Panel | قائمة 5 وصفات + progress bar |
| Blueprint Indicator (Q) | شريط اختيار نوع البناء (Foundation/Wall/Doorway/Ceiling) |
| Interaction Prompt | نص عائم "[E] تخزين" فوق الهدف |
| Storage UI | لوحة مطابقة لـ Inventory مع نقل بين الاثنين |
| Cooking UI | مؤشر تقدم فوق الموقد |
| Repair/Upgrade Prompt | "[H] ترقية (يحتاج 300 حجر)" |
| Save Notification | Toast صغير أسفل يمين الشاشة |
| Corrupt Save Notification | Panel مركزي يظهر مرة واحدة عند الإقلاع الفاسد |

---

## 17. دعم أندرويد

- Build: **IL2CPP + ARM64** (متطلب Google Play الحالي، ويُلغي الحاجة لـ Capacitor/WebView كليًا).
- Virtual Joystick (يسار) + أزرار الفعل (يمين): Sprint(toggle)، Jump، Gather/Attack، Interact السياقي (نص الزر يتغير حسب الهدف تمامًا كـ prompt الديسكتوب)، Inventory، Blueprint، Belt row.
- Drag & drop مناسب للمس: منطقة "drop zone" أكبر من الأيقونة الفعلية (fat-finger tolerance).
- Autosave أقوى بسبب إغلاق مفاجئ: استدعاء الحفظ من `OnApplicationPause`/`OnApplicationQuit` كلاهما (وليس أحدهما فقط) لتغطية home-button وkill-by-OS.
- ميزانية أداء منخفض الفئة [ASSUMPTION مبدئي]: 30 FPS هدف أدنى، Draw calls < 150، Texture atlas للعناصر، LOD للأشجار/الصخور، Occlusion Culling مفعّل، لا Real-time shadows على كل الأضواء (نار المخيم = point light واحد بظل منخفض الدقة فقط).
- UI Scaling: Canvas Scaler (Scale With Screen Size) + Safe Area script لشاشات notch/punch-hole.
- Haptic feedback اختياري عند الجمع/البناء (`Handheld.Vibrate` أو Unity Mobile Notifications+Haptics package).
- Audio focus: إيقاف الموسيقى عند فقدان تركيز التطبيق (`OnApplicationFocus`).

---

## 18. خطة الاختبارات (توازي npm test)

| اختبار أصلي | معادل Unity | نوع |
|---|---|---|
| `tests/phase1.test.mjs` (30 اختبار: survival/crafting/gathering) | `SurvivalStatsTests.cs`, `CraftingSystemTests.cs`, `ResourceNodeTests.cs` | EditMode |
| `tests/save-system.test.ts` | `SaveManagerTests.cs`, `SaveMigrationTests.cs` | EditMode |
| `tests/phase2-save-v3.test.mjs` | `SaveDataV3CompatTests.cs` | EditMode |
| `tests/platform.test.ts` | `PlatformCapabilityTests.cs` | EditMode |
| `tests/phase2-touch-controls.test.mjs` | `TouchInputAdapterTests.cs` | PlayMode (Input Simulation) |
| `tests/phase2-update-checker.test.mjs` | لا معادل ضروري (خاص بويب/Capacitor) — يُستبدل بمنطق Play Store In-App Update لاحقًا إن رغب المستخدم |

**Acceptance Criteria صريحة (نموذج):**
- لا يفقد اللاعب موارد عند فشل الصناعة (تحقق قبل استهلاك).
- Corrupt save لا يسبب Exception غير معالج، ويُعاد `SaveData.Blank()`.
- Autosave يُستدعى كل 60 ثانية بالضبط (± tolerance فريم واحد) في اختبار PlayMode مع Time.timeScale متحكم به.
- التطبيق يحفظ عند `OnApplicationPause(true)`.
- الترقية Twig→Wood تفشل عند نقص `wood`، وتنجح فقط بتوفر 300 wood بالضبط.
- Inventory لا يتجاوز `stackLimit` لأي عنصر أبدًا (fuzz test بإضافات عشوائية).
- عقدة مورد لا تُحصد بعد `health<=0` حتى ينتهي `respawnTimeSeconds`.

---

## 19. Backlog تنفيذي (8 أسابيع)

| الأسبوع | المخرجات | الملفات الرئيسية | الاعتماديات | معيار القبول | الخطورة |
|---|---|---|---|---|---|
| 1 | Setup مشروع Unity/URP + حركة اللاعب + كاميرا + نظام تفاعل أساسي | `Bootstrap`, `PlayerController`, `PlayerCamera`, `IInteractable`, `InteractionController` | لا شيء | حركة WASD+جري+قفز تعمل، E يكتشف كائنًا تجريبيًا | منخفضة |
| 2 | Inventory + Belt + Gathering + عقد الموارد | `InventorySystem`, `ResourceNode`, `ResourceNodeDefinition` (SO ×5) | أسبوع 1 | جمع خشب/حجر يعمل، الحزام يحدّث فوريًا | منخفضة |
| 3 | Crafting (5 وصفات) + Survival Stats كاملة + HUD أساسي | `CraftingSystem`, `RecipeDatabase`, `SurvivalStats`, `HUDController` | أسبوع 2 | صناعة الفأس الحجري تعمل، أشرطة HUD تتحدث حيًا | متوسطة |
| 4 | Building (5 tiers+TC) + Storage Box + Cooking | `BuildingPlacer/Ghost/Instance/Upgrade/Repair`, `StorageBox`, `Campfire` | أسبوع 3 | بناء جدار Twig ثم ترقيته لـ Wood، تخزين/سحب من صندوق | عالية (فيزياء Placement) |
| 5 | Save/Load + Autosave + Corruption Recovery | `SaveManager`, `SaveSerializer`, `SaveMigrationService`, `CorruptionHandler`, `AutoSaveTimer` | أسبوع 4 (يحتاج بنية كل الأنظمة السابقة) | حفظ/تحميل كامل بلا فقد بيانات، حفظ تالف يُعاد بأمان | عالية |
| 6 | Day/Night + Weather + تحكم موبايل كامل | `TimeSystem`, `WeatherSystem`, `TouchInputAdapter`, Mobile UI | أسبوع 1 (input) + أسبوع 3 (HUD) | دورة يوم/ليل مرئية، مطر يخفض الحرارة، كل الحلقة تُلعب باللمس | متوسطة |
| 7 | اختبارات EditMode/PlayMode شاملة + تحسين أداء موبايل + Android Build | كل `*Tests.cs` | كل ما سبق | كل الاختبارات خضراء، 30 FPS على جهاز متوسط، APK يُبنى وتعمل | متوسطة |
| 8 | Vertical Slice Demo + إصلاح أعطال | — | كل ما سبق | لعبة قابلة للعب من البداية للنهاية على APK حقيقي بلا Crash | منخفضة-متوسطة |

---

## 20. المخاطر التقنية وتخفيفها

| الخطر | التخفيف |
|---|---|
| `js/game.js` غير مقروء بالكامل (2600+ سطر) قد يخفي منطقًا مهمًا | جلسة قراءة كاملة مخصصة قبل أسبوع 4 (البناء) وأسبوع 5 (الحفظ) تحديدًا، لأنهما الأكثر عرضة لمنطق legacy خفي |
| اختلاف فيزياء Three.js raycasting عن Unity Physics في وضع البناء | نموذج أولي (prototype) لنظام Placement في أسبوع 1-2 بمعزل عن باقي الأنظمة لاختبار الشعور مبكرًا |
| أداء منخفض على أجهزة أندرويد رخيصة | قياس مبكر (Profiler) من أسبوع 3، ميزانية Draw Calls/Batching من البداية وليس كتحسين لاحق |
| عدم تطابق "شعور" البقاء (game feel) رغم تطابق الأرقام | جلسة لعب مقارنة جنبًا إلى جنب مع نسخة الويب الأصلية بعد كل أسبوع رئيسي |
| نظام حفظ جديد قد يفقد بيانات في حالات حافة غير مختبرة | Fuzz testing لـ SaveMigrationService بمدخلات JSON عشوائية/تالفة عمدًا |

---

## 21. الافتراضات (Assumptions) — قائمة مجمّعة

1. [ASSUMPTION] زاوية الكاميرا (أول/ثالث شخص) — يحتاج تأكيد بصري من اللعبة الفعلية.
2. [ASSUMPTION] تفاصيل الموت/الإحياء الكاملة وفقدان/عدم فقدان العناصر عند الموت.
3. [ASSUMPTION] `cookTime` الدقيق عند الموقد (افترضنا 5 ثوانٍ).
4. [ASSUMPTION] عتبة بدء الليل بالضبط ضمن دورة الـ 800 ثانية.
5. [NEEDS VERIFICATION FROM REPO] تفاصيل `js/inventory/storage.js` الكاملة (حجم bag بالضبط).
6. [NEEDS VERIFICATION FROM REPO] تفاصيل قفل الأبواب وربطها بـ TC.
7. [NEEDS VERIFICATION FROM REPO] بيانات `berry_bush` وأي عقد موارد أخرى لم تُقرأ بالكامل من `resources.js`.
8. [NEEDS VERIFICATION FROM REPO] منطق `js/game.js` legacy الكامل للتفاعل بين الأنظمة.

---

## 22. نصائح عدم النقل الحرفي

- لا تُترجم `game.js` سطرًا-بسطر — أعد تصميمه كأنظمة منفصلة من البداية؛ استخدم أرقامه كمرجع فقط.
- لا تُقلّد بنية DOM/CSS لـ HUD — صمّم UGUI Canvas مستقلة تحترم قواعد Unity (Anchors, Safe Area) لا CSS flexbox.
- لا تنسخ آلية `localStorage` حرفيًا — استخدم `PlayerPrefs` أو ملف JSON في `Application.persistentDataPath` (الأخير أفضل لحجم بيانات أكبر مستقبلًا وأسهل تصحيحًا).
- احتفظ بنفس **الأرقام** (توازن اللعب) لكن أعد بناء **الآلية** (كيف تُحسب) بأسلوب Unity-idiomatic (Coroutines/Update بدل event loop ويب).

---

## 23. Snippets C# أولية إضافية

```csharp
public class GameManager : MonoBehaviour {
    public static GameManager Instance { get; private set; }
    [SerializeField] SurvivalConfigSO survivalConfig;
    void Awake() { if (Instance != null) { Destroy(gameObject); return; } Instance = this; DontDestroyOnLoad(gameObject); }
    void Start() { var data = SaveManager.Load(); GameEvents.RaiseGameLoaded(data); AutoSaveTimer.Start(survivalConfig.autosaveIntervalSeconds); }
}

public class PlayerController : MonoBehaviour {
    CharacterController controller;
    [SerializeField] float walkSpeed = 5f, sprintSpeed = 8f, jumpForce = 5f;
    Vector3 velocity;
    void Update() {
        var input = PlayerInput.MoveAxis;
        bool sprinting = PlayerInput.SprintHeld && StaminaSystem.CanSprint(Stats) && input.sqrMagnitude > 0.01f;
        float speed = sprinting ? sprintSpeed : walkSpeed;
        var move = (transform.forward * input.y + transform.right * input.x).normalized * speed;
        if (sprinting) StaminaSystem.DrainSprint(Stats, Time.deltaTime);
        controller.Move((move + velocity) * Time.deltaTime);
    }
}
```

(بقية الـ skeletons — `InventorySystem`, `CraftingSystem`, `SaveManager` — موضّحة كاملة في الأقسام 8، 9، 15 أعلاه.)

---

## 24. نتائج التحقق الكامل من `js/game.js` (2774 سطر) — تحديث بعد الفحص الشامل

تمت قراءة `js/game.js` كاملًا سطرًا-بسطر، بالإضافة إلى `js/inventory/storage.js` (107 سطر) و`js/world/resources.js` (133 سطر) كاملَين. فيما يلي حسم كل نقطة كانت معلّمة [NEEDS VERIFICATION FROM REPO] أو [ASSUMPTION] في النسخة الأولى من هذه الخطة.

### 24.1 زاوية الكاميرا — **محسومة** ✅
**[FROM REPO — game.js:470, 2031-2033, 2208-2218]** اللعبة **أول-شخص افتراضيًا** عبر `PointerLockControls` من Three.js. يوجد زر تبديل لوضع "third" (`state.viewMode`) يبدّل فقط بعرض `playerMesh` ويُزيح موضع الكاميرا مؤقتًا أثناء الرندر فقط (حيلة رندر، وليس كاميرا ثالث-شخص حقيقية بفيزياء منفصلة).
**قرار Unity:** ابنِ **First-Person كافتراضي** مع Cinemachine Virtual Camera، وأضِف خيار Third-Person كـ toggle اختياري (Phase 2) بنفس فكرة إزاحة الكاميرا خلف اللاعب — وليس أولوية لـ Phase 1.

### 24.2 الموت والإحياء — **محسومة بالكامل** ✅
**[FROM REPO — game.js:2640-2744]**
- الموت يحدث عند `health <= 0` (`triggerDeath()`، غير قابل للتكرار عبر `if (state.dead) return`).
- **رسالة السبب** تتغيّر حسب السبب: إشعاع≥100 / جوع=0 / عطش=0 / غير ذلك ("استنفدت قواك").
- شاشة موت تعرض عدّاد `deathCount` و`reviveCount`.
- **خياران للاعب، ونفس النتيجة تمامًا لكليهما (لا عقوبة تفاضلية):**
  1. `reviveWithAd()` — مشاهدة إعلان مكافأة (AdMob على APK حقيقي، أو عدّاد تنازلي محاكى 5 ثوانٍ على المتصفح) ثم `doRevive()`.
  2. `giveUpRespawn()` — إحياء فوري بلا إعلان، يستدعي **نفس** `doRevive()`.
- **`doRevive()` بالضبط:** health=100, hunger=80, thirst=80, radiation=0, stamina=100, temperature=90, bleeding=0. **الإحياء دائمًا عند نقطة الأصل (0,0,0)** — أي "المخيم الأساسي" هو مركز الخريطة حرفيًا، وليس آخر نقطة save أو respawn point منفصلة.
- **✅ لا يوجد فقدان لأي عنصر من المخزون عند الموت إطلاقًا** — `state.inventory` لا يُمسّ في أي من `triggerDeath`/`doRevive`/`giveUpRespawn`. هذا يبسّط تصميم Unity كثيرًا: لا حاجة لمنطق "خسارة غنائم عند الموت" في Phase 1.
- **قرار Unity:** `PlayerDeathController.cs` يطابق هذا تمامًا: `OnHealthZero → TriggerDeath(reason)` → UI شاشة موت بخيارين (Rewarded Ad / Respawn Now) كلاهما يستدعي `Revive()` بنفس القيم الثابتة أعلاه، وينقل اللاعب لـ `Vector3.zero` (أو نقطة Spawn محددة تصميميًا تعادلها).

### 24.3 نظام البناء — تصحيحات مهمة ⚠️
**[FROM REPO — game.js:41, 643-681, 760-835]**
1. **TC_RADIUS = 25 وحدة وليس 20** كما ورد خطأً في `BUILDING_SYSTEM.md` (المستند التسويقي/الوصفي كان غير دقيق). المصدر الموثوق هو `CONFIG.TC_RADIUS = 25` في `game.js`. **[تصحيح]** حدّث القسم 10 من هذه الخطة: نصف قطر TC = 25 وليس 20.
2. **الإصلاح (`repairStructure`) يستهلك 10% من تكلفة الـ tier الحالي (وليس تكلفة الترقية للـ tier التالي)** — أي `cost = BUILDING_TIERS[currentTier].cost`, و`needed = Math.ceil(amt * 0.1)`. **[تصحيح]** كان القسم 10 يفترض "10% من تكلفة الترقية" بشكل عام دون تحديد الأساس؛ الصحيح: 10% من تكلفة **بناء نفس المستوى الحالي** (مثال: جدار Stone تالف يُصلَح بـ 10% من تكلفة الوصول لـ Stone = 30 حجر، وليس 10% من تكلفة الترقية لـ Sheet Metal).
3. **إصلاح Twig مجاني دائمًا** (`if (tier !== 'twig')` يتخطى فحص الموارد بالكامل) — لأن Twig تكلفته `{}` أصلًا.
4. **شرط الدعم (Support/Stability):** أي قطعة غير Foundation تحتاج وجود Foundation أو Ceiling ضمن مسافة 0.5 وحدة أفقيًا (نفس الإحداثيات X/Z تقريبًا، بصرف النظر عن الارتفاع Y) — منطق بسيط جدًا وليس محاكاة استقرار فيزيائي حقيقي.
5. **الأبواب (`wooden_door`) تتطلب وضعها على `doorway` موجودة مسبقًا** ضمن مسافة 0.5 وحدة، وإلا يُرفض الوضع.
6. **لا يوجد أي قفل فعلي مطبَّق فعليًا على الأبواب رغم وجود عنصر `codelock` في `ITEMS_DATA`** — الباب يفتح/يُغلق بضغطة E فقط (`isOpen` toggle + دوران 90°)، بلا أي تحقق من ملكية أو رمز. `codelock` عنصر **معرَّف وغير مستخدم** (Phase 2 leftover). **[تصحيح]** ألغِ أي افتراض بوجود آلية قفل في Phase 1 من نسخة Unity؛ اعتبرها ميزة Phase 2 حقيقية جديدة وليست منقولة.
7. الاستقرار المعروض بالـ UI (`build-info`) هو **حساب تجميلي بسيط** (`100 - (Y-0.1)*10`, حد أدنى 20%) وليس محاكاة فيزيائية — لا داعي لنقله حرفيًا لـ Unity؛ يمكن استبداله بنظام استقرار حقيقي أبسط أو بنفس المؤشر التجميلي.

### 24.4 الجمع (Gathering) — تأكيد الحل النهائي لتعارض "×2" ✅
**[FROM REPO — game.js:1660-1696, resources.js:58-77]**
- كل ضغطة LMB/F تُنقص `node.health -= 1` بالضبط (وليس بحسب قوة الأداة) — أي عدد الضربات لإفناء العقدة = `NODE_TYPES[type].health` دائمًا (5 ضربات للشجرة، 6 للصخر/الحديد/الكبريت، 2 للقنب/التوت).
- **الأداة الصحيحة تضاعف الكمية المُستلَمة بكل ضربة (×2 عبر `hitsForYield`)**، وليس عدد الضربات. **هذا يحسم التعارض المذكور في القسم 2 سابقًا بشكل قاطع:** "axe ×2 wood" = بمعدات صحيحة تحصل ضعف الخشب لكل ضربة، وعدد الضربات لإفناء الشجرة ثابت (5) بغضّ النظر عن الأداة.
- الستامينا تُستهلك (`gatherDrain=4`) **فقط عند وجود `NODE_TYPES` تعريف صالح للنوع** (أي ليس عند نهب `crate` مثلًا، الذي له مساره الخاص عبر E).
- **⚠️ اكتشاف مهم:** `scheduleRespawn` يُستدعى فقط لأنواع: `tree, rock, iron, sulfur, barrel`. **`hemp` (القنب) و`berry_bush` (شجيرة التوت) لا تُعاد أبدًا بعد الحصاد** رغم أن `NODE_TYPES.hemp.respawnTime=90` و`NODE_TYPES.berry_bush.respawnTime=100` معرَّفتان في `resources.js` — وهذا يبدو **عدم تطابق (على الأرجح خطأ سهو غير مقصود في `game.js` legacy، وليس قرار تصميم متعمد)**، لأن PRD لا يذكر استثناءً لهما، والقيم موجودة بالكود لكنها غير مُفعَّلة. **[FROM REPO — قرار مطلوب منك]:** هل تريد نسخة Unity أن **تُصلح** هذا الخلل (تُفعّل respawn للقنب والتوت مطابقةً لـ `resources.js`) أم **تنقل نفس السلوك الحالي** (بلا respawn لهما) حفاظًا على توازن اللعبة الحالي؟ الافتراض الافتراضي المقترح: **أصلحها في Unity** (فعّل الـ respawn لكليهما) لأن البيانات المُعدّة مسبقًا (`respawnTime`) تشير بوضوح لنيّة تصميمية لم تُنفَّذ بالكامل، وهذا أقرب لروح PRD (§4.3 "صحة/عائد/أداة/زمن respawn من الإعدادات" — أي كل العقد من المفترض أن تُعيد التوليد).

### 24.5 الطبخ (Cooking) — **آلية أبسط بكثير من المفترض** ⚠️
**[FROM REPO — game.js:1152-1188]**
- **لا يوجد `craftTime`/تأخير زمني إطلاقًا.** الطبخ فوري: ضغطة E واحدة عند وجود `raw_meat` في المخزون بالقرب من موقد نار (ضمن `INTERACT_DISTANCE`) → تستهلك **1 raw_meat** وتمنح **1 cooked_meat** فورًا + **+5 مكافأة حرارة مباشرة** (`state.stats.temperature += 5`, حد أقصى 100).
- **لا يوجد شرط "وقود" (fuel) أو "نار مشتعلة" فعليًا** — أي موقد نار مبني (placed) قابل للطبخ عليه دائمًا وبلا قيد اشتعال.
- **[تصحيح]** القسم 11 السابق افترض "5 ثوانٍ لكل قطعة" كخط أساس مؤقت — هذا **غير صحيح وفق الكود الفعلي**؛ الصحيح: **تحويل فوري بلا مؤقت، بمكافأة دفء ثابتة +5**. حدّث `CookingSystem.cs` في Unity ليطابق: `Cook()` synchronous، بلا coroutine انتظار، مع استدعاء `SurvivalStats.AddTemperature(5)`.

### 24.6 المخزون والحقيبة (`storage.js`) — **محسومة بالكامل** ✅
**[FROM REPO — storage.js كامل، 107 سطر]**
- `StorageInventory` هي فئة **مستقلة تمامًا عن player/UI**، تُستخدم كمحرك أساس لكل من: مخزون اللاعب، صناديق التخزين، وربما بيانات أخرى — تصميم نظيف جدًا بالفعل ويُنصح Unity بمحاكاته حرفيًا:
  - `add(id, amount)` يُرجع **الكمية المُضافة فعليًا فقط** (يُقصّ عند بلوغ `stackLimit` من `getStackLimit()`)، ولا يرمي خطأ ولا يفقد الباقي (لكن أيضًا لا يُعيد الفائض تلقائيًا — المتصل مسؤول عن التعامل مع الفرق بين المطلوب والمُضاف الفعلي).
  - `remove`/`consume`: `consume` هو **all-or-nothing** فعليًا (يتحقق `has()` أولًا قبل `remove()`).
  - `transferTo(other, id, amount)`: **يُعيد الفائض لنفسه تلقائيًا** إذا لم يستطع الهدف استيعاب الكل (`if (added < removed) this.add(...)`) — **هذا بالضبط الحل النهائي والمضمون لقاعدة "لا فقدان عناصر عند التخزين/النقل"** المطلوبة في معايير القبول (القسم 17). Unity's `InventorySystem.TransferTo()` يجب أن يطابق هذا حرفيًا.
  - **لا يوجد مفهوم "slots" منفصلة بحدود عدد ثابت في `StorageInventory`** — إنها قائمة ديناميكية `{id, count}[]` بلا حد لعدد الأنواع المختلفة (الحد الوحيد هو `stackLimit` **لكل نوع عنصر**، وليس عدد الفتحات الكلي). **[تصحيح مهم]** القسم 8/11 من الخطة افترضا "12 stack" كحدّ لعدد slots في صندوق التخزين — هذا **رقم وصفي فقط من نص `wooden_box.desc`** ("Stores 12 stacks")، لكن **لا يوجد أي تطبيق فعلي في `StorageInventory` أو `game.js` يفرض هذا الحد الرقمي فعليًا** — الصندوق الفعلي في اللعبة الحالية **بلا حد لعدد الأنواع المخزَّنة**، فقط محدود بـ `stackLimit` لكل نوع.
  **قرار Unity:** لديك خياران صريحان يجب اتخاذ قرار بشأنهما:
  - (أ) **طابق السلوك الفعلي الحالي** (بلا حد لعدد slots، فقط stackLimit لكل نوع) — أبسط وأوفى للكود الفعلي.
  - (ب) **طبّق فعليًا حد 12 slot** كما يوحي النص الوصفي — أقرب لتوقع لاعب Rust التقليدي وأسهل توازنًا للعبة.
  **التوصية:** (ب) لنسخة Unity، لأن نص PRD/الوصف يعد اللاعب بحد 12 صراحة، وهذا على الأرجح **دَين تقني (tech debt)** في النسخة الأصلية وليس قرار تصميم مقصود — لكن وثّق هذا القرار بوضوح في الـ backlog كخيار تصميمي وليس نقلًا حرفيًا.

### 24.7 سجل العناصر الكامل (`ITEMS_DATA` في `game.js`) — أوسع بكثير من `FOOD_DEFS`/`PHASE1_RECIPES` وحدهما
**[FROM REPO — game.js:99-151]** يوجد سجل عناصر **كامل وأوسع بكثير** من الوصفات الخمس المطبَّقة فعليًا في `PHASE1_RECIPES`، يتضمن عناصر **معرَّفة لكنها Phase 2/غير مطبَّقة فعليًا حاليًا في منطق اللعب**:
- أدوات إضافية: `stone_pickaxe`, `hammer` (**مُستخدم فعليًا** للبناء/الترقية عبر LMB عند تجهيزه)، `torch` (له `recipe: {wood:50, lgf:1}` مختلف عن `PHASE1_RECIPES.torch` الذي يطلب `{wood:20, cloth:5}` — **[تعارض بين سجلّين مختلفين لنفس العنصر داخل نفس الملف!]** `ITEMS_DATA.torch.recipe` غير مُستخدم فعليًا في منطق الصناعة الفعلي؛ `PHASE1_RECIPES` (من `recipes.js`) هو المصدر الفعلي المُطبَّق. اعتبر `ITEMS_DATA[x].recipe` بيانات وصفية قديمة/زائدة غير مرتبطة بمنطق craft الفعلي.
- أسلحة: `spear`, `machete`, `bow`, `pistol`, `ak47` — **معرَّفة بالكامل في السجل لكن لا يوجد أي كود craft أو استخدام قتالي فعلي لها في `game.js`** (لا `craft()` تستدعيها، لا سلاح نيراني فعلي). هذه **بيانات Phase 2 مستقبلية غير مفعَّلة** — تتماشى مع PRD الذي يستثني صراحة "أسلحة نارية متقدمة" كـ Non-Goal. **مهم لـ Unity:** لا تنقل هذه كأنها ميزات جاهزة؛ هي مجرد تعريفات بيانات "جاهزة للمستقبل" بلا منطق خلفها.
- `furnace` (فرن الصهر): معرَّف بالبيانات (`recipe: {stone:200, wood:100, lgf:10}`) **لكن بلا أي منطق صهر (smelting) فعلي مطبَّق في `game.js`** — يتماشى مع PRD §Milestone 2.2 ("فرن + صهر" مخطط لـ Phase 2). Unity: هذا Phase 2 حقيقي، ابدأ من الصفر بمنطق smelting جديد، البيانات فقط جاهزة كمرجع أسماء/تكلفة.
- `codelock`, `lock`: معرَّفة بلا منطق (انظر 24.3 نقطة 6).
- **NPCs قتالية موجودة فعليًا ومُفعَّلة جزئيًا! [اكتشاف جديد لم يكن موثقًا سابقًا]** كلاس `NPC` كامل (game.js:350-435) لثلاثة أنواع: `wolf` (health 50)، `bear` (health 120)، `scientist` (health 80، بندقية ديكورية + مدى agro أكبر 30 وحدة). لكل نوع: agro range، attack range، فترة انتظار بين الهجمات، ضرر ثابت (bear=20, scientist=8, wolf=12) عبر `DamageSystem.applyDamage(..., DamageTypes.ANIMAL)`، فرصة 25% نزيف عند هجوم wolf/bear. عند الموت: يُسقط لوت ثابت (`{wolf:{cloth:10,leather:5}}`, `{bear:{cloth:15,leather:10}}`, `{scientist:{scrap:15,frag:10}}`) تلقائيًا بمجرد `health<=0` **وليس عبر E** (نقطة كانت من "الأسئلة المفتوحة" في PRD §9.2: "هل الذئاب تسقط لحم نيء مباشرة أم عبر ذبح E؟" — **الجواب من الكود الفعلي: مباشرة تلقائيًا عند الموت، ليس عبر E**، لكن هذا **لا يُسقط `raw_meat` أصلًا حاليًا** (يُسقط cloth/leather/scrap/frag فقط) — أي أن ربط الحيوانات باللحم النيء **لم يُنفَّذ بعد فعليًا** رغم وجود هيكل NPC كامل.
  **[تصحيح مهم للقسم 2 والقسم 18]** Combat & AI (PRD §4.10) ليست "صفرًا من الأساس" في التصميم بل **نموذج أولي (prototype) موجود فعليًا وغير مكتمل**: حركة مطاردة بسيطة (لا pathfinding حقيقي، فقط `lookAt` + تحرك خطي مباشر نحو اللاعب)، هجوم بمسافة/تبريد زمني، موت وإسقاط لوت، تلاشي بصري (`scale *= 0.9` كل 30ms). **توصية Unity:** استخدم هذا كمرجع سلوك أساسي حرفي لـ `EnemyAI.cs` في Phase 2 (نفس أرقام الصحة/الضرر/مدى العدائية)، لكن استبدل `lookAt`+حركة خطية مباشرة بـ NavMesh Agent حقيقي لتفادي الاصطدامات والعوائق.

### 24.8 ثوابت عالمية إضافية من `CONFIG` — **[FROM REPO — game.js:26-42]**
هذه لم تكن موثّقة سابقًا وتفيد Unity في ضبط الحجم/الحركة بدقة أكبر (كمرجع نسبي فقط، ليست قابلة للنقل 1:1 لأن فيزياء Unity مختلفة):
```
WORLD_SIZE: 400        (حجم العالم المربع بالوحدات)
TREE_COUNT: 70, ROCK_COUNT: 40, SULFUR_COUNT: 25, BARREL_COUNT: 30
HEMP_COUNT: 25, BERRY_COUNT: 20   (مُضافة ديناميكيًا إن لم تُحدَّد)
BUILD_DISTANCE: 7      (أقصى مسافة لوضع بناء)
INTERACT_DISTANCE: 5.0 (أقصى مسافة لتفعيل E)
PLAYER_SPEED: 95, FRICTION: 10.0, GRAVITY: 26.0, JUMP_FORCE: 9.5, PLAYER_RADIUS: 0.8
RAD_ZONE_RADIUS: 25    (نصف قطر منطقة الإشعاع حول Monument)
TC_RADIUS: 25          (يؤكد تصحيح 24.3.1)
```
**ملاحظة:** `PLAYER_SPEED: 95` رقم كبير جدًا ظاهريًا لأنه يُضرب لاحقًا بمعامل احتكاك/دلتا-وقت صغير جدًا داخل حلقة الفيزياء المخصصة لـ Three.js (نمط شائع في محركات custom) — **لا تنقل الرقم حرفيًا لـ Unity**؛ اضبط `walkSpeed`/`sprintSpeed` بالتجربة المباشرة داخل Unity (بوحدات m/s منطقية، مثل 4-5 m/s مشيًا و7-8 m/s جريًا) بدل محاولة مطابقة الرقم الخام.

### 24.9 جدول ملخّص: كل الافتراضات السابقة بعد الحسم

| البند | الحالة سابقًا | الحسم النهائي |
|---|---|---|
| زاوية الكاميرا | [ASSUMPTION] | ✅ أول-شخص افتراضيًا (PointerLockControls)، ثالث-شخص كتبديل بصري بسيط |
| الموت/الإحياء | [NEEDS VERIFICATION] | ✅ لا فقدان عناصر، إحياء كامل الإحصائيات عند نقطة الأصل (0,0,0)، مسار إعلان أو مسار مجاني بنفس النتيجة |
| تفاصيل `storage.js` | [NEEDS VERIFICATION] | ✅ قائمة ديناميكية بلا حد slots فعلي؛ حد 12 هو نصّي فقط غير مُطبَّق — قرار تصميمي مطلوب لـ Unity |
| قفل الأبواب/TC | [NEEDS VERIFICATION] | ✅ لا يوجد قفل فعلي مطلقًا؛ `codelock` عنصر معرَّف وغير مستخدم |
| بيانات `berry_bush`/عقد أخرى | [NEEDS VERIFICATION] | ✅ كل عقد `NODE_TYPES` مؤكدة بالكامل؛ اكتُشف عدم تفعيل respawn لـ hemp/berry_bush رغم وجود القيم |
| منطق `game.js` الكامل | [NEEDS VERIFICATION] | ✅ مقروء بالكامل؛ يضيف: NPCs قتالية جزئية التفعيل، سجل عناصر Phase 2 غير مفعّل، طبخ فوري بلا وقت، TC_RADIUS=25 |
| `cookTime` | [ASSUMPTION: 5 ثوانٍ] | ❌ **خطأ** — الطبخ فوري بلا مؤقت إطلاقًا |
| نصف قطر TC | 20 (من BUILDING_SYSTEM.md) | ❌ **خطأ في المستند الأصلي** — الكود الفعلي 25 |
| أساس تكلفة الإصلاح | "10% من تكلفة الترقية" | ❌ **تصحيح** — 10% من تكلفة **نفس المستوى الحالي**، وTwig مجاني دومًا |

---

*نهاية الوثيقة (نسخة مُحدَّثة بعد قراءة `js/game.js` كاملًا). جميع الأرقام المعلّمة [FROM REPO] مأخوذة حرفيًا من الملفات المذكورة أعلاه. النقاط المتبقية التي تحتاج **قرارًا من المالك** (وليس تحققًا تقنيًا فقط) هي: (أ) هل يُصلَح عدم-respawn القنب/التوت في Unity أم يُنقل كما هو؟ (ب) هل يُطبَّق حد 12 slot فعليًا لصندوق التخزين أم يبقى بلا حد كالأصل؟*
