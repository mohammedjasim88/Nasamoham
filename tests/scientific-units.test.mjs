import test from 'node:test';
import assert from 'node:assert/strict';
import {displayMetricUnit} from '../src/lib/scientific-units.mjs';

test('known NASA temperature and humidity unit aliases share a clear display label', () => {
 assert.equal(displayMetricUnit('T2M','C',''), '°C');
 assert.equal(displayMetricUnit('T2M','degrees Celsius',''), '°C');
 assert.equal(displayMetricUnit('RH2M','Percent',''), '%');
});

test('unknown and precipitation units are retained rather than inferred', () => {
 assert.equal(displayMetricUnit('PRECTOTCORR_SUM','mm','NASA unit unverified'), 'mm');
 assert.equal(displayMetricUnit('PRECTOTCORR_SUM','NASA unit unverified','NASA unit unverified'), 'NASA unit unverified');
 assert.equal(displayMetricUnit('T2M',undefined,'°C'), '°C');
});
