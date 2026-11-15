import {useMemo, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {ExternalLink, ShieldCheck} from 'lucide-react';
import {formatNumber} from '../lib/evidence';
import type {AssistantStudy, AssistantStudyItem} from '../lib/assistant-study';
import './PairStudy.css';
import {InteractiveTrendChart} from './InteractiveTrendChart';

type Props = {study: AssistantStudy; theme:'dark'|'light'};
type ChartPoint = {item: AssistantStudyItem; itemIndex: number; year: number; value: number; x: number; y: number};

function PairChart({study}: {study: AssistantStudy}) {
 const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);
 const ar = study.lang === 'ar';
 const years = [...new Set([study.plan.start, study.plan.end])].sort((a, b) => a - b);
 const comparableUnits = new Set(study.items.map(item => item.unit)).size <= 1;
 const model = useMemo(() => {
  const W = 720, H = 260, L = 68, R = 22, T = 18, B = 44;
  const values = study.items.flatMap(item => item.values)
   .filter((row): row is {year: number; value: number} => row.value !== null && Number.isFinite(row.value));
  if (!values.length) return {W, H, L, R, T, B, axis: [], points: [] as ChartPoint[]};
  const min = Math.min(...values.map(row => row.value));
  const max = Math.max(...values.map(row => row.value));
  const padding = Math.max((max - min) * .18, Math.abs(min) * .05, 1);
  const lo = min - padding, hi = max + padding;
  const xForYear = (year: number) => {
   const index = Math.max(0, years.indexOf(year));
   return years.length < 2 ? (L + W - R) / 2 : L + index * (W - L - R);
  };
  const yForValue = (value: number) => T + ((hi - value) / (hi - lo)) * (H - T - B);
  const axis = [0, .25, .5, .75, 1].map(fraction => ({
   y: T + fraction * (H - T - B),
   value: hi - fraction * (hi - lo)
  }));
  const points = study.items.flatMap((item, itemIndex) => item.values.flatMap(row => {
   if (row.value === null || !Number.isFinite(row.value)) return [];
   const offset = study.items.length > 1 ? (itemIndex - (study.items.length - 1) / 2) * 18 : 0;
   return [{item, itemIndex, year: row.year, value: row.value, x: xForYear(row.year) + offset, y: yForValue(row.value)}];
  }));
  return {W, H, L, R, T, B, axis, points};
 }, [study, years]);

 const pointLabel = (point: ChartPoint) =>
  `${ar ? point.item.point.ar : point.item.point.en}, ${point.year}: ${formatNumber(point.value)} ${point.item.unit}`;

 return <div className="pair-chart">
  <div className="pair-chart-legend">
   {study.items.map((item, index) => <span key={item.point.id}>
    <i className={index === 0 ? 'pair-legend-a' : 'pair-legend-b'}/>
    {ar ? item.point.ar : item.point.en}
   </span>)}
  </div>
  {!comparableUnits ? <p className="pair-no-values" role="note">
   {ar ? 'وحدات المصادر ليست متطابقة؛ أُخفي المخطط المشترك لتجنب مقارنة غير صالحة. راجع القيم والوحدات منفصلة في الجدول.' :
    'Source units differ, so a shared-axis chart is hidden to avoid an invalid comparison. Review each value and unit separately in the table.'}
  </p> : model.points.length ? <>
   <svg viewBox={`0 0 ${model.W} ${model.H}`} role="img"
    aria-label={ar ? 'مخطط نقطي لقيم العامين المحددين، دون خط اتجاه' : 'Point chart of the two selected annual values, with no trend line'}
    preserveAspectRatio="xMidYMid meet">
    {model.axis.map((tick, index) => <g key={index}>
     <line className="pair-grid" x1={model.L} y1={tick.y} x2={model.W - model.R} y2={tick.y}/>
     <text className="pair-axis-label" x={model.L - 9} y={tick.y + 4} textAnchor="end">
      {formatNumber(tick.value, Math.abs(tick.value) > 100 ? 0 : 1)}
     </text>
    </g>)}
    {years.map(year => {
     const x = model.L + years.indexOf(year) * (model.W - model.L - model.R);
     return <text key={year} className="pair-axis-label" x={x} y={model.H - 10} textAnchor="middle">{year}</text>;
    })}
    {model.points.map(point => {
     const description = pointLabel(point);
     const selectPoint = () => setActivePoint(point);
     const onKeyDown = (event: KeyboardEvent<SVGElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
       event.preventDefault();
       selectPoint();
      }
     };
     return point.itemIndex === 0 ?
      <circle key={`${point.item.point.id}-${point.year}`} className="pair-point pair-point-a"
       cx={point.x} cy={point.y} r={activePoint?.item.point.id === point.item.point.id && activePoint.year === point.year ? 7 : 5}
       role="button" tabIndex={0} aria-label={description} onFocus={selectPoint}
       onPointerEnter={selectPoint} onClick={selectPoint} onKeyDown={onKeyDown}>
       <title>{description}</title>
      </circle> :
      <path key={`${point.item.point.id}-${point.year}`} className="pair-point pair-point-b"
       d={`M ${point.x} ${point.y - 6} L ${point.x + 6} ${point.y} L ${point.x} ${point.y + 6} L ${point.x - 6} ${point.y} Z`}
       role="button" tabIndex={0} aria-label={description} onFocus={selectPoint}
       onPointerEnter={selectPoint} onClick={selectPoint} onKeyDown={onKeyDown}>
       <title>{description}</title>
      </path>;
    })}
   </svg>
   <p className="pair-inspection" aria-live="polite">
    {activePoint ? pointLabel(activePoint) : (ar ? 'اختر نقطة لفحص قيمة المصدر.' : 'Focus a point to inspect its source value.')}
   </p>
  </> : <p className="pair-no-values" role="status">
   {ar ? 'لا توجد قيم رقمية صالحة لهذين العامين؛ لم تُقدّر القيم المفقودة أو تُملأ.' : 'No valid numeric values are available for these years. Missing values were not estimated or filled.'}
  </p>}
 </div>;
}

export default function PairStudy({study,theme}: Props) {
 const ar = study.lang === 'ar';
 const years = [...new Set(study.items.flatMap(item=>item.values.map(row=>row.year)))].sort((a,b)=>a-b);
 const pair=study.plan.mode==='pair';
 const title = pair?(ar ? 'مقارنة العامين المحددين' : 'Two-year comparison'):(ar?'تحليل القيم السنوية':'Annual values analysis');
 return <div className="pair-study">
  <section className="panel pair-analysis" id="pair-analysis" tabIndex={-1}>
   <div className="panel-title">
    <div><p className="eyebrow">{ar ? 'تحليل مقيد بالمصدر' : 'SOURCE-BOUND ANALYSIS'}</p><h2>{title} · {study.plan.metric}</h2></div>
    <ShieldCheck size={22}/>
   </div>
   <p className="pair-question">{study.question}</p>
   <p className="pair-summary">{study.summary}</p>
   {study.comparison && <p className="pair-location-comparison">{study.comparison}</p>}
   <div className="pair-context">
    <span><b>{ar ? 'المتغير' : 'Metric'}</b>{study.plan.metric}</span>
    <span><b>{ar ? 'السنوات' : 'Years'}</b><bdi dir="ltr">{pair?years.join(' · '):study.plan.start===study.plan.end?study.plan.start:`${study.plan.start}–${study.plan.end} (${years.length})`}</bdi></span>
    <span><b>{ar ? 'المواقع' : 'Locations'}</b>{study.items.map(item => ar ? item.point.ar : item.point.en).join(' · ')}</span>
   </div>
   {pair&&<p className="pair-integrity">
    {ar ? 'هذه مقارنة بين قيمتين سنويتين فقط، وليست اتجاهاً زمنياً أو اختبار دلالة أو إثباتاً للسببية. القيم المفقودة تبقى مفقودة.' :
     'This compares only two annual values; it is not a time trend, significance test, or evidence of causation. Missing values remain missing.'}
   </p>}
  </section>

  <section className="panel pair-chart-panel" id="pair-chart" tabIndex={-1}>
   <div className="panel-title">
    <div><p className="eyebrow">{ar ? 'قيم المصدر السنوية' : 'ANNUAL SOURCE VALUES'}</p><h2>{pair?(ar ? 'مخطط نقطي للعامين' : 'Two-year point chart'):(ar?'القيم السنوية للفترة المطلوبة':'Annual values for the requested period')}</h2></div>
    <span className="pill-secondary">{study.items[0]?.unit}</span>
   </div>
   {pair?<PairChart study={study}/>:new Set(study.items.map(item=>item.unit)).size>1?<p role="note">{ar?'وحدات المصدرين مختلفة؛ راجع جدول القيم.':'Source units differ; inspect the values table.'}</p>:<InteractiveTrendChart series={study.items[0].values} other={study.items[1]?.values} label={ar?study.items[0].point.ar:study.items[0].point.en} secondLabel={study.items[1]?(ar?study.items[1].point.ar:study.items[1].point.en):undefined} unit={study.items[0].unit} lang={study.lang} theme={theme}/>}
   <div className="pair-value-table-wrap"><table className="pair-value-table">
    <caption>{ar ? 'القيم السنوية المستخدمة في هذه المقارنة' : 'Annual source values used in this comparison'}</caption>
    <thead><tr><th scope="col">{ar ? 'السنة' : 'Year'}</th>{study.items.map(item =>
     <th scope="col" key={item.point.id}>{ar ? item.point.ar : item.point.en}<br/><small>{item.unit}</small></th>)}</tr></thead>
    <tbody>{years.map(year => <tr key={year}><th scope="row">{year}</th>{study.items.map(item => {
     const row = item.values.find(value => value.year === year);
     return <td key={item.point.id}>{row?.value === null || row === undefined ?
      (ar ? 'مفقود / غير متاح' : 'Missing / unavailable') : formatNumber(row.value)}</td>;
    })}</tr>)}</tbody>
   </table></div>
   <div className="pair-citations">{study.items.map(item => <article key={item.point.id}>
    <strong>{ar ? item.point.ar : item.point.en}</strong>
    <span>{item.source}{item.isSnapshot ? (ar ? ' · ملف عينة تاريخي' : ' · supplied historical snapshot') : ''}</span>
    <span>{item.point.lat.toFixed(4)}°N, {item.point.lon.toFixed(4)}°E</span>
    {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
     {ar ? 'طلب NASA POWER المطابق للنقطة والفترة' : 'Matching NASA POWER request for this point and period'}<ExternalLink size={13}/>
    </a>}
    <p>{item.paragraph}</p>
   </article>)}</div>
   {study.plan.metric === 'PRECTOTCORR_SUM' && <p className="pair-integrity" role="note">
    {ar ? 'وحدة تجميع الأمطار وتفسير القيم الشاذة تحتاج تحققاً مستقلاً من NASA.' :
     'Precipitation aggregation units and any outliers require independent verification with NASA.'}
   </p>}
  </section>
 </div>;
}
