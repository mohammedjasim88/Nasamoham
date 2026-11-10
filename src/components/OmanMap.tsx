import {useEffect, useRef, useState} from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {AlertTriangle, Layers, LocateFixed, RotateCcw} from 'lucide-react';
import {POINTS, type Point} from '../lib/locations';
import ReferenceMap from './ReferenceMap';

// MapLibre v6 with Vite requires a separately bundled ESM worker.
// Without this call, a production build can display a blank map indefinitely.
maplibregl.setWorkerUrl(workerUrl);

type Mode = 'dark' | 'light' | 'terrain' | 'satellite';
type Props = {
  selected: Point;
  select: (id: string) => void;
  dark: boolean;
  lang: 'ar' | 'en';
  mode: Mode;
  onMode: (mode: Mode) => void;
  showBoundaries: boolean;
  showWilayats: boolean;
  metricLabel: string;
  pointValue: string;
  onBoundaryStatus: (message: string) => void;
};
type LoadState = 'loading' | 'ready' | 'fallback';
const styles: Record<Exclude<Mode, 'satellite'>, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
  terrain: 'https://tiles.openfreemap.org/styles/fiord'
};
const satelliteKey = String(import.meta.env.VITE_MAPTILER_KEY || '').trim();

// Licensed OpenStreetMap/CARTO raster basemap is a network fallback, NOT a satellite layer.
function rasterBackup(light: boolean): maplibregl.StyleSpecification {
  const theme = light ? 'light_all' : 'dark_all';
  return {
    version: 8,
    sources: {carto: {
      type: 'raster', tileSize: 256,
      tiles: [
        `https://a.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}.png`,
        `https://b.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}.png`,
        `https://c.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}.png`
      ],
      attribution: '© OpenStreetMap contributors · © CARTO'
    }},
    layers: [{id: 'carto-base', type: 'raster', source: 'carto'}]
  };
}
function featureCollection(value: unknown): value is GeoJSON.FeatureCollection {
  if (!value || typeof value !== 'object') return false;
  const result = value as {type?: string; features?: unknown};
  return result.type === 'FeatureCollection' && Array.isArray(result.features);
}

/** Latitude/longitude-only fallback. No invented country outline or administrative borders. */
function CoordinateReference({selected, select, lang, onRetry}: Pick<Props,'selected'|'select'|'lang'> & {onRetry:()=>void}) {
  const ar = lang === 'ar';
  return <div className="coordinate-fallback" role="group" aria-label={ar?'مخطط إحداثيات المواقع، وليس خريطة حدود':'Location coordinate plot, not administrative boundary map'}>
    <div className="coordinate-head"><AlertTriangle size={19} aria-hidden="true"/>
      <div><strong>{ar?'وضع الإحداثيات الاحتياطي':'Coordinate reference mode'}</strong>
        <span>{ar?'تعذّرت خرائط الإنترنت؛ النقاط أدناه موضوعة حسب خطوط الطول والعرض فقط.':'Online basemap unavailable. Points below use latitude and longitude only.'}</span></div>
      <button type="button" onClick={onRetry}><RotateCcw size={15}/>{ar?'أعد المحاولة':'Retry map'}</button>
    </div>
    <div className="coordinate-plot" dir="ltr">
      {[16,18,20,22,24,26].map(lat=><div className="coord-lat" key={lat} style={{top:`${(27.5-lat)/11.5*100}%`}}><span>{lat}°N</span></div>)}
      {[53,55,57,59,61].map(lon=><div className="coord-lon" key={lon} style={{left:`${(lon-52)/9*100}%`}}><span>{lon}°E</span></div>)}
      {POINTS.map(point => <button
        type="button"
        key={point.id}
        aria-label={`${ar?point.ar:point.en}: ${point.lat}° N, ${point.lon}° E`}
        title={`${ar?point.ar:point.en} · ${point.lat}°N, ${point.lon}°E`}
        className={`coord-marker ${selected.id===point.id?'chosen':''}`}
        style={{left:`${(point.lon-52)/9*100}%`,top:`${(27.5-point.lat)/11.5*100}%`}}
        onClick={()=>select(point.id)}
      ><span className="coord-marker-dot"/><span className="coord-marker-label">{ar?point.ar:point.en}</span></button>)}
    </div>
    <div className="coordinate-caption">{ar?'مرجع إحداثي تفاعلي — لا يمثل حدود عُمان أو صور الأقمار الصناعية':'Interactive coordinate reference — not an Oman border map or satellite imagery'}</div>
  </div>;
}

export function OmanMap({selected,select,dark,lang,mode,onMode,showBoundaries,showWilayats,metricLabel,pointValue,onBoundaryStatus}:Props){
  const ref = useRef<HTMLDivElement|null>(null);
  const mapRef = useRef<maplibregl.Map|null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const selectedRef = useRef(selected);
  const selectRef = useRef(select);
  const boundaryRef = useRef(onBoundaryStatus);
  const layerLoaderRef = useRef<((level:'governorates'|'wilayats')=>void)|null>(null);
  const [status,setStatus] = useState<LoadState>('loading');
  const [retry,setRetry] = useState(0);
  const [provider,setProvider] = useState<'openfreemap'|'carto'>('openfreemap');
  const [reason,setReason] = useState('');
  const ar = lang === 'ar';
  useEffect(()=>{selectRef.current=select;boundaryRef.current=onBoundaryStatus;},[select,onBoundaryStatus]);
  useEffect(()=>{
    selectedRef.current = selected;
    markers.current.forEach((marker,i)=>marker.getElement().classList.toggle('active',POINTS[i].id===selected.id));
    const map=mapRef.current;
    if(map&&status==='ready'){
      map.flyTo({center:[selected.lon,selected.lat],zoom:Math.max(map.getZoom(),6),duration:650,essential:false});
    }
  // Only fly when the selected point changes; becoming ready must not zoom
  // the whole-country map into Muscat during the first load.
  },[selected]);

  useEffect(()=>{
    if(!ref.current)return;
    const controller=new AbortController();
    let active=true, map:maplibregl.Map|null=null, timer=0;
    let swapped=false, currentStyleReady=false, tilesReady=false, markerReady=false, failed=false;
    let errorCount=0;
    let initialFrame=true, styleVersion=0;
    const pendingLayers=new Set<string>();
    setStatus('loading');setReason('');setProvider('openfreemap');
    const fail=(why:string)=>{
      if(!active)return;
      failed=true;
      clearTimeout(timer);
      setStatus('fallback');setReason(why);
      // A failed renderer must stop consuming GPU/network resources before SVG takes over.
      layerLoaderRef.current=null;controller.abort();
      markers.current.forEach(marker=>marker.remove());markers.current=[];
      if(mapRef.current===map)mapRef.current=null;
      if(map){const abandoned=map;map=null;abandoned.remove();}
      boundaryRef.current(lang==='ar'?'تعذّر عرض حدود المحافظات لأن الخريطة غير متاحة':'Map unavailable; administrative outlines not displayed');
    };
    const setBackup=()=>{
      if(!map||!active||swapped)return;
      swapped=true; currentStyleReady=false; tilesReady=false; errorCount=0;
      setProvider('carto');
      try{map.setStyle(rasterBackup(mode==='light'||(!dark&&mode==='terrain')));}
      catch(e){fail(String(e));return;}
      clearTimeout(timer);
      timer=window.setTimeout(()=>{if(active&&!tilesReady)fail('All online basemap sources timed out');},7000);
    };
    try {
      // WebGL2 availability can vary across iOS devices and browser settings.
      const canvas=document.createElement('canvas');
      const probe=canvas.getContext('webgl2');
      if(!probe){fail('WebGL2 unavailable');return ()=>{active=false;controller.abort();};}
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      const style = mode==='satellite'&&satelliteKey
        ? `https://api.maptiler.com/maps/satellite/style.json?key=${encodeURIComponent(satelliteKey)}`
        : styles[mode==='satellite'?'dark':mode];
      map=new maplibregl.Map({container:ref.current,style,center:[57.45,21.7],zoom:5.1,minZoom:3.5,maxZoom:14,attributionControl:false,fadeDuration:0});
      mapRef.current=map;
      // A country-wide overview should display unobstructed points rather than
      // dozens of overlapping labels. Selection stays visible at every zoom.
      const syncMarkerLabels=()=>{
        if(!active||!map||!ref.current)return;
        ref.current.classList.toggle('map-labels-compact',map.getZoom()<6.15);
      };
      map.on('zoom',syncMarkerLabels);
      syncMarkerLabels();
      // Prevent unintended rotation on phones; geographic north remains up.
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
      map.addControl(new maplibregl.NavigationControl({showCompass:true}),'bottom-right');
      map.on('style.load',()=>{
        if(!active||!map||failed)return;
        currentStyleReady=true;
        const generation=++styleVersion;
        pendingLayers.clear();
        if(!markerReady){
          markerReady=true;
          markers.current=POINTS.map(point=>{
            const button=document.createElement('button');
            button.type='button';button.className=`map-point ${point.id===selectedRef.current.id?'active':''}`;
            button.title=lang==='ar'?point.ar:point.en;
            button.setAttribute('aria-label',lang==='ar'?`اختر ${point.ar}`:`Select ${point.en}`);
            const dot=document.createElement('span');dot.className='map-point-core';
            const label=document.createElement('span');label.className='map-point-name';label.textContent=point.id==='muscat-east'?(lang==='ar'?'مسقط شرق':'Muscat E'):point.id==='muscat-west'?(lang==='ar'?'مسقط غرب':'Muscat W'):(lang==='ar'?point.ar:point.en);
            button.append(dot,label);
            button.addEventListener('click',()=>selectRef.current(point.id));
            return new maplibregl.Marker({element:button,anchor:'center'}).setLngLat([point.lon,point.lat]).addTo(map!);
          });
        }
        const geometry=(level:'governorates'|'wilayats')=>{
          if(pendingLayers.has(level))return;
          pendingLayers.add(level);
          fetch(`/api/boundaries?level=${level}`,{signal:controller.signal})
            .then(async r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
            .then((fc:unknown)=>{
              if(!active||!map||generation!==styleVersion||!featureCollection(fc))return;
              if(level==='governorates'&&fc.features.length!==11)throw new Error('Incomplete governorate collection');
              if(level==='wilayats'&&fc.features.length<60)throw new Error('Incomplete wilayat collection');
              const sourceId=level==='governorates'?'oman-admin':'oman-wilayats';
              if(map.getSource(sourceId))return;
              map.addSource(sourceId,{type:'geojson',data:fc});
              if(level==='governorates'){
                map.addLayer({id:'oman-admin-fill',type:'fill',source:sourceId,paint:{'fill-color':'#31c4ef','fill-opacity':.14}});
                map.addLayer({id:'oman-admin-stroke',type:'line',source:sourceId,paint:{'line-color':'#54d9ff','line-width':2.4,'line-opacity':.95}});
                map.setLayoutProperty('oman-admin-fill','visibility',showBoundaries?'visible':'none');
                map.setLayoutProperty('oman-admin-stroke','visibility',showBoundaries?'visible':'none');
                map.on('click','oman-admin-fill',(e:maplibregl.MapLayerMouseEvent)=>{
                  const p=e.features?.[0]?.properties||{};
                  const name=String(p.regionName||p.NAMEAR||p.NAMEEN||p.NAME_AR||p.NAME_EN||p.name||p.GOVERNORATE||'Administrative feature');
                  new maplibregl.Popup().setLngLat(e.lngLat).setText(name+' · NCSI source; topology not independently certified').addTo(map!);
                });
                boundaryRef.current(lang==='ar'?'تم تحميل حدود 11 محافظة من خدمة NCSI؛ الدقة القانونية غير مدققة بصورة مستقلة':'11 NCSI governorate polygons loaded; legal topology not independently certified');
              } else {
                map.addLayer({id:'oman-wilayats-line',type:'line',source:sourceId,paint:{'line-color':'#e6faff','line-width':1.0,'line-opacity':.69}});
                map.setLayoutProperty('oman-wilayats-line','visibility',showWilayats?'visible':'none');
              }
            })
            .catch(()=>{
              if(active&&generation===styleVersion&&level==='governorates')boundaryRef.current(lang==='ar'?'تعذر استرجاع حدود المحافظات من NCSI؛ النقاط مرجع للمواقع فقط':'NCSI governorate layer unavailable; markers identify reference locations only');
            }).finally(()=>pendingLayers.delete(level));
        };
        layerLoaderRef.current=geometry;
        geometry('governorates');
        if(showWilayats)geometry('wilayats');
        if(initialFrame){
          initialFrame=false;
          // Include Musandam, Dhofar and the full Oman coastline on first load.
          map.fitBounds([[51.8,16.45],[60.1,26.7]],{padding:45,maxZoom:5.6,duration:0});
        }
        syncMarkerLabels();
        map.resize();
      });
      // Boundary fetches and source animation must not hold the base map in loading state.
      const markReady=()=>{
        if(!active||failed||!currentStyleReady||!map||!map.areTilesLoaded())return;
        tilesReady=true;setStatus('ready');clearTimeout(timer);
      };
      map.on('render',markReady);
      map.on('idle',markReady);
      map.on('error',(event)=>{
        if(!active||failed)return;
        const msg=String(event.error?.message||'Map resource error');
        if(import.meta.env.DEV)console.warn('[OmanMap]',msg);
        // Administrative overlay errors do not indicate a failed basemap.
        const sourceId=(event as {sourceId?:string}).sourceId;
        if(sourceId==='oman-admin'||sourceId==='oman-wilayats')return;
        if(++errorCount>=3){if(!swapped&&mode!=='satellite')setBackup();else if(swapped)fail(msg);}
      });
      timer=window.setTimeout(()=>{
        if(!active)return;
        if(!tilesReady){if(!swapped&&mode!=='satellite')setBackup();else fail('Map tiles were not ready before timeout');}
      },7000);
      const observer=new ResizeObserver(()=>map?.resize());observer.observe(ref.current);
      const resize=()=>map?.resize();window.addEventListener('resize',resize);
      return ()=>{
        active=false;layerLoaderRef.current=null;controller.abort();clearTimeout(timer);observer.disconnect();window.removeEventListener('resize',resize);
        markers.current.forEach(m=>m.remove());markers.current=[];map?.remove();if(mapRef.current===map)mapRef.current=null;
      };
    } catch(e){fail(String(e));return ()=>{active=false;controller.abort();clearTimeout(timer);};}
  // The map is rebuilt on a change to the basemap or language, not on each data query.
  },[mode,lang,retry]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map||status!=='ready')return;
    for(const name of ['oman-admin-fill','oman-admin-stroke']){
      if(map.getLayer(name))map.setLayoutProperty(name,'visibility',showBoundaries?'visible':'none');
    }
    if(map.getLayer('oman-wilayats-line'))map.setLayoutProperty('oman-wilayats-line','visibility',showWilayats?'visible':'none');
    else if(showWilayats)layerLoaderRef.current?.('wilayats');
  },[showBoundaries,showWilayats,status]);

  const home=()=>mapRef.current?.fitBounds([[51.8,16.45],[60.1,26.7]],{padding:45,maxZoom:5.6,duration:650,essential:false});
  return <section className={`map-shell map-state-${status}`}  aria-label={ar?'خريطة عُمان التفاعلية':'Interactive Oman map'}>
    <div className="map-topbar"><span className="map-eyebrow"><span className="live-dot"/>{ar?'مستكشف المواقع الجغرافية':'GEOSPATIAL EXPLORER'}</span>
      <div className="map-toolbar" role="group" aria-label={ar?'نمط الخريطة':'Map style'}>
        {(['dark','light','terrain','satellite'] as Mode[]).map(m=><button key={m} type="button" className={mode===m?'on':''}
          disabled={status==='fallback'||(m==='satellite'&&!satelliteKey)}
          title={status==='fallback'?(ar?'أنماط الخريطة متاحة في العرض الكامل فقط':'Map styles are available in the full map only'):m==='satellite'&&!satelliteKey?(ar?'يتطلب مفتاح MapTiler':'MapTiler key required'):m}
          onClick={()=>onMode(m)}>{m==='dark'?(ar?'داكن':'Dark'):m==='light'?(ar?'فاتح':'Light'):m==='terrain'?(ar?'تضاريس':'Relief'):(ar?'قمر صناعي':'Satellite')}</button>)}
      </div></div>
    <div className="maplibre-container" ref={ref} role="application" aria-label={ar?'اسحب الخريطة أو اختر مكانًا':'Pan or zoom the map; choose a location'} />
    {status==='loading'&&<div className="map-loading" role="status"><span className="map-loading-spinner"/>{ar?'جار تحميل الخريطة...':'Loading map layers…'}</div>}
    {status==='fallback'&&<ReferenceMap canRetry={reason!=='WebGL2 unavailable'} selected={selected} select={select} lang={lang} showBoundaries={showBoundaries} showWilayats={showWilayats} onRetry={()=>setRetry(x=>x+1)} onBoundaryStatus={onBoundaryStatus} unavailable={<CoordinateReference selected={selected} select={select} lang={lang} onRetry={()=>setRetry(x=>x+1)}/>}/>}
    {status==='ready'&&<><button className="map-reset" onClick={home} type="button" aria-label={ar?'إرجاع عرض عُمان':'Reset Oman view'}><LocateFixed size={18}/></button>
      <div className="map-footnote"><Layers size={14}/><span>{ar?'الأسماء مواقع مرجعية؛ حدود المحافظات من NCSI عند توفرها':'Place markers are reference points; boundaries from NCSI when available'} · {provider==='openfreemap'?'OpenFreeMap':'© CARTO / OSM'}</span></div></>}
    {status==='fallback'&&reason&&<span className="map-debug-hint" title={reason}>{ar?'وضع احتياطي':'Fallback active'}</span>}
    <div className="map-data-bubble" role="status"><small>{ar?selected.ar:selected.en} · {metricLabel}</small><strong>{pointValue}</strong><em>{ar?'قيمة تاريخية عند نقطة':'Historical point estimate'}</em></div>
  </section>;
}
