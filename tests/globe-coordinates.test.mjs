import test from 'node:test';
import assert from 'node:assert/strict';
import {SphereGeometry,Vector3,Euler,MathUtils} from 'three';
import {globeCoordinates} from '../src/lib/globe-coordinates.mjs';
test('globe longitude matches actual installed SphereGeometry UV vertices',()=>{
 const sphere=new SphereGeometry(1,72,36),uv=sphere.getAttribute('uv'),position=sphere.getAttribute('position');let checked=0;
 for(let i=0;i<uv.count;i++){
  const v=uv.getY(i);if(v<.03||v>.97)continue;
  const lon=uv.getX(i)*360-180,lat=v*180-90;
  const expected=new Vector3(...globeCoordinates(lon,lat));
  const actual=new Vector3().fromBufferAttribute(position,i);
  assert.ok(expected.distanceTo(actual)<1e-6,`UV mismatch at lon ${lon}, lat ${lat}`);checked++;
 }
 assert.ok(checked>1000);sphere.dispose();
});
test('Oman focus faces the camera with north up instead of the mirrored longitude',()=>{
 const point=new Vector3(...globeCoordinates(57.5,21.5));
 point.applyEuler(new Euler(MathUtils.degToRad(21.5),MathUtils.degToRad(-147.5),0,'XYZ'));
 assert.ok(Math.abs(point.x)<1e-12&&Math.abs(point.y)<1e-12&&point.z>.999);
 const wrong=new Vector3(...globeCoordinates(-57.5,21.5));wrong.applyEuler(new Euler(MathUtils.degToRad(21.5),MathUtils.degToRad(-147.5),0,'XYZ'));
 assert.ok(wrong.z<.1);
});
test('invalid globe coordinates fail without silently mirroring or clamping geography',()=>{
 for(const coords of [[NaN,20],[181,20],[58,91],[58,20,0]])assert.throws(()=>globeCoordinates(...coords));
});
