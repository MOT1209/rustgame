# خطة الباقي — Rustgame

> **الحالة (2026-09-25):** ✅ محاور 1–5 · ✅ M1 طبقة المنصات · ✅ M2 سطح المكتب `.exe`
> **البوابة最后一次:** 77/77 اختبار · `typecheck` 0 أخطاء · `build` ناجح · `.exe` مبني ومُشغَّل
> **المتبقي:** M3 (سير عمل GitHub) · رفع فرع الأداء · تحقق المتصفح

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

## 🚨 P0 — خطر فقدان بيانات (افعل أولاً)

### رفع فرع الأداء `perf/phase2`

**الحالة:** العمل موجود على القرص لكنه **غير مدفوع** لـ GitHub + 7 ملفات غير محفوظة.
**.gitignore لا يحمي worktree** — `git clean -fdx` في المستودع قد يمسح `rust-game-perf/`.

```bash
cd "C:\Users\aihmo\alle folder von code\rust-game-perf"
git add -A && git commit -m "wip(perf): frame-stats + perf overlay + benchmark scenarios"
git push -u origin perf/phase2
```

**قبل الحذف:** احذف `rust-game-base` و `rust-game-perf` عبر `git worktree remove`
(لا `rmdir` — يحطّم روابط git).

### خريطة الـ worktrees (ليست نسخاً منفصلة)

```
rust-game         → main         → عمل الإنتاج (مدفوع)
rust-game-perf    → perf/phase2  → عمل الأداء (غير مدفوع ⚠️)
rust-game-base    → detached     → خط أساس نظيف للمقارنة
```

---

## M3 — سير عمل GitHub (CI)

### المهام
1. `.github/workflows/ci.yml` — على `push`/`pull_request` إلى `main`:
   - `actions/checkout@v4` · `actions/setup-node@v5` (Node 24, cache npm)
   - `npm ci` → `npm run typecheck` → `npm test` → `npm run build`
   - رفع `www/` كـ artifact (لمعاينة سريعة)
2. **بلا أسرار** — لا APK ولا Android SDK في CI (يحتاج JDK + SDK ≈ ثقيل).
3. (اختياري لاحقاً) workflow منفصل لـ `windows-latest` يبني الـ `.exe` عند tag.

### DoD
- [ ] شارة CI خضراء على `main` بعد أول push.
- [ ] `npm ci` ينجح من الصفر (بلا `node_modules`).
- [ ] فشل الاختبار = workflow أحمر (لا تمرير صامت).

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
| 2.1 | قتال حيواني + نهب بـ E | مواجهة ذئب قابلة للربح بالأدوات الحجرية + ضمادة واحدة |
| 2.2 | فرن صهر + تلف طعام | خام → fragments · اللحم يفسد بعد N |
| 2.3 | خريطة + بوصلة + POI | تحديد المعالم والبحيرة |
| 2.4 | موبايل: زر E سياقي + أداء | اللعب باللمس كامل الحلقة |
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
