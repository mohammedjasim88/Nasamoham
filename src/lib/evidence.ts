import type {Metric} from './locations';
// Reuses the prior statistical model (OLS + two-sided Student's t test; not autocorrelation-adjusted).
// @ts-ignore - shared tested JavaScript statistics module, documented in README.
import {linearTrend,metricSeries,checkQuality,sameSeries,monthlySeries} from './statistics.mjs';

export type RecordYear={year:number;[metric:string]:any};
export type DataSet={years:RecordYear[];dataset?:string;source:string;sourceRaw?:string;latitude:number;longitude:number;start:number;end:number;isSnapshot:boolean;retrievedAt?:string;sourceUrl?:string;reportedUnits?:Record<string,string>;gridNote?:string;parameters:string[];sampleNote?:string};
export type YearValue={year:number;value:number|null};
export type Trend={n:number;valid:boolean;start?:number;end?:number;mean?:number;slope?:number;perDecade?:number;intercept?:number;pValue?:number|null;significant?:boolean;ci95?:[number,number];rSquared?:number;reason?:string};
export type Quality={missing:YearValue[];invalid:YearValue[];anomalies:{year:number;value:number;robustScore:number}[];monthlyOutliers:{year:number;month?:number;value:number;robustScore:number}[];complete:boolean;total:number};
export function evidence(dataset:DataSet,metric:Metric,start:number,end:number):{series:YearValue[];trend:Trend;quality:Quality}{
 const series=metricSeries(dataset,metric,start,end) as YearValue[];
 const quality=checkQuality(dataset,metric,start,end) as Quality;
 const badYears=new Set(quality.invalid.map((x:YearValue)=>x.year));
 const safeSeries=series.map(r=>badYears.has(r.year)?{...r,value:null}:r);
 return {series:safeSeries,trend:linearTrend(safeSeries) as Trend,quality};
}
export function areIdentical(a:YearValue[],b:YearValue[]):boolean{return sameSeries(a,b) as boolean;}
export function monthValues(data:DataSet,metric:Metric,start:number,end:number){return monthlySeries(data,metric,start,end) as {year:number;month:number;value:number|null;label:string}[];}
export function formatNumber(value:number|null|undefined,digits=2){return value==null||!Number.isFinite(value)?'—':Number(value).toLocaleString('en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits});}
export function explainEvidence(data:DataSet,metric:Metric,trend:Trend,quality:Quality,lang:'ar'|'en',question:string):string{
 const q=question.trim().toLowerCase();
 if(!q)return lang==='ar'?'اكتب سؤالًا عن الاتجاه العلمي.':'Ask a question about the scientific trend.';
 if(/اليوم|الآن|لحظي|مباشر|توقع|غدا|بكرة|forecast|tomorrow|now|live weather|today|real-time/.test(q))return lang==='ar'?'البيانات هنا تاريخية وشبكية؛ لا توجد لدي قياسات لحظية أو توقعات.':'These are historical grid-based estimates, not live observations or forecasts.';
 if(/ولاية|ولايات|whole oman|كل عمان|جميع المحافظات|national average|متوسط سلطنة عمان/.test(q))return lang==='ar'?'هذه النتيجة تخص نقطة إحداثية واحدة، ولا يجوز تعميمها على عُمان كلها.':'This result represents one coordinate, not a national average for Oman.';
 if(!/اتجاه|حرار|رطوب|مطر|أمطار|سبب|دلالة|ملحوظ|p-value|signific|trend|temperature|humidity|rain|slope|source|data|مصدر|البيانات|تغير|increase|decrease/.test(q))return lang==='ar'?'أستطيع شرح Trend Slope وStatistical Significance ومصدر البيانات، لكن هذا السؤال خارج نطاق النتائج المتاحة.':'I can explain the trend, statistical significance and data source, but that question is outside the available evidence.';
 if(!trend.valid)return lang==='ar'?'لا توجد سنوات كافية أو بيانات صالحة لحساب Trend Slope لهذا المتغير والفترة.':'Insufficient valid annual data to calculate a trend for this variable and period.';
 const per=Math.abs(trend.perDecade||0).toFixed(3),sig=trend.significant;
 const up=(trend.slope||0)>=0;
 const p=trend.pValue==null?'N/A':trend.pValue<.001?'< 0.001':trend.pValue.toFixed(3);
 const qual=quality.anomalies.length+quality.monthlyOutliers.length;
 if(lang==='ar')return `وفق بيانات ${data.source} عند ${data.latitude.toFixed(3)}°N, ${data.longitude.toFixed(3)}°E، الفترة ${trend.start}–${trend.end}: الاتجاه ${up?'صاعد':'هابط'} بمقدار ${per} لكل عقد (بالوحدة الخاصة بالمتغير). p-value = ${p}؛ ${sig?'الاتجاه دال إحصائيًا وفق OLS':'لا يوجد دليل إحصائي كافٍ على اتجاه وفق OLS'}. ${qual?`رُصدت ${qual} قراءة/قراءات غير اعتيادية تحتاج تحققًا مستقلًا. `:''}هذا اختبار أولي لا يصحح الارتباط الذاتي، ولا يثبت سبب التغير. ${metric==='PRECTOTCORR_SUM'?'وحدة مجموع الأمطار بحاجة إلى مراجعة مع NASA.':''}`;
 return `Source: ${data.source}. Location: ${data.latitude.toFixed(3)}°N, ${data.longitude.toFixed(3)}°E; period ${trend.start}–${trend.end}. ${up?'Increasing':'Decreasing'} slope: ${per} metric units per decade. p-value: ${p}; ${sig?'significant under ordinary least squares':'insufficient evidence of a trend under OLS'}. ${qual?`${qual} unusual value(s) need independent verification. `:''}This is a preliminary model without serial-correlation adjustment and does not establish causation.${metric==='PRECTOTCORR_SUM'?' Rainfall aggregation units must be checked with NASA.':''}`;
}
