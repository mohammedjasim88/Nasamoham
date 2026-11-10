/** Deterministic annual-data questions. No model, external tools, or generated measurements. */
import {metricSeries,checkQuality,linearTrend,mean} from './statistics.mjs';
export const normaliseQuestion=s=>String(s).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase();
const problem=(code,ar,en)=>({ok:false,code,message:{ar,en}});
/** Verified site knowledge, served locally without API fees or fabricated NASA values.
 * Return null for numeric climate questions so the ordinary evidence pipeline handles them.
 */
export function siteAnswer(question, lang='en') {
 const q=normaliseQuestion(question).trim();
 if(!q||q.length>600||/(?<!\d)(?:19|20)\d{2}(?!\d)/.test(q))return null;
 // Questions requesting climate values, comparisons or trends belong to the
 // numerical evidence pipeline even when they omit the year (use selected years).
 // Do not intercept them merely because they mention a variable or NASA.
 const metricWords=/temperature|humidity|precipitation|rainfall|\bt2m\b|\brh2m\b|prectotcorr|حرار|رطوب|هطول|امطار|مطر/;
 const numberIntent=/\b(?:what (?:is|was|were) (?:humidity|temperature|rainfall|precipitation) (?:in|at) |how (?:was|were) |what (?:is|was|were) the |how (?:hot|humid|much) |give me|show me|compare|analyse|analyze|trend|difference|average of|value of|average|mean)\b|كم (?:بلغ|كانت|كان|مقدار)|ما (?:هي|هو|كانت|كان) |اعطني|اعرض|قارن|حلل|قيمه|متوسط/;
 const informationIntent=/مصدر|من اين|من وين|كيف.*تحقق|كيف.*استخدم|ما معني|ما هو.*(?:t2m|rh2m)|\bsource\b|\bapi key\b|\bwhere.*\bdata\b|\bverify\b|\baccuracy\b|\bhow to\b|\bwhat is (?:t2m|rh2m|prectotcorr)/;
 if(metricWords.test(q)&&numberIntent.test(q)&&!informationIntent.test(q))return null;
 const entries=[
  {id:'source',test:/ناسا|nasa|مصدر|من وين|من اين|المعلومات|source|api key|مفتاح.*api|بيانات.*جات|data.*from/,
   ar:'تأتي القراءات التاريخية من خدمة NASA POWER العامة لبيانات المناخ، ويطلب الخادم القيم بحسب خط العرض وخط الطول والفترة. لا يحتاج هذا المسار إلى NASA API key في إعدادات المشروع الحالية. البيانات تقديرات شبكية تاريخية وليست قياسات محطة أرضية أو طقساً مباشراً. يمكنك فحص طلب المصدر الأصلي من التحليل أو مختبر التحقق.',
   en:'Historical values are retrieved from the public NASA POWER climate-data service by latitude, longitude and time period. This project does not need a NASA API key for its current POWER requests. The values are historical gridded estimates, not direct weather-station readings or live weather. Source requests are accessible from analyses and the verification lab.',
   url:'https://power.larc.nasa.gov/'},
  {id:'accuracy',test:/دقه|صحه|تحقق|موثوق|مؤكد|صفر.*خطا|accuracy|accurate|verification|verify|reliable|validate|trust/,
   ar:'يفحص الموقع بنية الاستجابة والقيم المفقودة والحدود الرقمية، ويوفر مختبر NASA للمقارنة مع ملف CSV من المصدر. تطابق القيم يثبت اتفاق النقل والمعالجة، لكنه لا يثبت دقة كل خلية مقابل قياس أرضي أو حدوداً إدارية معتمدة قانونياً. لا يمكن ضمان خطأ يساوي صفراً.',
   en:'The website checks response structure, missing values and numeric bounds. Its NASA verification lab can compare downloaded source CSV data with the displayed records. Matching records establish consistency, not independent ground-truth accuracy for a grid cell or legally certified boundary geometry. Zero error cannot be guaranteed.',
   url:'https://power.larc.nasa.gov/'},
  {id:'geometry',test:/الخريط|حدود|ولايات|محافظات|موقع|احداثيات|map|boundar|location|coordinate|wilayat|governorate|satellite/,
   ar:'الخريطة تستخدم MapLibre مع مصادر خرائط مفتوحة. تقع العلامات عند إحداثيات جغرافية حقيقية، وتُحمَّل حدود المحافظات والولايات من خدمة NCSI عند توافرها. لا تُرسَم حدود تخمينية عندما تفشل الخدمة، ولا تعني نقطة العينة متوسط الولاية أو المحافظة.',
   en:'The map uses MapLibre with open map tile providers. Markers use geographic coordinates, and governorate/wilayat outlines are requested from Oman NCSI when available. The app does not invent missing borders; a sample location is not a whole governorate or wilayat average.',
   url:'https://maplibre.org/'},
  {id:'variables',test:/متغيرات|t2m|rh2m|prectotcorr|درجه حرار|رطوب|هطول|امطار|ماذا.*يقيس|parameters|metrics|variables|humidity|temperature|rainfall|precipitation/,
   ar:'يعرض المشروع T2M لدرجة حرارة الهواء عند ارتفاع مترين، وRH2M للرطوبة النسبية عند مترين، وPRECTOTCORR_SUM للهطول من NASA POWER. يجب التحقق من وحدات تجميع الهطول قبل وصف قيمه بأنها مليمترات سنوية. استخدم المستكشف والاتجاهات للمقارنة الزمنية.',
   en:'The project supports T2M (air temperature at 2 m), RH2M (relative humidity at 2 m), and PRECTOTCORR_SUM (precipitation from NASA POWER). Verify rainfall aggregation units before treating annual totals as millimetres. Use the Explorer and Trends views for temporal comparisons.',
   url:'https://power.larc.nasa.gov/'},
  {id:'realtime',test:/اليوم|الان|طقس|بكره|غدا|مباشر|توقع|live|real.time|current weather|forecast|today|tomorrow/,
   ar:'الموقع ليس خدمة توقعات طقس ولا يعرض قياسات آنية. تحليلاته مخصصة للسجلات المناخية التاريخية. لتقييم طقس اليوم أو التوقعات استخدم جهة أرصاد رسمية مستقلة.',
   en:'This is a historical climate-data explorer, not a live weather or forecasting service. For current conditions or forecasts, consult an official meteorological provider.',
   url:'https://power.larc.nasa.gov/'},
  {id:'usage',test:/كيف.*استخدم|شرح.*الموقع|مساعده|طريقة|اقسام|how to|use the site|help|navigation|features/,
   ar:'ابدأ من المستكشف لاختيار نقطة وقياس وسنوات، ثم افتح اتجاهات المناخ أو المقارنة. افتح مختبر التحقق لتطابق ملفات NASA الأصلية مع القيم المعروضة، واستخدم مساعد البيانات لطرح سؤال محدد يتضمن الموقع والمتغير والسنة أو الفترة.',
   en:'Use Explorer to choose a sample point, climate variable and years. Review Trends or Compare, then open NASA Verification Lab to check source CSV values. Ask the evidence assistant a question containing a location, variable and year or annual period.',
   url:'https://power.larc.nasa.gov/'},
  {id:'assistant',test:/ذكاء اصطناعي|المساعد|النموذج|ai assistant|chatgpt|language model|model|artificial intelligence/,
   ar:'يستطيع مساعد البيانات الحالي تفسير الأسئلة السنوية وحساب المقارنات مع إظهار مصدر كل رقم، من دون API مدفوع. لا يعمل كنموذج محادثة عامًا ولا يجيب عن كل موضوع. خيار Workers AI التوليدي لا يعمل إلا بعد تهيئة ربط AI في Cloudflare والتحقق من حدود الاستخدام.',
   en:'The current evidence assistant parses annual climate questions and computes source-linked comparisons without a paid API. It is not a general-purpose chat model. Generative Workers AI requires a separately configured Cloudflare AI binding and quota verification.',
   url:'https://developers.cloudflare.com/workers-ai/'},
 ];
 // Interpret specific intents before broad source wording, to avoid routing all NASA queries to source.
 const preferred=['realtime','accuracy','usage','source','geometry','assistant','variables'];
 for(const id of preferred){
  const e=entries.find(item=>item.id===id);
  if(e.test.test(q)){
   const both=id==='accuracy'&&entries[0].test.test(q);
   const answer=lang==='ar'?e.ar:e.en;
   return {id,answer:both?(lang==='ar'?entries[0].ar+' '+answer:entries[0].en+' '+answer):answer,url:e.url};
  }
 }
 return null;
}

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
 if(!locations.length&&/(?:\boman\b|عمان|السلطنه)/.test(q))return problem('POINT_ONLY','لا يمكن اعتبار نقطة واحدة متوسط سلطنة عُمان. اختر مدينة أو نقطة عينة محددة.','A single reference point is not an Oman-wide average. Choose a supported city or sample point.');
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
