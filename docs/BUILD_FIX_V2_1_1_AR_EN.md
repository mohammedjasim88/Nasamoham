# v2.1.1 — TypeScript TS2551 fix

## السبب / Root cause

The `DataSet` type in `src/lib/evidence.ts` declared `source: string` but did not declare `sourceRaw`. The component in `src/App.tsx` uses `dataset?.sourceRaw || dataset?.source` for source attribution. TypeScript correctly rejected access to a nonexistent property.

## ما تم إصلاحه / Fix

Change exactly one type definition:

```ts
export type DataSet = {
  years: RecordYear[];
  dataset?: string;
  source: string;
  sourceRaw?: string; // Optional raw provenance label
  latitude: number;
  longitude: number;
  start: number;
  end: number;
  isSnapshot: boolean;
  retrievedAt?: string;
  sourceUrl?: string;
  reportedUnits?: Record<string, string>;
  gridNote?: string;
  parameters: string[];
  sampleNote?: string;
};
```

`sourceRaw` is optional because the NASA Worker can provide it but not every locally cached sample includes it. The UI safely falls back to `source`.

## خطوات النشر / Deployment

1. Extract the complete ZIP into a **new** folder.
2. On Windows, run `deploy_windows.bat`.
3. It runs npm install, tests, TypeScript/Vite build, then Wrangler deploy. If building fails, no deployment occurs.
4. Or use PowerShell: `npm install`, `npm test`, `npm run build`, `npx wrangler deploy`.

## حالة الفحص / Verification

- 31/31 Node source/logic tests passed.
- Full production `vite build` was **not verified in this environment**, because required npm packages were not cached and the registry was inaccessible offline (`ENOTCACHED`).
- Browser and live tile functionality are **not verified** by this patch.
- The Worker name is unchanged; a successful deployment updates the current `oman-earth-intelligence-practice` website.
