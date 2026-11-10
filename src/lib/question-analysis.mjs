/** Deterministic annual-data questions. No model, external tools, or generated measurements. */
import {metricSeries,checkQuality,linearTrend,mean} from './statistics.mjs';
export const normaliseQuestion=s=>String(s).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase();
const problem=(code,ar,en)=>({ok:false,code,message:{ar,en}});
export function planQuestion(question,context,points){
 const q=normaliseQuestion(question).trim();
 if(!q||q.length>600)return problem('QUESTION_LENGTH','اكتب سؤالاً من 1 إلى 600 حرف.','Enter a question of 1–600 characters.');
 if(/اليوم|غدا|بكره|لحظي|توقع|forecast|tomorrow|today|real.time|live weather/.test(q))return problem('HISTORICAL_ONLY','المتاح بيانات سنوية تاريخية حتى 2025، وليس طقساً مباشراً أو توقعات.','Only historical annual data through 2025 is supported, not live weather or forecasts.');
 if(/شهري|شهريا|يناير|فبراير|مارس|ابريل|مايو|يونيو|يوليو|اغسطس|سبتمبر|اكتوبر|نوفمبر|ديسمبر|monthly|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b|daily|يومي/.test(q))return problem('ANNUAL_ONLY','هذا التحليل يستخدم القيم السنوية. حدّد سنة أو فترة سنوية؛ التحليل الشهري غير مدعوم هنا.','This analysis uses annual values. Monthly/daily questions are not supported here.');
 if(/متوسط.*(?:كل عمان|سلطنه عمان|جميع المحافظات)|national average|whole oman/.test(q))return problem('POINT_ONLY','البيانات تخص نقاطاً مرجعية، ولا تسمح بحساب متوسط عُمان كلها.','Reference points do not establish a national average.');
 const metricMatches=[['T2M',/t2m|حرار|temperature/],['RH2M',/rh2m|رطوب|humidity/],['PRECTOTCORR_SUM',/prectotcorr|امطار|مطر|هطول|rain|precipitation/]].filter(([,re])=>re.test(q));
 if(metricMatches.length>1)return problem('ONE_METRIC','حدّد متغيراً واحداً في كل سؤال: الحرارة أو الرطوبة أو الهطول.','Choose one variable per question: temperature, humidity or precipitation.');
 if(!metricMatches.length&&!/قارن|مقارن|اتجاه|تغير|حلل|تحليل|compare|trend|analyse|analyze|change|مصدر|source/.test(q))return problem('UNSUPPORTED_QUESTION','أستطيع تحليل الحرارة والرطوبة والهطول ومقارنة السنوات والمواقع المتاحة.','Ask about climate values, annual periods or supported reference locations.');
 const metric=metricMatches[0]?.[0]||context.metric;
 const years=[...q.matchAll(/(?<!\d)\d{4}(?!\d)/g)];
 if(years.length>2)return problem('TOO_MANY_YEARS','استخدم فترة واحدة أو عامين منفصلين في السؤال نفسه.','Use one period or two individual years per question.');
 const requested=years.map(y=>Number(y[0]));
 if(requested.some(y=>y<1981||y>2025))return problem('YEAR_RANGE','السنوات المدعومة حالياً 1981–2025؛ لا أقدّر السنوات خارج هذا النطاق.','Supported years are 1981–2025; values outside this range are not estimated.');
 let mode='period',start=context.start,end=context.end;
 if(years.length===1){mode='single';start=end=requested[0];}
 if(years.length===2){
  [start,end]=requested;const join=q.slice(years[0].index+4,years[1].index);
  if(/الي|حتي|\bto\b|through|[-–—]/.test(join)||/\bbetween\s+(?:the\s+years?\s+)?$/.test(q.slice(0,years[0].index)))mode='period';
  else if(/و|\band\b|\bvs\b|versus|مقابل/.test(join))mode='pair';
  else return problem('AMBIGUOUS_YEARS','هل تقصد فترة «من 2000 إلى 2005» أم «عامَي 2000 و2005 فقط»؟','Specify a period (from 2000 to 2005) or two years only (2000 and 2005).');
  if(start>end)return problem('REVERSED_YEARS','اكتب السنة الأقدم أولاً؛ لن أعكس طلبك بصمت.','Write the earlier year first; the request will not be silently reversed.');
  if(start===end)mode='single';
 }
 let locations=[];
 const aliases=[['muscat-east',/مسقط.*شرق|شرق.*مسقط|muscat.*east|east.*muscat/],['muscat-west',/مسقط.*غرب|غرب.*مسقط|muscat.*west|west.*muscat/],['salalah',/صلاله|salalah/],['sohar',/صحار|sohar/],['nizwa',/نزوي|nizwa/],['sur',/(?:^|\s)صور(?:\s|$)|\bsur\b/],['khasab',/خصب|khasab/],['buraimi',/بريمي|buraimi/],['ibri',/عبري|\bibri\b/],['rustaq',/رستاق|rustaq/],['ibra',/ابراء|\bibra\b/],['duqm',/دقم|duqm/]];
 for(const [id,re]of aliases)if(re.test(q))locations.push(id);
 const genericMuscat=/مسقط|muscat/.test(q)&&!locations.some(id=>id.startsWith('muscat'));
 if(genericMuscat)locations.unshift(context.pointId?.startsWith('muscat')?context.pointId:'muscat-east');
 if(/دبي|باريس|لندن|dubai|paris|london/.test(q))return problem('UNSUPPORTED_LOCATION','هذا الموقع غير متاح ضمن نقاط عُمان المدعومة.','That place is outside the supported Oman reference locations.');
 const explicitPlace=q.match(/(?:^|\s)(?:في|in)\s+([^\s،,.]+)/)?.[1];
 const scopeWords=/^(?:عام|سنه|الفتره|البيانات|الموقع|النقطه|درجه|بدايه|نهايه|the|year|period|temperature|\d+)$/;
 if(!locations.length&&explicitPlace&&!scopeWords.test(explicitPlace))return problem('UNKNOWN_LOCATION','لم أتعرف على الموقع في السؤال. استخدم اسم موقع من قائمة المواقع المرجعية.','The place was not recognised. Use a location from the reference-point list.');
 if(locations.length>2)return problem('TOO_MANY_LOCATIONS','أستطيع مقارنة موقعين كحد أقصى في كل سؤال.','Compare at most two locations per question.');
 if(!locations.length)locations=[context.pointId];
 if(locations.some(id=>!points.some(p=>p.id===id)))return problem('INVALID_LOCATION','الموقع المرجعي غير متاح.','The reference point is unavailable.');
 return {ok:true,metric,start,end,mode,locations,usedContextYears:years.length===0,usedContextMetric:metricMatches.length===0,usedContextLocation:!genericMuscat&&!aliases.some(([,re])=>re.test(q)),genericMuscat};
}
export function analyseAnnual(data,plan,point){
 if(!data||!Array.isArray(data.years)||!Number.isFinite(data.latitude)||!Number.isFinite(data.longitude)||Math.abs(data.latitude-point.lat)>1e-6||Math.abs(data.longitude-point.lon)>1e-6)throw new Error('SOURCE_COORDINATE_MISMATCH');
 const rowYears=data.years.map(r=>r.year);if(new Set(rowYears).size!==rowYears.length)throw new Error('DUPLICATE_SOURCE_YEAR');
 const quality=checkQuality(data,plan.metric,plan.start,plan.end),invalid=new Set(quality.invalid.map(r=>r.year));
 let series=metricSeries(data,plan.metric,plan.start,plan.end).map(r=>invalid.has(r.year)?{...r,value:null}:r);
 if(plan.mode==='pair')series=series.filter(r=>r.year===plan.start||r.year===plan.end);
 const valid=series.filter(r=>r.value!==null&&Number.isFinite(r.value));
 const values=valid.map(r=>r.value),first=series.find(r=>r.year===plan.start)?.value??null,last=series.find(r=>r.year===plan.end)?.value??null;
 return {series,count:valid.length,requestedCount:series.length,missing:series.filter(r=>r.value===null).map(r=>r.year),invalid:quality.invalid.filter(r=>series.some(v=>v.year===r.year)).map(r=>r.year),first,last,delta:first!==null&&last!==null?last-first:null,mean:values.length?mean(values):null,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,trend:plan.mode==='period'?linearTrend(series):null};
}
const num=(v,d=2)=>v===null||!Number.isFinite(v)?'—':v.toFixed(d);
export function analysisParagraph(data,plan,point,result,lang='ar'){
 const ar=lang==='ar',unit=plan.metric==='T2M'?'°C':plan.metric==='RH2M'?'%':ar?'وحدة المصدر قيد المراجعة':'source units under review',deltaUnit=plan.metric==='RH2M'?(ar?'نقطة مئوية':'percentage points'):unit;
 const place=ar?point.ar:point.en,metric=plan.metric==='T2M'?(ar?'درجة الحرارة':'air temperature'):plan.metric==='RH2M'?(ar?'الرطوبة النسبية':'relative humidity'):(ar?'الهطول':'precipitation');
 const source=ar?(data.isSnapshot?'الملف التاريخي المرفق والموسوم بأنه NASA POWER':'استجابة NASA POWER عبر الخادم'):(data.isSnapshot?'the supplied historical file labelled NASA POWER':'the server-retrieved NASA POWER response');
 const at=`${point.lat.toFixed(4)}°N, ${point.lon.toFixed(4)}°E`;
 const sentences=[ar?`وفق ${source} عند النقطة المرجعية ${place} (${at})، يتعلق هذا التحليل بـ${metric} (${plan.metric}).`:`Using ${source} for ${place} (${at}), this analysis concerns ${metric} (${plan.metric}).`];
 if(!result.count)return sentences[0]+' '+(ar?'لا توجد قيم سنوية صالحة للسنوات المطلوبة؛ لا يمكن تقديم مقارنة أو استنتاج، ولم تُستبدل البيانات المفقودة بأرقام.':'No valid annual values exist for the requested years. No comparison, substitute values or conclusion can be provided.');
 if(plan.mode==='single')sentences.push(ar?`بلغت القيمة السنوية في ${plan.start} ${num(result.first)} ${unit}.`:`The annual value in ${plan.start} was ${num(result.first)} ${unit}.`);
 else{
  sentences.push(ar?`بلغت القيمة السنوية في ${plan.start} ${num(result.first)} ${unit}، وفي ${plan.end} ${num(result.last)} ${unit}.`:`The annual value was ${num(result.first)} ${unit} in ${plan.start} and ${num(result.last)} ${unit} in ${plan.end}.`);
  if(result.delta!==null)sentences.push(ar?`الفرق بين العام الأخير والأول ${num(result.delta)} ${deltaUnit} (${result.delta>0?'زيادة':result.delta<0?'انخفاض':'دون تغير في القيم المعروضة'}).`:`The later-minus-earlier difference is ${num(result.delta)} ${deltaUnit} (${result.delta>0?'increase':result.delta<0?'decrease':'no change in the reported values'}).`);
  if(plan.mode==='pair')sentences.push(ar?'هذه مقارنة لعامين منفصلين فقط، ولا تثبت اتجاهاً مناخياً أو دلالة إحصائية.':'This compares two individual years only; it does not establish a climate trend or statistical significance.');
 }
 if(plan.mode==='period'){
  sentences.push(ar?`خلال الفترة الشاملة ${plan.start}–${plan.end}، تتوفر ${result.count} من ${result.requestedCount} قيمة سنوية صالحة، بمتوسط حسابي للقيم السنوية ${num(result.mean)} ${unit}، وحد أدنى ${num(result.min)} وحد أعلى ${num(result.max)} ${unit}.`:`For the inclusive ${plan.start}–${plan.end} period, ${result.count} of ${result.requestedCount} annual values are valid. Their arithmetic mean is ${num(result.mean)} ${unit}; the minimum is ${num(result.min)} and maximum ${num(result.max)} ${unit}.`);
  if(result.trend?.valid){const t=result.trend,p=t.pValue===null?'—':t.pValue<.001?'<0.001':num(t.pValue,3);sentences.push(ar?`الانحدار الخطي الوصفي OLS يساوي ${num(t.perDecade,3)} ${deltaUnit} لكل عقد؛ p-value ${p}، ${t.significant?'ودال وفق اختبار OLS الأولي':'ولا يبلغ حد الدلالة 0.05 وفق اختبار OLS الأولي'}. هذا الاختبار غير مصحح للارتباط الذاتي ولا يثبت سبب التغير.`:`Descriptive OLS is ${num(t.perDecade,3)} ${deltaUnit} per decade (p-value ${p}; ${t.significant?'significant':'not significant'} at the preliminary 0.05 threshold). This test is not adjusted for serial correlation and does not establish causation.`);}
  if(plan.end-plan.start<10)sentences.push(ar?'الفترة القصيرة وحدها لا تكفي لإثبات تغير مناخي طويل الأمد.':'This short interval alone cannot establish long-term climate change.');
 }
 if(result.missing.length)sentences.push(ar?`السنوات المفقودة أو المستبعدة عددياً: ${result.missing.join('، ')}؛ لم تُقدّر أو تُملأ.`:`Missing or numerically excluded years: ${result.missing.join(', ')}; they were not estimated or filled.`);
 if(plan.metric==='PRECTOTCORR_SUM')sentences.push(ar?'وحدة تجميع الهطول ما زالت قيد المراجعة؛ لا تُفسّر هذه القيم تلقائياً كمليمترات سنوية.':'Precipitation aggregation units remain under review; these values must not automatically be labelled annual millimetres.');
 sentences.push(ar?'هذه قيمة خلية شبكية قرب النقطة، وليست متوسط المدينة أو المحافظة ولا قياس محطة أرضية مستقلة. لم يُجر هذا الجواب تحققاً مستقلاً جديداً؛ يمكن فحص المصدر في مختبر NASA.':'These are grid values near the point, not a city/governorate average or independent station measurement. This answer did not run a new independent verification; use the NASA Verification Lab to check the source.');
 return sentences.join(' ');
}
export function locationComparison(plan,items,lang='ar'){
 if(items.length!==2)return '';
 const ar=lang==='ar',[a,b]=items,unit=plan.metric==='T2M'?'°C':plan.metric==='RH2M'?(ar?'نقطة مئوية':'percentage points'):(ar?'وحدة المصدر قيد المراجعة':'source units under review');
 const shared=a.result.series.map((r,i)=>({year:r.year,a:r.value,b:b.result.series[i]?.year===r.year?b.result.series[i].value:null})).filter(r=>r.a!==null&&r.b!==null);
 if(!shared.length)return ar?'لا توجد سنوات صالحة مشتركة؛ لا يمكن حساب فرق موثوق بين الموقعين.':'There are no shared valid years, so a between-location difference cannot be calculated.';
 const identical=shared.every(r=>r.a===r.b),delta=mean(shared.map(r=>r.a-r.b));
 const names=ar?`${a.point.ar} ناقص ${b.point.ar}`:`${a.point.en} minus ${b.point.en}`;
 return (ar?`باستخدام السنوات الصالحة المشتركة فقط (${shared.length})، متوسط الفرق السنوي بين النقطتين (${names}) هو ${num(delta)} ${unit}. `:`Using only shared valid years (${shared.length}), the mean annual difference (${names}) is ${num(delta)} ${unit}. `)+(identical?(ar?'القيم متطابقة في السنوات المشتركة؛ لا تمثل مشاهدتين مستقلتين. ':'Values are identical in the shared years; they are not independent observations. '):'')+(ar?'المقارنة نقطية؛ اختلاف الإحداثيات لا يثبت استقلال الخليتين الشبكيتين.':'This is a point comparison; different coordinates do not prove independent grid cells.');
}
