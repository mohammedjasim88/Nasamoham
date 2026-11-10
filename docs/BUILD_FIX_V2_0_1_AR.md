# إصلاح فشل البناء — v2.0.1

## سبب الأعطال الخمسة

1. **TS1192:** `maplibre-gl` v6 لا يصدر `default export`.
   - الإصلاح في `src/components/OmanMap.tsx`: `import * as maplibregl from 'maplibre-gl';`
2. **TS2339:** تعريف `import.meta.env` غير محمّل.
   - أضفنا `src/vite-env.d.ts` مع reference لـ `vite/client` وتعريف `VITE_MAPTILER_KEY`.
3. **TS7006:** نوع `event` غير محدد.
   - الإصلاح: `(event: maplibregl.MapLayerMouseEvent) => { ... }`.
4. **TS2345** مرتين: `a` قد تكون `undefined` رغم فحص `a?.value !== null`.
   - الإصلاح: فحص `a != null && a.value != null && Number.isFinite(a.value)` قبل `model.xy(a)`.

## النشر على Windows

1. فك الضغط في مجلد جديد (تجنب خلطه بملفات v2.0).
2. افتح المجلد الذي يحتوي `package.json` و`deploy_windows.bat`.
3. شغّل `deploy_windows.bat`.
4. في حال وجود مشكلة، افتح PowerShell في المجلد وشغّل `npm install`, `npm run typecheck`, `npm run build`.
5. لا تنشر إذا فشل البناء. إذا ظهرت أخطاء جديدة، انسخ النص كاملًا لفحصها.

## ما الذي تم التحقق منه؟

- اختبارات Node المحلية سليمة.
- فحص تركيبي مستقل للإصلاحات الأربعة.
- **لم يكتمل بناء Vite الفعلي داخل بيئة إنشاء الحزمة** لأن registry.npmjs.org غير متاح من هذه البيئة.
- لا نستنتج من تصحيح TypeScript سلامة تشغيل الخريطة أو طلبات NASA أو جودة الحدود الجغرافية الحية.
