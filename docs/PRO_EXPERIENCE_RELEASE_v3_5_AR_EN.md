# Oman Earth Intelligence v3.5 — Pro Experience

## ملخص الإصدار

نسخة مطوّرة لواجهة المشروع تشمل تحسينات التصميم، تجربة المستخدم، سهولة الوصول، والتحكم في تحميل الخريطة والمجسم. **لم تُعدّل بيانات NASA ولا المعادلات العلمية الأصلية.** لا تدّعي النسخة إثبات صحة جميع الإحداثيات أو جميع حالات NASA قبل اختبارها على الموقع المنشور.

### التحسينات المنفذة

1. **Premium dashboard** — تحديث مسافات وتدرجات وعناصر الواجهة؛ ترويسة ثابتة، عرض أقوى للعناوين وبطاقات التحليل، وتحسين واضح لواجهة الهواتف الصغيرة.
2. **Scientific context strip** — يعرض الموقع المحدد، المتغير، الفترة، وحالة تحميل مصدر البيانات بصورة حقيقية. لم يعد المؤشر أخضر تلقائيًا قبل وصول البيانات؛ تظهر حالة تحميل أو خطأ حسب النتيجة.
3. **Quick Navigation (Ctrl / ⌘ + K)** — بحث فوري بين الأقسام الثمانية، مع أسهم لوحة المفاتيح وEnter وEscape، ودعم عربي/إنجليزي وaria-modal وfocus trap.
4. **Intelligent map loading** — لا تُحمّل حزمة MapLibre الثقيلة في صفحات الجودة والمساعد والمصادر، بل تظهر معاينة خفيفة مع زر واضح لفتح المستكشف. تظل الخريطة الكاملة في Explorer وTrends وCompare.
5. **Globe first-paint optimisation** — تظهر معاينة NASA Blue Marble فورًا، بينما يبدأ WebGL بعد فرصة للرسم الأول. عند تفعيل reduced motion تبقى المعاينة الثابتة، دون رسوم متحركة إجبارية.
6. **Verification action in context** — زر دائم للانتقال إلى مختبر التحقق، وزر بجانب نتائج التحليل؛ لا يولّد أي قيم اصطناعية ولا يغيّر طريقة المقارنة.
7. **Release guardrails** — أمر `npm run audit:science` يتحقق من بصمات SHA-256 لـ11 ملفًا علميًا. كما يوقف `deploy_windows.bat` النشر عند فشل سلامة المصدر أو الاختبارات أو البناء أو فحص حجم الحزم.
8. **Browser QA framework** — اختبارات Playwright إضافية للتنقل من المقدمة، ولمنع تحميل MapLibre في صفحات غير جغرافية، ولقراءة حالة المصدر. يعمل webServer المحلي باستخدام Node preview لتجاوز مشاكل workerd على بعض أجهزة Windows.

### تحقق فعلي في بيئة التسليم

| التدقيق | النتيجة |
|---|---|
| اختبارات Node المصدرية | 90 ناجحة، 0 فاشلة |
| SHA-256 ملفات العلم والمصدر | 11/11 بدون تغيير |
| فحص بناء شجرة الصياغة TS/TSX | 13 ملفًا، 0 أخطاء Syntax |
| فحص CSS | 5 ملفات، بدون أخطاء على المستوى الأعلى |
| بناء Vite Production | **غير مكتمل في بيئة التسليم**، اعتماديات npm لم تتوفر |
| اختبارات Playwright الفعلية | **أضيفت ولم تُشغّل هنا**، تحتاج `npm install` والمتصفحات |
| اختبار iPhone فعلي | غير منفذ هنا |
| نشر Cloudflare للإصدار الجديد | غير منفذ؛ الحساب والإذن على جهاز صاحب المشروع |
| نتائج Lighthouse | غير مقاسة؛ لا توجد درجة مُختلقة |

## تشغيل الإصدار على Windows

افتح PowerShell داخل مجلد المشروع الذي يحتوي على `package.json`. نفذ كل أمر بصورة منفصلة:

```powershell
npm.cmd install
npm.cmd run audit:science
npm.cmd test
npm.cmd run build
npm.cmd run audit:bundle
```

للمعاينة المحلية:

```powershell
node scripts/local_node_preview.mjs
```

ثم افتح `http://127.0.0.1:8787`.

لتشغيل اختبارات المتصفح:

```powershell
npx.cmd playwright install chromium webkit
npm.cmd run test:e2e
```

للنشر (بعد نجاح جميع الفحوصات، وعلى حساب Cloudflare الصحيح):

```powershell
npx.cmd wrangler deploy
```

لفحص النشر بعد اكتماله:

```powershell
node scripts/verify_live.mjs https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev
node scripts/audit_live_sources.mjs https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev
```

## اختبارات التسليم اليدوية اللازمة

- **الأرض:** مقدمة تظهر فورًا، المجسم يدور ببطء دون تأخير تنقل، معاينة ثابتة إن تعذر WebGL.
- **التنقل:** `Ctrl+K` يفتح البحث؛ اختر Verify واضغط Enter، ثم جرب Escape واختيارات الأقسام كلها.
- **الخريطة:** جرّب المحافظات الـ11، خصب، صحار، البريمي، مسقط، صلالة؛ جرّب التحديد والحدود والزووم على iPhone Safari وChrome.
- **NASA Verification Lab:** قارن ملفات T2M وRH2M وPRECTOTCORR_SUM، اختبر السنة المحرفة عمدًا، نزّل CSV وEvidence ZIP، وافحص الـSHA-256.
- **الأرقام:** أعد مقارنة ملفي مسقط والبريمي مع NASA POWER عند الإحداثيات نفسها؛ لا تستنتج مطابقة كل ولاية تلقائيًا.
- **الأمطار:** استمر في عرض تنبيه قيم 2024 والوحدات؛ لا تُحذف القيم الشاذة أو تُصحّح تخمينًا.
- **الأداء:** نفّذ PageSpeed Insights وLighthouse على النسخة المنشورة والهاتف؛ قارن LCP وINP وCLS قبل إعلان درجة أداء.
- **الحماية:** فحص طلبات الإحداثيات والسنوات غير الصحيحة، 429 Rate Limit، 502 عند فشل المصدر، وإظهار رسالة واضحة للمستخدم.

## In English

**Release objective:** stronger interaction design and perceived performance with no changes to NASA datasets or scientific algorithms. Features include a command palette, state-aware data-source indicator, mobile refinements, route-based MapLibre loading, deferred 3D initialization, and automatic SHA-256 source-integrity checks. Source tests passed (90/90). **A complete production build, browser E2E run, real-device review, and production deploy have not been verified in this environment.** Run the commands above before publication.

### Scientific interpretation

A successful annual comparison proves agreement with the selected NASA POWER annual API fields at the selected grid reference coordinates within the stated tolerance. It is not validation against ground stations, does not prove governorate-wide averages, and is not proof of causal trends. The unadjusted OLS p-value requires methodological caution.
