# Oman Earth Intelligence — Manual Scientific Accuracy Fixes (v2.1.3)

## Important: what this release actually proves
- The map can display in the user's local browser; the screenshot does **not** validate every map tile or all administrative boundaries.
- `GET /api/status` only confirms that the local server is responding. It does **not** compare the returned climate values to an independent NASA download.
- NASA POWER MERRA-2 meteorological values are spatial grid estimates, not observations from a meteorological station in every wilayat.
- NASA historical source accuracy and the August 2024 Muscat precipitation outlier are **not independently verified** by this patch.
- Local source tests: 34 passed. A TypeScript/Vite production build was **not** performed in this environment (npm packages were unavailable). Run `npm run build` on Windows before deploying.

## Before editing
1. Copy your entire `Oman_Earth_Intelligence_v2_1_2_Windows_Local_Fix` folder as a backup.
2. Open project root in VS Code.
3. You may use the full corrected source in the provided ZIP, or apply `docs/PRECISION_PATCH_v2_1_3.diff` manually.
4. Do **not** edit the NASA CSV measurements to make charts prettier.

## Exact manual changes, in order

### 1. `src/lib/statistics.mjs` (preserve missing years and months)
Find the one-line functions `metricSeries` and `monthlySeries`. Replace each with the following functions. This prevents a completely absent year from disappearing and becoming an undetected gap.

```js
export function metricSeries(dataset,metric,start=2000,end=2025){
 if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||end-start>150)return [];
 const byYear=new Map((dataset?.years||[]).map(row=>[row.year,row]));
 return Array.from({length:end-start+1},(_,i)=>{
  const year=start+i;
  const value=byYear.get(year)?.[metric]?.annual;
  return {year,value:typeof value==='number'&&Number.isFinite(value)&&value!==-999?value:null};
 });
}

export function monthlySeries(dataset,metric,start=2000,end=2025){
 if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||end-start>150)return [];
 const byYear=new Map((dataset?.years||[]).map(row=>[row.year,row]));
 return Array.from({length:end-start+1},(_,i)=>start+i).flatMap(year=>
  Array.from({length:12},(_,i)=>{
   const value=byYear.get(year)?.[metric]?.monthly?.[i];
   return {year,month:i+1,value:typeof value==='number'&&Number.isFinite(value)&&value!==-999?value:null,label:`${year}-${String(i+1).padStart(2,'0')}`};
  })
 );
}
```

### 2. `worker/nasa.mjs` (empty NASA values are **not** zero)
Find `const num=x=>...` and replace it with:

```js
const num=x=>{
 if(x===undefined||x===null||(typeof x==='string'&&x.trim()===''))return null;
 const v=Number(x);
 return !Number.isFinite(v)||v===-999?null:v;
};
```

This avoids `Number('') === 0` which could create a fabricated zero in a time series.

### 3. `src/App.tsx` (use validated rather than raw values on the map)
Find:

```ts
const currentValue=dataset?.years?.find(y=>y.year===end)?.[metric]?.annual;
```

Replace with:

```ts
const currentValue=primary?.series.find(y=>y.year===end)?.value??null;
```

The `primary` series already excludes invalid physical-range values. The map's point bubble now honours the same validation as the statistical result.

### 4. `worker/index.mjs` (AI must not explain invalid readings as evidence)
Inside `handleAsk` find the line that declares `dataset`, `series`, `trend`, and `quality` simultaneously. Replace it with:

```js
const dataset=await loadNasa(q);
const quality=checkQuality(dataset,metric,q.start,q.end);
const invalidYears=new Set(quality.invalid.map(r=>r.year));
const series=metricSeries(dataset,metric,q.start,q.end)
  .map(r=>invalidYears.has(r.year)?{...r,value:null}:r);
const trend=linearTrend(series);
```

This makes the optional Workers AI backend apply the same exclusion policy as the visual analysis.

### 5. `src/App.tsx` (export real traceable provenance)
Replace `const exportCurrent=()=>{...};` with the revised block in the accompanying patch file. The exported CSV now includes `NASA_source_url`, `requested_latitude`, `requested_longitude`, `retrieved_at`, and `numeric_status` rather than suggesting an API response is an independently confirmed station observation.

### 6. `src/styles.css` (legibility improvements)
Append the CSS section titled `v2.1.3 optional visual polish` from this release. It increases the minimum sizes of scientific labels and preserves a responsive map height, without changing calculations.

## Verification on Windows
In the project folder address bar type `powershell`, then run:

```powershell
npm install
npm test
npm run typecheck
npm run build
```

If all succeed, run `start_windows.bat` to preview locally. Open `http://127.0.0.1:8787/api/status`. Then select **Salalah / T2M / 2000–2025**, **Sohar / RH2M**, and **Muscat / PRECTOTCORR_SUM** in the UI.

### Scientific acceptance checks
- **Sohar RH2M:** Export values; compare all annual rows with NASA POWER DAV at exactly 24.3474°N, 56.7094°E using 2000–2025. A match within source rounding shows source consistency, not independent ground-station accuracy.
- **Salalah T2M:** The screenshot displays an OLS mean of ~25.05 °C, slope ~+0.062 °C/decade and p~0.5081. These displayed values have not been independently compared with a new NASA download in this patch.
- **Muscat precipitation:** The previously supplied CSV contains an unusually high value of 1089.90 for Aug 2024. Retain, flag and verify against independent precipitation data; never silently remove or label it a confirmed weather observation.
- **Location comparisons:** NASA MERRA-2 gridded values may be identical for two nearby coordinates. Do not claim the cities have identical measured weather merely because the data grid is shared.
- **Statistical Significance:** OLS p-values and 95% CIs assume model conditions including no problematic serial autocorrelation; add robust time-series checks before publishing strong research claims.

## What this patch deliberately does NOT claim
- A verified climate reading for every Omani wilayat.
- A verified boundary database for all 11 governorates and all wilayats.
- A live weather forecast.
- Zero defects or perfect scientific accuracy.
- A complete live-browser, iPhone Safari, or new NASA API round-trip verification.
