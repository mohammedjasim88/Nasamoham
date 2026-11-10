/** Deterministic interaction physics. No dependency on WebGL or the DOM. */
export function shortestTurn(from, to) {
 if(!Number.isFinite(from)||!Number.isFinite(to)) throw new RangeError('INVALID_GLOBE_ANGLE');
 return ((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
}
/** Momentum decays frame-rate independently: the same spin settles on mobile and desktop. */
export function dampMomentum(velocity, dt, friction=4.8) {
 if(!Number.isFinite(velocity)||!Number.isFinite(dt)||dt<0||dt>.25||!Number.isFinite(friction)||friction<0)throw new RangeError('INVALID_GLOBE_MOMENTUM');
 const next=velocity*Math.exp(-friction*dt);
 return Math.abs(next)<.008?0:next;
}
/** Limit bursty touch events; measured in radians per second. */
export function dragVelocity(pixels, elapsedMs, radiansPerPixel) {
 if(![pixels,elapsedMs,radiansPerPixel].every(Number.isFinite)||elapsedMs<=0||radiansPerPixel<0)throw new RangeError('INVALID_GLOBE_DRAG');
 return Math.max(-3.2,Math.min(3.2,pixels*radiansPerPixel*1000/elapsedMs));
}
