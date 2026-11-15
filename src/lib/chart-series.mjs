export function alignAnnualSeries(primary, secondary = []) {
 const records = [primary, secondary];
 const indexed = records.map(series => {
  const values = new Map();
  for (const record of series) {
   if (!Number.isInteger(record.year)) throw new TypeError('Annual observations need integer years');
   if (values.has(record.year)) throw new TypeError(`Duplicate annual observation for ${record.year}`);
   values.set(record.year, record.value === null || Number.isFinite(record.value) ? record.value : null);
  }
  return values;
 });
 const observedYears = indexed.flatMap(values => [...values.keys()]);
 if (!observedYears.length) return {years: [], primary: [], secondary: []};
 const firstYear = Math.min(...observedYears);
 const lastYear = Math.max(...observedYears);
 const years = Array.from({length: lastYear - firstYear + 1}, (_, index) => firstYear + index);
 const align = values => years.map(year => values.has(year) ? values.get(year) : null);
 return {years, primary: align(indexed[0]), secondary: align(indexed[1])};
}
