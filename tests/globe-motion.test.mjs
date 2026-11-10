import test from 'node:test';
import assert from 'node:assert/strict';
import {shortestTurn,dampMomentum,dragVelocity} from '../src/lib/globe-motion.mjs';

test('globe refocus takes the nearest turn around longitude ±180°',()=>{
 assert.ok(Math.abs(shortestTurn(Math.PI-.06,-Math.PI+.06)-.12)<1e-9);
 assert.ok(Math.abs(shortestTurn(-Math.PI+.06,Math.PI-.06)+.12)<1e-9);
 assert.equal(shortestTurn(0,0),0);
});
test('momentum decays identically per elapsed time at different frame rates',()=>{
 const one=dampMomentum(1,.1);
 const two=dampMomentum(dampMomentum(1,.05),.05);
 assert.ok(Math.abs(one-two)<1e-12);
 assert.ok(one<1&&one>0);
 assert.equal(dampMomentum(.005,.02),0);
});
test('touch release speed is bounded and rejects invalid inputs',()=>{
 assert.equal(dragVelocity(100,1,.0042),3.2);
 assert.equal(dragVelocity(-100,1,.0042),-3.2);
 assert.ok(dragVelocity(8,16,.0042)>.01);
 assert.throws(()=>dampMomentum(2,-.01));
 assert.throws(()=>dragVelocity(5,0,.004));
});
