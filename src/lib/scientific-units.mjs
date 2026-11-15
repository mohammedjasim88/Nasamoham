export function displayMetricUnit(metric, reportedUnit, fallbackUnit) {
 if (typeof reportedUnit !== 'string' || !reportedUnit.trim()) return fallbackUnit;
 const normalized = reportedUnit.trim().toLowerCase().replace(/\s+/g, ' ');
 if (metric === 'T2M' && ['c', '°c', 'deg c', 'degree c', 'degrees c', 'degree celsius', 'degrees celsius', 'celsius'].includes(normalized)) return '°C';
 if (metric === 'RH2M' && ['%', 'percent', 'percentage'].includes(normalized)) return '%';
 return reportedUnit.trim();
}
