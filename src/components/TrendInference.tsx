import {useMemo} from 'react';
import type {YearValue} from '../lib/evidence';
import {neweyWestTrend,mannKendall,pairedTrendDifference} from '../lib/trend-inference.mjs';
import './ScientificAudit.css';
type Props={series:YearValue[];other?:YearValue[];unit:string;lang:'ar'|'en'};
const num=(v:number|undefined)=>v==null||!Number.isFinite(v)?'—':v.toPrecision(4);
export default function TrendInference({series,other,unit,lang}:Props){
 const ar=lang==='ar';
 const hac=useMemo(()=>other?pairedTrendDifference(series,other):neweyWestTrend(series),[series,other]);
 const mk=useMemo(()=>mannKendall(series),[series]);
 return <div className="trend-inference" data-testid={other?'paired-inference':'trend-inference'}>
  <h3>{other?(ar?'اختبار فرق الاتجاهين · البريمي ناقص مسقط':'Difference in trends · Al Buraimi minus Muscat'):(ar?'عدم اليقين مع الارتباط الزمني':'Uncertainty with serial dependence')}</h3>
  <p className="audit-explain">{ar?'Newey–West HAC: نفس ميل OLS، مع تقدير إضافي لعدم اليقين يسمح بارتباط زمني ضعيف وتباين غير ثابت. هذا تقريب وليس ضماناً لصحة الاستنتاج.':'Newey–West HAC keeps the OLS slope and estimates uncertainty allowing weak serial dependence and unequal variance. This is an approximation, not a guarantee of valid inference.'}</p>
  {hac.valid?<>
   <dl className="inference-grid">
    <div><dt>{ar?'الميل لكل عقد':'Slope per decade'}</dt><dd dir="ltr">{num(hac.perDecade)} {unit}/10y</dd></div>
    <div><dt>{ar?'فاصل ثقة HAC تقريبي 95%':'Approximate HAC 95% CI'}</dt><dd dir="ltr">{num(hac.ci95[0]*10)} → {num(hac.ci95[1]*10)} {unit}/10y</dd></div>
    <div><dt>HAC p-value</dt><dd dir="ltr">{num(hac.pValue)}</dd></div>
    <div><dt>{ar?'السنوات / التأخر':'Observations / bandwidth'}</dt><dd dir="ltr">{hac.n} / {hac.lag}</dd></div>
   </dl>
   <p>{hac.significant?(ar?'يستبعد الفاصل الصفر وفق افتراضات HAC التقريبية.':'The interval excludes zero under the approximate HAC assumptions.'):(ar?'الفاصل يحتوي على صفر؛ لا يكفي الدليل لاستبعاد ميل صفري. هذا لا يثبت عدم وجود تغير.':'The interval includes zero: evidence does not exclude a zero slope. This does not prove that no change exists.')}</p>
  </>:<p role="status">{ar?'الاختبار غير متاح: يحتاج 10 سنوات متتالية كاملة على الأقل، دون تكرار، وبواقي قابلة لتقدير التباين.':'Inference unavailable: at least 10 complete consecutive unique years and estimable residual variance are required.'}</p>}
  {!other&&mk.valid&&<p className="audit-explain">Mann–Kendall p = {num(mk.pValue)} · {ar?'اختبار رتبي مع تصحيح القيم المتساوية، دون تصحيح الارتباط الذاتي.':'Tie-adjusted rank test; NOT autocorrelation-adjusted.'}</p>}
  <details><summary>{ar?'الافتراضات وطريقة الحساب':'Assumptions and calculation'}</summary><p>{ar?'أوزان Bartlett، تصحيح n/(n−2)، واختبار t تقريبي بدرجات حرية n−2. اختيار التأخر floor(4(n/100)^(2/9)). لا نملأ السنوات المفقودة. العينات القصيرة حساسة لاختيار التأخر ولا تثبت السببية.':'Bartlett weights, n/(n−2) covariance correction, approximate t with n−2 degrees of freedom. Bandwidth floor(4(n/100)^(2/9)). Missing years are not imputed. Short series are bandwidth-sensitive and cannot establish causality.'}</p>{other&&<p>{ar?'نحلل فرق القيم السنوية المتزامنة B−A، للحفاظ على العلاقة بين النقطتين. صلاحية النتيجة مشروطة بصحة البيانات وافتراضات النموذج.':'We regress the concurrent annual differences B−A, retaining the relationship between the two points. Validity remains conditional on data quality and model assumptions.'}</p>}</details>
 </div>;
}
