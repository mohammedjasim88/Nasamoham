OMAN EARTH INTELLIGENCE - AUTOMATED PLAYWRIGHT AUDIT
====================================================

مهم: هذه الحزمة لا تغير كود موقعك، لكنها تضيف @playwright/test إلى devDependencies
إذا لم يكن مثبتاً، وتنشئ مجلد audit-results للتقارير. لا تنشرها على Cloudflare.

خطوة واحدة للتشغيل:
1) انسخ مجلد Oman-Auto-Audit بالكامل إلى داخل مجلد مشروعك الداخلي،
   بجوار package.json و wrangler.jsonc.
2) اضغط مرتين على RUN-AUDIT.cmd.
3) بعد إتمام التشغيل، يفتح التقرير المرئي تلقائياً.

مثال:
Oman_Earth_Intelligence_v3_9_1_Ask_AI\
    package.json
    wrangler.jsonc
    Oman-Auto-Audit\
       RUN-AUDIT.cmd
       playwright.audit.config.cjs
       tests\oman-earth.spec.cjs

التقرير:
- audit-results\html : تقرير مرئي، نتائج ناجحة وفاشلة وصور وتشخيصات
- audit-results\results.json : تقرير آلي بصيغة JSON
- audit-results\artifacts : traces/screenshot/video للأخطاء
- audit-results\npm-security-audit.json : نتائج npm audit للثغرات المعروفة

ماذا تختبر الحزمة؟
- الصفحة الرئيسية ومظهرها على Desktop/Tablet/Mobile
- تشغيل Backend ومصدر NASA API وحالة AI المعلنة
- واجهة الحدود الجغرافية
- التنقل بين الصفحات
- سؤال Ask AI علمي بالإنجليزية وظهور التحليل
- وجود الميكروفون وخيارات الصوت (وليس اختبار جودة الصوت فعلياً)
- تحقق NASA المباشر لحرارة شرق مسقط في 2000–2010
- رؤوس أمان HTTP الأساسية فقط
- الواجهة العربية والتبديل بين الوضعين
- عرض الهاتف وتصدير CSV

ما لا تضمنه:
- لا يمكن اعتبار هذا اختبار اختراق أمني شاملاً.
- لا يختبر جودة تسجيل أو نطق الصوت على جهاز حقيقي.
- لا يضمن دقة جميع نقاط وسنوات NASA في المشروع.
- لا يختبر كل سيناريو تجاري أو تفاعل 3D.
- نجاح الاختبارات يشير إلى السيناريوهات المكتوبة فقط.
- أي فشل بسبب قطع الإنترنت أو NASA أو تغيير أسماء أزرار الموقع قد يكون
  مشكلة في البيئة أو في الاختبار، وليس بالضرورة خطأ في الموقع.

إذا فشل التشغيل بسبب عدم قدرة Worker على البدء:
شغّل npx.cmd wrangler dev --port 8787 داخل المشروع، وفي نافذة أخرى
npm.cmd run dev، ثم شغّل RUN-AUDIT.cmd مرة ثانية.

النصيحة: لا تشغّل npm audit fix --force دون مراجعة.
