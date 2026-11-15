import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {globeCoordinates} from '../lib/globe-coordinates.mjs';
import {shortestTurn, dampMomentum, dragVelocity} from '../lib/globe-motion.mjs';

/** NASA Blue Marble surface projected on an actual spherical WebGL mesh.
 * Outline is fetched from the same NCSI-validated service as the Explorer.
 * If that service fails we show an accurately positioned location marker,
 * never an invented country border.
 */
export type EarthRenderEvidence={frames:number;drawCalls:number;textureWidth:number;canvasWidth:number;canvasHeight:number;centerPixel:number[];webglVersion:string};
export default function EarthGlobe({focusSignal=0,lang='en',onRenderState,onRenderEvidence}:{focusSignal?:number;lang?:'en'|'ar';onRenderState?:(state:'loading'|'ready'|'fallback')=>void;onRenderEvidence?:(evidence:EarthRenderEvidence)=>void}){
 const canvasRef=useRef<HTMLCanvasElement|null>(null);
 const labelRef=useRef<HTMLDivElement|null>(null);
 const controllerRef=useRef<{focus:()=>void}|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');
 const [outline,setOutline]=useState<'loading'|'ready'|'unavailable'>('unavailable');
 const initial=useRef(true);
 useEffect(()=>{onRenderState?.(status);},[status,onRenderState]);
 useEffect(()=>{
  if(initial.current){initial.current=false;return;}
  controllerRef.current?.focus();
 },[focusSignal]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  let gl:WebGL2RenderingContext|null=null;
  try{gl=canvas.getContext('webgl2',{alpha:true,antialias:true});}catch{setStatus('fallback');return;}
  if(!gl){setStatus('fallback');return;}
  let disposed=false,frame=0,last=0,lastRender=0,active=true,contextAvailable=true,dragging=false,hovering=false,pausedUntil=0;
  const compactGpu=window.matchMedia('(max-width: 790px)').matches;
  // Mobile renders fewer geometry triangles and frames; surface texture remains unchanged.
  const minFrameMs=1000/(compactGpu?30:45);
  let lastX=0,lastY=0,lastMoveAt=0,velocityX=0,velocityY=0,focusTime=-1,focusOriginY=0,focusOriginX=0,focusOriginZ=6.35;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,context:gl,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setStatus('fallback');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compactGpu?1.2:1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(39,1,.1,50);camera.position.set(0,0,6.35);
  const globe=new THREE.Group();globe.rotation.order='XYZ';
  // Look at the Arabian Peninsula / Oman, with north close to the top.
  const HOME_Y=THREE.MathUtils.degToRad(-147.5);
  const HOME_X=THREE.MathUtils.degToRad(21.5);
  globe.rotation.y=HOME_Y;globe.rotation.x=HOME_X;scene.add(globe);
  const radius=2.1;
  const sphere=new THREE.SphereGeometry(radius,compactGpu?64:96,compactGpu?40:64);
  const earthMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
  const earthMesh=new THREE.Mesh(sphere,earthMat);
  // Preserve the ready-to-see NASA still until the GPU texture has actually loaded.
  earthMesh.visible=false;globe.add(earthMesh);
  const texture=new THREE.TextureLoader().load('/assets/nasa-blue-marble.webp',loaded=>{
   if(disposed)return;
   loaded.colorSpace=THREE.SRGBColorSpace;
   loaded.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
   earthMat.map=loaded;earthMat.needsUpdate=true;earthMesh.visible=true;setStatus('ready');if(reducedMotion)renderStill();
  },undefined,()=>{if(!disposed)setStatus('fallback');});
  const cloudsTex=new THREE.TextureLoader().load('/assets/subtle-clouds.webp',()=>{if(!disposed&&reducedMotion)renderStill();},undefined,()=>{});
  cloudsTex.colorSpace=THREE.SRGBColorSpace;
  const cloudsMat=new THREE.MeshBasicMaterial({map:cloudsTex,transparent:true,depthWrite:false,opacity:.44});
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.006,compactGpu?48:80,compactGpu?30:48),cloudsMat);
  globe.add(clouds);
  scene.add(new THREE.HemisphereLight(0xbedfff,0x071b3b,1.6));
  const sun=new THREE.DirectionalLight(0xfff9ec,2.55);sun.position.set(4.4,2.2,5.1);scene.add(sun);
  const blueFill=new THREE.DirectionalLight(0x2789d4,.62);blueFill.position.set(-4,-1,-3);scene.add(blueFill);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.085,compactGpu?56:96,compactGpu?36:64),new THREE.ShaderMaterial({
   uniforms:{glowColor:{value:new THREE.Color('#25cfff')}},
   vertexShader:`varying vec3 vNormal;varying vec3 vEye;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
   fragmentShader:`uniform vec3 glowColor;varying vec3 vNormal;varying vec3 vEye;void main(){float edge=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),3.3);gl_FragColor=vec4(glowColor,edge*.68);}`,
   side:THREE.BackSide,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false
  }));scene.add(atmosphere);
  // SphereGeometry has x=-cos(2πu), z=+sin(2πu). With u=(lon+180)/360,
  // east-positive geographical longitude maps to NEGATIVE local z.
  const toSphere=(lon:number,lat:number,r=radius*1.015)=>new THREE.Vector3(...globeCoordinates(lon,lat,r));
  const pointPosition=toSphere(57.5,21.5,radius*1.026);
  const point=new THREE.Mesh(new THREE.SphereGeometry(.039,18,12),new THREE.MeshBasicMaterial({color:0xb9faff}));
  point.position.copy(pointPosition);globe.add(point);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.092,20,16),new THREE.MeshBasicMaterial({color:0x00d9ff,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending}));
  halo.position.copy(pointPosition);globe.add(halo);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.099,.103,64),new THREE.MeshBasicMaterial({color:0x13edff,transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide}));
  ring.position.copy(pointPosition);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),pointPosition.clone().normalize());globe.add(ring);
  const outlineMaterial=new THREE.LineBasicMaterial({color:0x0fe9fb,transparent:true,opacity:.97,depthTest:true});
  const outlineLines:THREE.Line[]=[];
  const abort=new AbortController();
  // NCSI is the authoritative provider used in the project's existing map.
  setOutline('loading');
  fetch('/api/boundaries?level=governorates',{signal:abort.signal})
   .then(async response=>{if(!response.ok)throw new Error(`NCSI ${response.status}`);return response.json();})
   .then((fc:{features?:Array<{geometry?:{type?:string;coordinates?:unknown}}>})=>{
    if(disposed||!Array.isArray(fc.features)||fc.features.length!==11)throw new Error('Not 11 validated governorate polygons');
    for(const feature of fc.features){
     const geo=feature.geometry;
     if(!geo||!Array.isArray(geo.coordinates))continue;
     // Exterior rings only; avoids flooding the globe with dense hole outlines.
     const polygons=geo.type==='MultiPolygon'?geo.coordinates:geo.type==='Polygon'?[geo.coordinates]:[];
     for(const polygon of polygons as number[][][][]){
      const exterior=polygon?.[0];if(!Array.isArray(exterior)||exterior.length<3)continue;
      const stride=Math.max(1,Math.ceil(exterior.length/800));
      const vertices=exterior.filter((_,i)=>i%stride===0||i===exterior.length-1)
       .filter(v=>Array.isArray(v)&&Number.isFinite(v[0])&&Number.isFinite(v[1]))
       .map(([longitude,latitude])=>toSphere(longitude,latitude,radius*1.018));
      if(vertices.length<3)continue;
      if(vertices[0].distanceTo(vertices[vertices.length-1])>.002)vertices.push(vertices[0].clone());
      const geometry=new THREE.BufferGeometry().setFromPoints(vertices);
      const line=new THREE.Line(geometry,outlineMaterial);globe.add(line);outlineLines.push(line);
     }
    }
    if(outlineLines.length){setOutline('ready');}else setOutline('unavailable');
    if(reducedMotion)renderStill();
   }).catch(()=>{if(!disposed)setOutline('unavailable');});
  const resize=()=>{
   if(disposed)return;
   const parent=canvas.parentElement;
   if(!parent)return;
   const w=Math.max(1,parent.clientWidth),h=Math.max(1,parent.clientHeight);
   camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
   if(reducedMotion)renderStill();
  };
  const placeLabel=()=>{
   const label=labelRef.current;if(!label)return;
   const world=pointPosition.clone();globe.localToWorld(world);
   const p=world.clone().project(camera);
   const w=canvas.clientWidth,h=canvas.clientHeight;
   label.style.left=`${(p.x*.5+.5)*w}px`;label.style.top=`${(-p.y*.5+.5)*h}px`;
   label.style.opacity=world.z<radius*.35||Math.abs(p.x)>1||Math.abs(p.y)>1?'0':'1';
  };
  let renderedFrames=0,evidenceSent=false;
  const renderStill=()=>{placeLabel();renderer.render(scene,camera);renderedFrames++;
   if(onRenderEvidence&&!evidenceSent&&earthMesh.visible&&renderedFrames>=(reducedMotion?1:3)){
    const context=renderer.getContext(),pixel=new Uint8Array(4);
    context.readPixels(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1,context.RGBA,context.UNSIGNED_BYTE,pixel);
    evidenceSent=true;onRenderEvidence({frames:renderedFrames,drawCalls:renderer.info.render.calls,textureWidth:(earthMat.map?.image as {width?:number}|undefined)?.width||0,canvasWidth:canvas.width,canvasHeight:canvas.height,centerPixel:Array.from(pixel),webglVersion:String(context.getParameter(context.VERSION))});
   }
  };
  const animate=(now:number)=>{
   frame=0;
   if(disposed)return;
   if(!active||document.hidden){last=now;return;}
   frame=requestAnimationFrame(animate);
   if(lastRender&&now-lastRender<minFrameMs)return;
   const dt=last?Math.min(.06,(now-last)/1000):0;
   last=now;lastRender=now;
   if(focusTime>=0){
    const p=Math.min(1,(now-focusTime)/680),ease=1-Math.pow(1-p,3);
    globe.rotation.y=focusOriginY+shortestTurn(focusOriginY,HOME_Y)*ease;
    globe.rotation.x=focusOriginX+(HOME_X-focusOriginX)*ease;
    camera.position.z=focusOriginZ+(5.65-focusOriginZ)*ease;
    if(p>=1)focusTime=-1;
   }else if(!dragging&&!reducedMotion){
    if(Math.abs(velocityX)+Math.abs(velocityY)>.008){
     globe.rotation.y+=velocityY*dt;
     globe.rotation.x=THREE.MathUtils.clamp(globe.rotation.x+velocityX*dt,-.6,.65);
     velocityY=dampMomentum(velocityY,dt);velocityX=dampMomentum(velocityX,dt);
    }else{
     velocityX=0;velocityY=0;
     if(!hovering&&now>pausedUntil)globe.rotation.y-=dt*Math.PI*2/120;
    }
   }
   if(!reducedMotion)clouds.rotation.y+=dt*.0014;
   if(!reducedMotion)ring.material.opacity=.56+.28*Math.sin(now*.0016);
   renderStill();
  };
  const handleDown=(event:PointerEvent)=>{
   if(event.button!==0)return;
   focusTime=-1;dragging=true;hovering=false;lastX=event.clientX;lastY=event.clientY;lastMoveAt=performance.now();velocityX=0;velocityY=0;
   canvas.setPointerCapture(event.pointerId);pausedUntil=performance.now()+6000;
  };
  const handleMove=(event:PointerEvent)=>{
   if(!dragging)return;
   const dx=event.clientX-lastX,dy=event.clientY-lastY;
   lastX=event.clientX;lastY=event.clientY;
   const now=performance.now(),elapsed=Math.max(8,Math.min(70,now-lastMoveAt));lastMoveAt=now;
   const sensitivity=event.pointerType==='touch'?.0042:.0038;
   globe.rotation.y+=dx*sensitivity;
   globe.rotation.x=THREE.MathUtils.clamp(globe.rotation.x+dy*sensitivity*.66,-.6,.65);
   // Smoothed angular velocity gives a physical, slowly settling release rather than an abrupt stop.
   const blend=.35;
   velocityY=(1-blend)*velocityY+blend*dragVelocity(dx,elapsed,sensitivity);
   velocityX=(1-blend)*velocityX+blend*dragVelocity(dy,elapsed,sensitivity*.66);
   if(reducedMotion)renderStill();
  };
  const handleUp=()=>{dragging=false;pausedUntil=performance.now()+7000;if(reducedMotion){velocityX=0;velocityY=0;}else if(performance.now()-lastMoveAt>95){velocityX=0;velocityY=0;}};
  const handleKeyboard=(event:KeyboardEvent)=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
   event.preventDefault();velocityX=0;velocityY=0;focusTime=-1;pausedUntil=performance.now()+12000;
   if(event.key==='Home'){globe.rotation.y=HOME_Y;globe.rotation.x=HOME_X;camera.position.z=6.35;}
   if(event.key==='ArrowLeft')globe.rotation.y-=.14;
   if(event.key==='ArrowRight')globe.rotation.y+=.14;
   if(event.key==='ArrowUp')globe.rotation.x=Math.min(.65,globe.rotation.x+.10);
   if(event.key==='ArrowDown')globe.rotation.x=Math.max(-.6,globe.rotation.x-.10);
   if(reducedMotion)renderStill();
  };
  const handleWheel=(event:WheelEvent)=>{
   if(!event.isTrusted)return;
   event.preventDefault();focusTime=-1;velocityX=0;velocityY=0;
   camera.position.z=THREE.MathUtils.clamp(camera.position.z+Math.sign(event.deltaY)*.32,5.2,8);
   pausedUntil=performance.now()+5000;if(reducedMotion)renderStill();
  };
  const handleContextLost=(event:Event)=>{event.preventDefault();setStatus('fallback');contextAvailable=false;active=false;cancelAnimationFrame(frame);frame=0;};
  const handleEnter=()=>{hovering=true;};
  const handleLeave=()=>{hovering=false;};
  const syncAnimation=()=>{
   if(!active||document.hidden||!contextAvailable){cancelAnimationFrame(frame);frame=0;return;}
   if(reducedMotion){renderStill();return;}
   if(!frame){last=0;frame=requestAnimationFrame(animate);}
  };
  const observer=new IntersectionObserver(entries=>{active=!!entries[0]?.isIntersecting;syncAnimation();},{threshold:0.04});observer.observe(canvas);
  document.addEventListener('visibilitychange',syncAnimation);
  const resizer=new ResizeObserver(resize);if(canvas.parentElement)resizer.observe(canvas.parentElement);
  canvas.addEventListener('webglcontextlost',handleContextLost);
  canvas.addEventListener('pointerdown',handleDown);canvas.addEventListener('pointermove',handleMove);
  canvas.addEventListener('pointerup',handleUp);canvas.addEventListener('pointercancel',handleUp);
  canvas.addEventListener('pointerenter',handleEnter);canvas.addEventListener('pointerleave',handleLeave);
  canvas.addEventListener('keydown',handleKeyboard);
  canvas.addEventListener('wheel',handleWheel,{passive:false});
  controllerRef.current={focus:()=>{velocityX=0;velocityY=0;if(reducedMotion){globe.rotation.y=HOME_Y;globe.rotation.x=HOME_X;camera.position.z=5.65;renderStill();}else{focusOriginY=globe.rotation.y;focusOriginX=globe.rotation.x;focusOriginZ=camera.position.z;focusTime=performance.now();}}};
  resize();if(reducedMotion){renderStill();}else frame=requestAnimationFrame(animate);
  return ()=>{
   disposed=true;abort.abort();controllerRef.current=null;
   cancelAnimationFrame(frame);observer.disconnect();resizer.disconnect();
   document.removeEventListener('visibilitychange',syncAnimation);
   canvas.removeEventListener('webglcontextlost',handleContextLost);
   canvas.removeEventListener('pointerdown',handleDown);canvas.removeEventListener('pointermove',handleMove);
   canvas.removeEventListener('pointerup',handleUp);canvas.removeEventListener('pointercancel',handleUp);
   canvas.removeEventListener('pointerenter',handleEnter);canvas.removeEventListener('pointerleave',handleLeave);
   canvas.removeEventListener('keydown',handleKeyboard);
   canvas.removeEventListener('wheel',handleWheel);
   outlineLines.forEach(line=>line.geometry.dispose());outlineMaterial.dispose();
   sphere.dispose();earthMat.dispose();texture.dispose();clouds.geometry.dispose();cloudsMat.dispose();cloudsTex.dispose();
   atmosphere.geometry.dispose();(atmosphere.material as THREE.Material).dispose();
   point.geometry.dispose();(point.material as THREE.Material).dispose();halo.geometry.dispose();(halo.material as THREE.Material).dispose();ring.geometry.dispose();(ring.material as THREE.Material).dispose();
   renderer.dispose();
  };
 },[]);
 return <div className={`earth-globe-mount ${status==='ready'?'is-ready':''}`} data-render-state={status} >
   <div className="earth-first-frame" aria-hidden="true"/>
   <canvas ref={canvasRef} className="earth-globe-canvas" style={status==='fallback'?{visibility:'hidden'}:undefined} tabIndex={status==='fallback'?-1:0} aria-hidden={status==='fallback'} aria-label={lang==='ar'?'كرة أرضية ثلاثية الأبعاد؛ اسحب لتدويرها واستخدم الأسهم لتحريكها':'Interactive 3D Earth. Drag to rotate, scroll over the globe to zoom; use arrow keys and Home to reset.'}/>
   <div className="globe-coordinate-tag" ref={labelRef} aria-hidden="true" style={status!=='ready'?{display:'none'}:undefined}><span className="globe-coord-dot"/><strong>{lang==='ar'?'سلطنة عُمان':'Oman'}</strong><small>21.5°N · 57.5°E</small></div>

   {status==='fallback'&&<span className="globe-static-indicator">{lang==='ar'?'عرض الأرض الثابت':'Static Earth view'}</span>}
   <div className="globe-attribution">{lang==='ar'?'صور الأرض: NASA Blue Marble':'Earth imagery: NASA Blue Marble'} <span>·</span> {outline==='ready'?(lang==='ar'?'حدود عُمان: NCSI':'Oman geometry: NCSI'):outline==='unavailable'?(lang==='ar'?'حدود NCSI غير متاحة':'NCSI outline unavailable'):(lang==='ar'?'جار فحص حدود NCSI':'Checking NCSI outline')}</div>
  </div>;
}
