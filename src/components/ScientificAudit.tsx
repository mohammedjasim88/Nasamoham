import {useId,useMemo} from 'react';
import {Activity,AlertTriangle,Info,ShieldCheck} from 'lucide-react';
import type {YearValue} from '../lib/evidence';
// @ts-ignore - pure shared ESM analytical diagnostics, tested directly with Node.
import {trendDiagnostics} from '../lib/robustness.mjs';
import './ScientificAudit.css';
import TrendInference from './TrendInference';

type Props={series:YearValue[];metric:'T2M'|'RH2M'|'PRECTOTCORR_SUM';unit:string;lang:'ar'|'en'};
const n=(v:number|null|undefined,d=3)=>v==null||!Number.isFinite(v)?'—':v.toFixed(d);
export default function ScientificAudit({series,metric,unit,lang}:Props){
 const titleId=useId();
 const result=useMemo(()=>trendDiagnostics(series),[series]);
 const ar=lang==='ar';
 return <section className="scientific-audit panel" aria-labelledby={titleId}>
  <div className="panel-title"><div><p className="eyebrow">SCIENTIFIC ROBUSTNESS · NON-DESTRUCTIVE</p><h2 id={titleId}>{ar?'اختبار متانة الاتجاه':'Trend sensitivity checks'}</h2></div><Activity size={21}/></div>
  {!result.valid?<p className="audit-explain" role="status">{ar?'الملاحظات السنوية الصالحة غير كافية لتحليل الحساسية.':'Not enough valid annual observations for sensitivity diagnostics.'}</p>:<>
   <div className="sensitivity-grid">
    <div><small>{ar?'اتجاه OLS الأصلي':'Original OLS slope'}</small><strong>{n(result.olsPerDecade)} <em>{unit}/10y</em></strong></div>
    <div><small>Theil–Sen {ar?'(قيمة وصفية)':'(descriptive)'}</small><strong>{n(result.theilSenPerDecade)} <em>{unit}/10y</em></strong></div>
    <div><small>{ar?'أعلى تأثير لاستبعاد سنة واحدة':'Largest leave-one-out effect'}</small><strong>{n(result.maxChangePerDecade)} <em>{unit}/10y</em></strong><span>{result.mostInfluentialYear??'—'}</span></div>
    <div><small>{ar?'ارتباط بواقي السنة السابقة':'Lag-1 residual correlation'}</small><strong>{n(result.lag1Residual,2)}</strong><span>{ar?'توصيف أولي':'Descriptive indicator'}</span></div>
   </div>
   {(result.possibleSerialCorrelation||result.sensitivityWarning)&&<p className="sensitivity-warning"><AlertTriangle size={17}/>{ar?'تنبيه: النتائج حساسة لاستبعاد سنة واحدة أو قد تتأثر بالارتباط الزمني. لا تعتمد على p-value وحدها.':'Caution: one-year sensitivity or residual correlation may affect inference. Do not rely on the unadjusted OLS p-value alone.'}</p>}
   <p className="audit-explain"><Info size={16}/>{ar?'هذه مؤشرات إضافية لشرح النتائج ولا تعيد حساب بيانات NASA أو تغير قيمة الانحدار الأصلية. Theil–Sen لا يصحح تلقائيًا الارتباط الذاتي.':'These checks do not modify NASA observations or replace the original OLS result. Theil–Sen is a descriptive robustness check, not an autocorrelation-corrected significance test.'}</p>
   {metric==='PRECTOTCORR_SUM'&&<p className="audit-explain"><ShieldCheck size={16}/>{ar?'قيم الأمطار المعروضة تأتي من المصدر كما هي. راجع وحدة NASA الأصلية وقيمة 2024 الشاذة قبل الاستنتاج.':'Precipitation source values are preserved. Check the original NASA unit and the 2024 outlier before drawing conclusions.'}</p>}
   {metric!=='PRECTOTCORR_SUM'&&<TrendInference series={series} unit={unit} lang={lang}/>}
  </>}
 </section>;
}
