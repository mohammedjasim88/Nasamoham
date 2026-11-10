# إصلاح بناء TypeScript — v3.5.1

## المشكلة

ظهر الخطأ `TS2322` عند `src/components/VerificationLab.tsx:124`؛ كان TypeScript يستنتج أن وسيط `uploadedFile` في `buildEvidenceArchive` يقبل `null` فقط بسبب القيمة الافتراضية `uploadedFile=null` داخل ملف `.mjs`.

## الإصلاح

أُضيفت تعليمات JSDoc في `src/lib/verification-evidence.mjs` لتحديد أن `uploadedFile` اختياري، ويمكن أن يكون `null` أو كائن CSV محملاً يتضمن `name` و`rows` و`originalBytes` من النوع `Uint8Array`.

لم تتغير طريقة التحقق من NASA أو البيانات الأصلية أو المعادلات أو منطق إنشاء أرشيف الأدلة. لا حاجة لتعطيل TypeScript أو تجاوز التحقق باستخدام `any` في مكون React.

## الاختبارات التي شغّلتها

- `node --test tests/*.test.mjs`: **90 ناجحًا، 0 فشل**.
- `node --check src/lib/verification-evidence.mjs`: **ناجح**.
- `tsc` مع ملف TypeScript تجريبي يحاكي `{ uploadedFile: file | null }`: **ناجح** باستخدام TypeScript 5.8.3.
- بناء Vite الكامل **لم يُشغّل في بيئة العمل** لعدم وجود حزم `node_modules` هنا؛ يجب إكماله على Windows.

## البناء على Windows

إذا سبق أن نفذت `npm.cmd install` داخل المشروع، فلا حاجة لإعادة تثبيت الحزم:

```powershell
npm.cmd run build
npm.cmd test
```

عندما يظهر `built in ...s` بعد `tsc --noEmit && vite build` تكون عملية البناء قد نجحت. لا تنشر باستخدام `npx.cmd wrangler deploy` إلا بعد نجاح البناء والتأكد من أن إعداد Wrangler يستهدف مشروع Cloudflare الصحيح.

## إصلاح ملف واحد دون تغيير مجلد المشروع

يمكنك نسخ الملف المصحح `src/lib/verification-evidence.mjs` من هذه الحزمة إلى المسار المناظر داخل مشروعك القديم مع الموافقة على الاستبدال، ثم إعادة تنفيذ `npm.cmd run build`.
