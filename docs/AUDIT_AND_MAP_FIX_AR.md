# تقرير التحقق من CSV والخريطة — Oman Earth Intelligence v2.1.4

## النتيجة الرقمية
- CSV: 24 سنة من 2000 إلى 2023، والمتغير T2M، والموقع 23.5946 N / 58.7351 E.
- 24/24 قيمة تتطابق تماماً (بعد التمثيل العشري) مع بيانات مسقط الشرقية المحفوظة في `public/data/muscat-east.json`.
- المتوسط 2000–2023 = 28.39875 °C = 28.40 °C.
- المتوسط 2000–2025 = 28.42615 °C = 28.43 °C، ما يفسر اختلاف لقطة الشاشة.
- التطابق هنا تحقق داخلي مع النسخة المؤرشفة للمشروع؛ لا يثبت سحب بيانات مستقلة من NASA وقت المراجعة.
- أداة المقارنة المباشرة: `node scripts/verify_nasa_csv.mjs "مسار ملف CSV"`. يجب توفر الإنترنت. ستطبع اختلاف كل سنة مقارنة بمفتاح NASA السنوي `YYYY13`.

## سبب الخريطة غير المكتملة
- الإصدار السابق كان يبحث عن GovernorateB في خدمة WilayatB التي تحتوي فعلياً على طبقة WilayatB (ID 3) فقط.
- التعديل يبحث عن المحافظات في خدمة NCSI `AdminBoundEn/MapServer/1` باستخدام شرط `regionLevel = '2'`، وعن الولايات في `WilayatB/FeatureServer/3`، ويرفض عرض حدود المحافظات إذا لم يحصل على 11 مضلعاً.
- لا يمكن الجزم بإتاحة الـ API أو صحة طوبولوجيا الحدود قانونياً من الاختبارات المحلية وحدها. إذا كانت الخدمة محجوبة ستظل نقاط المراجع مرئية مع رسالة تفسيرية.

## تحسينات واجهة الخريطة
- عرض كامل السلطنة عند الفتح (من ظفار إلى مسندم) بدلاً من التكبير التلقائي على مسقط.
- أسماء واضحة للنقاط مع تمييز الموقع المختار، ونسخة مختصرة لأسماء مواقع مسقط، وإخفاء أسماء النقاط غير المختارة على الهاتف لتقليل التداخل.
- حدود المحافظات أكثر وضوحاً عندما يُتيحها NCSI.
- إصلاح تحميل حدود الولايات بعد تفعيل خانتها دون إعادة تشغيل الخريطة.

## الحالة والفحوص
- نجح: 38 اختبار Node محلي.
- لم يمكن إكمال `npm run build` في بيئة الفحص هذه بسبب عدم وجود `node_modules` (React, Vite, MapLibre)، وليس بسبب فشل مثبت في الكود.
- لم يُنشر التعديل على Cloudflare؛ يحتاج المستخدم إلى تشغيل `npm install && npm test && npm run build` قبل `npx wrangler deploy`.

## المراجع الأصلية
- NASA POWER Monthly & Annual API: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- NCSI AdminBoundEn MapServer: https://ncsigeostatportal.ncsi.gov.om/server/rest/services/NCSIData/AdminBoundEn/MapServer
- NCSI WilayatB FeatureServer: https://ncsigeostatportal.ncsi.gov.om/server/rest/services/NCSIData/WilayatB/FeatureServer
