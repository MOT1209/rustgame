# خطة الباقي — Rustgame Production-Ready

> **الحالة الحالية:** ✅ المحور 1 (Vite & Local Deps) · ✅ المحور 2 (TypeScript) · ✅ المحور 3 (Vitest)
> هذا الملف يوثّق المتبقي من خطة الإنتاجية بعد إغلاق المحاور 1–3.

---

## المحور 4 — معالجة الحفظ (Save/Load)

الملف الأساسي: `js/save/save-system.js` (حالياً: migrate v1→v2، لا يُسقط أبداً على أي إدخال، autosaver جاهز).

### المهام
1. **تحويل `save-system.js` → `save-system.ts`**
   - types رسمية في `js/types/game.ts`: `SaveGame` (شكل الحفظ الكامل) و `SaveStorage` (واجهة `getItem/setItem`).
   - استبدال الـ JSDoc الموجود بتوسيد حقيقي؛ إزالة `any` في `blank()`.
2. **تخزين A/B (شفّان متناوب)** لمقاومة تلف التخزين:
   - `write(storage, key, save)` يكتب في الشق غير المستخدم (`key:a` / `key:b`) ثم يحدّد الشق الأحدث.
   - `read(storage, key)` يجرّب الشقين + المفتاح القديم (`key` مباشرةً) — **توافق خلفي** مع الحفظ الحالي بلا ترحيل إجباري.
   - الأحدث زمنياً يفوز؛ الشق التالف يُتجاهل تلقائياً.
3. **تمييز أخطاء الكوتا**: التقاط `QuotaExceededError` من `storage.setItem` وتسجيله في `SaveSystem.lastWriteError` (للعرض في الواجهة لاحقاً). الواجهة الحالية `write(): boolean` تبقى كما هي.
4. **اختبارات Vitest جديدة**:
   - backend يرمي كوتا عند `setItem` → `write === false` و`lastWriteError` محدَّد.
   - شق رئيسي تالف + شق سليم → `read` يسترجع السليم.
   - حفظ بالمفتاح القديم (بدون شقّين) → يُقرأ بنجاح.
   - autosaver: `markDirty` + `flush` بـ fake timers (`vi.useFakeTimers`).

### القيود
- **صفر تغيير في الأرقام**: `autosaveIntervalMs = 60000` وبقية `SURVIVAL_CONFIG` كما هي.
- لا DOM/THREE داخل الوحدة (backend يُحقن كما اليوم).
- خضراء قبل الإغلاق: `npm test` + `npm run typecheck` + `npm run build`.

### DoD
- [ ] `save-system.ts` موجود و`save-system.js` محذوف، صفر بقايا استيراد `.js` قديم.
- [ ] اختبارات التعافي من التلف + الكوتا + التوافق الخلفي خضراء.
- [ ] كل الاختبارات الحالية (31+) خضراء دون أي تعديل في المعادلات.

---

## المحور 5 — التوثيق (Documentation)

### المهام
1. **`README.md`** (الحالي: سطر واحد `# rustgame`) يشمل:
   - المتطلبات (Node 24+, npm) والأوامر: `npm run dev` / `build` / `preview` / `test` / `typecheck` / `cap:sync`.
   - بنية المشروع (`js/core|player|inventory|crafting|world|interaction|save|input|ui|types`, `public/`, `www/`).
   - ملاحظة Capacitor: `webDir = www` ويُبنى عبر `npm run build`.
   - ملاحظة Service Worker: الكاش `rust-game-v3` مع مسارات نسبية.
2. **توثيق الأنظمة**: جدول للوحدات الرئيسية ومسؤولياتها (مرجع سريع لكل نظام: survival / damage / stamina / save …).
3. **دليل الاختبارات**: تشغيلها، أين تُضاف اختبارات جديدة، نمط `assert` داخل vitest.
4. **CHANGELOG مختصر** لتغييرات المحاور 1–4.

### DoD
- [ ] README يكفي لمطوّر جديد لتشغيل المشروع من الصفر.
- [ ] كل الأوامر الموثقة مُختبرة فعلياً.

---

## ملاحظات وقرارات مفتوحة

| البند | التفاصيل |
|---|---|
| `npx cap sync android` | **لم يُختبر** — مجلد `android/` غير موجود في المستودع (يُنشَأ لاحقاً عبر `npx cap add android`). |
| `js/game.js` | مستثنى من `tsconfig` (حجمه) — تدريجه تدريجياً اختياري لاحقاً. |
| npm audit | 3 تحذيرات moderate (موجودة مسبقاً) — تُراجع عند الراحة. |
| تحذير build | `<script src="js/update-checker.js">` غير bundled — **غير حرج**: الملف في `public/` ويُنسخ كما هو. |
| تعديلات غير مقنّنة | `js/inventory/storage.js`, `js/ui/hud.js`, `js/world/weather.js` عليها تغييرات من جلسة سابقة — راجعها قبل ربطها بأي محور لاحق. |
| تحقق المتصفح | بعد أي محور: فحص فعلي في المتصفح (skill: `browser-game-verification`). |

---

## أوامر التحقق السريعة (قبل أي دفع)

```bash
npm test          # vitest — 31+ اختبار
npm run typecheck # tsc --noEmit — 0 أخطاء
npm run build     # vite build → www/
```
