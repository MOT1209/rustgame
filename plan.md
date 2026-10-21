# خطة الباقي — Rustgame

> **الحالة (2026-10-20):** ✅ محاور 1–5 · ✅ M1 طبقة المنصات · ✅ M2 سطح المكتب `.exe`
> ✅ M3 سير عمل GitHub · ✅ فرع الأداء مدفوع · ✅ منفذ Unity يُصرَّف ويُختبَر
> **البوابة الأخيرة:** 83/83 اختبار · `typecheck` 0 أخطاء · `build` ناجح · Unity: 36/36 اختبار EditMode
> **المتبقي:** تحقق المتصفح (يدوياً) · P2 قياس الأداء · P3 ميزات Phase 2 · تثبيت Unity 6

---

## ✅ المُنجز

| المحور | الحالة | الدليل |
|---|---|---|
| 1 — Vite & local deps | ✅ | بناء بلا CDN |
| 2 — TypeScript | ✅ | `js/core`, `js/player`, `js/save`, `js/types` |
| 3 — Vitest | ✅ | 6 ملفات اختبار |
| 4 — Save/Load (A/B + كوتا) | ✅ | `js/save/save-system.ts` |
| 4b — Save v3 (نار + أبواب) | ✅ | `SAVE_VERSION = 3` |
| 5 — التوثيق | ✅ | `README.md` |
| M1 — طبقة المنصات | ✅ | `js/core/platform.ts` + 11 اختباراً |
| M2 — سطح مكتب `.exe` | ✅ | `electron/main.cjs` + `preload.cjs` |
| M2b — إصلاح ESM | ✅ | `main.js → main.cjs` |

### المنصات الثلاث (كود واحد، 3 أوضاع)

| المنصة | المخرج | الأمر |
|---|---|---|
| 🌐 ويب | `www/` → Vercel | `npm run build` |
| 📱 هاتف | مشروع `android/` | `npm run cap:sync` |
| 🖥️ كمبيوتر | `dist/*.exe` | `npm run electron:dist` |

**مصدر واحد للحقيقة:** `js/core/platform.ts` — وضع `auto | phone | desktop` محفوظ في
`localStorage` (تفضيل جهاز، **ليس** في ملف الحفظ). الافتراضي: APK→هاتف، Electron→كمبيوتر، الويب→كشف تلقائي.
المستخدم يختار يدوياً من شاشة البداية.

---

## ✅ P0 — خطر فقدان بيانات (محسوم 2026-10-20)

### رفع فرع الأداء `perf/phase2`

**الحالة:** ✅ **محسوم** — الفرع مدفوع على GitHub (`c542550` = `origin/perf/phase2`)،
والـ worktrees القديمة (`rust-game-perf` / `rust-game-base`) لم تعد موجودة على القرص
فلا يوجد عمل غير محفوظ. ملفات الأداء (`js/core/perf-stats.ts`، `js/dev/bench-scenarios.js`،
`js/dev/perf-monitor.js`، `tests/perf-stats.test.ts`) كلها داخل ذلك الـ commit.

> ملاحظة: `perf/phase2` مبني على `main` **قديم** (قبل ترحيل TypeScript)، فدمجه
> يحتاج rebase أولاً — لا تُدمجه نظيفاً بحالة merge عادية.

```bash
cd "C:\Users\aihmo\alle folder von code\rust-game"
git rebase main perf/phase2   # أو cherry-pick c542550 على main
```

> ⚠️ `perf/phase2` لا يزال **غير مدمج** في `main` — قياس P2 يحتاج خط أساس
> (`main`) مقابل بعد التحسين (`perf/phase2`).

### خريطة الـ worktrees (ليست نسخاً منفصلة)

```
rust-game         → main         → عمل الإنتاج (مدفوع)
rust-game-perf    → perf/phase2  → عمل الأداء (غير مدفوع ⚠️)
rust-game-base    → detached     → خط أساس نظيف للمقارنة
```

---

## ✅ M3 — سير عمل GitHub (CI)

**الحالة:** ✅ أُضيف `.github/workflows/ci.yml` (2026-10-20).

### المهام
1. ✅ `.github/workflows/ci.yml` — على `push`/`pull_request` إلى `main`:
   - `actions/checkout@v4` · `actions/setup-node@v5` (Node 24, cache npm)
   - `npm ci` → `npm run typecheck` → `npm test` → `npm run build`
   - رفع `www/` كـ artifact (لمعاينة سريعة)
2. ✅ بلا أسرار — لا APK ولا Android SDK في CI (يحتاج JDK + SDK ≈ ثقيل).
3. (اختياري لاحقاً) workflow منفصل لـ `windows-latest` يبني الـ `.exe` عند tag.
4. (اختياري لاحقاً) **اختبارات Unity في CI** عبر `game-ci/unity-test-runner` —
   تحتاج سرّ `UNITY_LICENSE` (رخصة شخصية)، فتُؤجَّل.

### DoD
- [x] ملف workflow موجود ويُدفع على `main`.
- [ ] شارة CI خضراء بعد أول push (يتحقق عند أول تشغيل على GitHub).
- [x] `npm ci` ينجح محلياً (بلا `node_modules` نظيف — تحقّق عند أول تشغيل).
- [x] فشل الاختبار = workflow أحمر (لا تمرير صامت: لا `continue-on-error`).

---

## P1 — تحقق المتصفح (معلّق)

**العائق:** أتمتة المتصفح معطّلة في بيئة العمل — `localhost` لا يُوصَل من عمليات المتصفح
(لا proxy في البيئة) والـ daemon يتجمد. `agent-browser` و Playwright كلاهما عالق.

**ما تم:** تحقق حتمي بديل — كل موارد `www/` (8 ملفات) ترجع `HTTP 200`، والحزمة تحوي
المنطق المطلوب بعد فحص الـ markers.

**لإتمامه على جهازك:**
```bash
npm run preview        # ثم افتح http://localhost:4173
```
1. كونسول نظيف (0 أخطاء)؟ 2. زر البدء يعمل؟ 3. بدّل **[هاتف/كمبيوتر]** — هل تتغيّر
الأزرار؟ 4. احفظ + أعد التحميل — هل تعود الحالة؟

**بلا أداة تلقائية:** افتح كونسول المتصفح وتحقق من:
```js
__rustGame.snapshot()   // device, runtime, day, structures…
```

---

## P2 — تعرف الأرقام (Performance)

`rust-game-perf` يضيف: `frame-stats` + طبقة قياس + سيناريوهات benchmark.
الاستخدام المقصود: `rust-game-base` = خط أساس، `rust-game-perf` = بعد التحسين.
القاعدة: **لا تعديل في `SURVIVAL_CONFIG` قبل قياس** — اقرأ `game-performance` skill.

---

## P3 — Phase 2 (من `PRD.md` §7)

| # | مُسلَّم | شرط القبول |
|---|---|---|
| 2.1 | قتال حيواني + نهب بـ E ✅ | ذئب (50 HP) يموت بـ3 ضربات بأداة حجرية وبـ10 باليد، والجثة تُنهب بـE وتحتوي **ضمادة واحدة** — `js/world/animals.ts` + `tests/animals.test.ts` (12 اختبار) |
| 2.2 | فرن صهر ✅ · تلف طعام ✅ | صهر عند النار: 1 حديد + 2 خشب → 1 fragment في 8 ثوانٍ (`js/world/smelting.js`) · اللحم/التوت يفسد (خام 240ث، مطبوخ 600ث، توت 180ث) ويؤكل مسموماً (-15HP) — ساعة التلف محفوظة مع الحفظ (**v4**) `js/inventory/spoilage.js` |
| 2.3 | خريطة + بوصلة + POI ✅ | بوصلة علوية بسهم/اتجاه/مسافة لأقرب نصب + خريطة مصغّرة دوّارة (اللاعب في الوسط) — `js/world/pois.js` (14 اختبار) + `hud.js` |
| 2.4 | موبايل: زر E سياقي ✅ | زر تفاعل سياقي على اللمس: يعرض ما سيفعله E الآن ("Open storage box") ويختفي بلا هدف — `js/input/contextual-action.js` + `setActionButton()` + CSS pill (10 اختبارات) |
| 2.5 | QA شامل + 1.2.0 | CI أخضر + buildNumber جديد |

---

## قرارات مفتوحة (من `PRD.md` §9)

1. فتحات حفظ متعددة في 2.x أم لاحقاً؟
2. الذئاب تسقط لحم نيء مباشرة أم عبر ذبح بـ E؟ (المقترح: E)
3. stack الخشب 1000 — يُخفَّض لزيادة التحدي؟
4. Electron (225MB) أم Tauri (~10MB) لسطح المكتب؟ — **الأول منفَّذ**؛ التحويل لاحقاً إن لزم حجم أصغر.
5. توقّع خلل بالتوازي: `eaedba0` ظهر من جلسة أخرى أثناء عملي — **يلزم تنسيق قبل أي تعديل مشترك**.

---

## ملاحظات تقنية قائمة

| البند | التفاصيل |
|---|---|
| `js/game.js` | 2738 سطر، مستثنى من `tsconfig` — **لا تضف منطقاً جديداً**؛ استخرج وحدة. |
| `type: module` | `electron/*.cjs` **إلزامي** — `require()` يفشل في ESM. لا تعُد لExtension `.js`. |
| بناء `.exe` | ~5 دقائق (NSIS + محمولة). شغّله في الخلفية لا في مقدمة الطرفية. |
| `npm audit` | 3 تحذيرات moderate (سابقة) + تحذيرات deprecation من electron-builder. |
| `dist/` و `www/` | مُتجاهَلان في git — لا تحاول رفعهما. |
| مصدر الهوية | `public/version.json` → `scripts/sync-version.mjs` يوزّعها على `package.json` + `build.gradle` + electron-builder. |

---

## أوامر التحقق (قبل أي push)

```bash
npm test           # 77/77
npm run typecheck  # 0 أخطاء
npm run build      # → www/
npm run electron:dist   # اختياري: ~5 دقائق
```
