# NASA Verification Lab — Verification Evidence Archive v3.3

## ما الجديد؟

تمت إضافة بطاقة **حزمة أدلة التحقق (Download Verification Evidence)** داخل `NASA Verification Lab` في صفحة `/#verify`.

يظهر زر تنزيل ملف ZIP بعد الانتهاء من طلب جديد ومستقل لبيانات NASA ومقارنتها ببيانات الموقع. لا توجد شاشة انتظار أخرى، ولا يُرسل ملف CSV الذي يرفعه المستخدم إلى الخادم.

### محتويات ملف ZIP

- `manifest.json` — ملخص الحالة، إحداثيات كل موقع، اسم المتغير والفترة، رابط NASA الأصلي، وقت استرجاع المصدر، ووقت إنشاء الأرشيف، والنتائج السنوية المختصرة، وبصمات SHA-256 للملفات داخل الأرشيف.
- `README.txt` — شرح بالإنجليزية والعربية لطريقة القراءة وحدود التحقق.
- `locations/<point>/nasa-original-response.json` — **نص JSON الأصلي** الذي أرجعته NASA خلال **نفس عملية التحقق**؛ يحتوي على بياناتها الشهرية وقيم السنوات الرسمية `YYYY13`. لم يُنشأ عن طريق إعادة الحساب ولم يُعد طلبه مرة ثانية عند التنزيل.
- `locations/<point>/annual-comparison.csv` — مقارنة الموقع وNASA سنة بسنة، الفروق والحالات (matched/different/missing) وإحداثيات الطلب.
- `locations/<point>/website-values-used.csv` — قيم الموقع السنوية المستخدمة فعليًا للمقارنة، دون إعادة احتسابها أو تغييرها.
- `locations/<point>/uploaded-website-original.csv` — يظهر فقط إذا استخدم الشخص ملف CSV مرفوعًا، ويحتفظ **ببايتات الملف المرفوع** كما اختاره المستخدم داخل المتصفح.

عند اختيار موقعين ينشئ النظام مجلدًا مستقلًا لكل موقع داخل **ملف ZIP واحد**. لا تعتمد حزمة الأدلة على إعادة الاتصال بخادم NASA بعد نجاح المقارنة.

### الضوابط العلمية

- لا يمكن إصدار الحزمة قبل نجاح الاتصال والحصول على بيانات NASA الأصلية واكتمال المقارنة.
- إذا كانت القيم **مختلفة** أو **مفقودة** يمكن تنزيل الأدلة مع حالة `review_required`، من دون الادعاء بنجاح التحقق.
- يتحقق المصدر قبل الأرشفة من توافق نص NASA JSON مع القيم السنوية المستخدمة في تقرير المقارنة؛ وفي حالة تعارضهما يُمنع التنزيل.
- الهامش المعتمد للمقارنة هو `±0.01` من وحدة المتغير، مثل الإصدارات السابقة.
- المطابقة تُثبت اتساق القيم السنوية مع تقديرات NASA POWER الشبكية، **وليس** مع قياسات محطة أرضية أو متوسطات محافظة بالكامل.
- بصمات SHA-256 للتحقق من سلامة الملفات داخل الأرشيف، **وليست توقيعًا رقميًا صادرًا عن NASA** أو إثباتًا لهوية الخادم.
- متغير `PRECTOTCORR_SUM` والتحذير الخاص بقيمة 2024 يبقيان دون تغيير.

### اختبار الأرشيف بعد تنزيله

يمكن فتح ZIP مباشرةً باستخدام Windows File Explorer. وللتأكد من CRC32 وبصمات SHA-256 لكل الملفات، نفذ داخل مجلد المشروع:

```powershell
node scripts/check_evidence_archive.mjs "$env:USERPROFILE\Downloads\NASA_Verification_Evidence_T2M_2000-2025_buraimi.zip"
```

غيّر اسم الملف حسب ما نزّلته. النجاح يظهر بصيغة `PASS: ZIP CRC32 and SHA-256 integrity checks`، ثم حالة المقارنة المحفوظة. لا تستعمل نتيجة `PASS` على أنها إثبات لمصدر NASA بواسطة التوقيع الرقمي.

### خطوات الاستخدام

1. افتح `/#verify` واختر موقعًا ومتغيرًا وفترة زمنية.
2. اضغط **Verify against NASA** أو **تحقق من NASA الآن**.
3. راجع `Matched`, `Different`, `Missing` وكل السنوات.
4. اضغط **Download Verification Evidence** لتنزيل ملف ZIP المتكامل.
5. افتح الملفات أو استخدم `check_evidence_archive.mjs` للتحقق من سلامتها داخليًا.

### المراجع الأساسية للمصدر

NASA POWER Monthly and Annual API:
https://power.larc.nasa.gov/docs/services/api/temporal/monthly/

## Engineering notes (English)

- The Cloudflare `/api/verification` response now includes `sourceRawJson`, the exact **text representation** of the NASA response received in that verification request, bounded to 1 MB. The existing `YYYY13` selection and tolerance calculation are unchanged.
- The ZIP is generated **locally** with a minimal standards-compliant ZIP/STORE writer (no new npm runtime dependency), with UTF-8 entry names and CRC32. The SHA-256 manifest is computed with browser Web Crypto.
- Browser-local files are never uploaded. The optional user CSV is preserved byte-for-byte in the archive using `File.arrayBuffer()`.
- Failures in source availability or digest generation do not produce fake evidence packages.
- Changing the selected point, years, metric, or uploaded file invalidates earlier verification results.
- This archive is **not digitally signed**. A malicious person who edits the files and re-generates their hashes can forge a consistent archive. Re-run verification against NASA for independent provenance checks.
- The normal NASA original CSV download button remains available and unchanged.
- Performance impact: one JSON source text held in the result state per verified point, plus transient ZIP creation. No new third-party libraries or routes were added.

### Automated test coverage

- Original NASA JSON text retained without recomputation.
- ZIP readability, CRC32, SHA-256, and file enumeration.
- Complete, mismatched and missing-series outcome handling.
- Proper rejection of missing or altered original data.
- Optional uploaded CSV preserved from browser-local byte array.
- Two-location ZIP export.
- ZIP traversal and duplicate filename guards.
- Standalone offline Node audit of exported ZIP.
- Existing v3.2 tests, including NASA query validation and scientific regression tests.
