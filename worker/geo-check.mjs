/** Structural geographic safety checks, not a cadastral/legal boundary certification. */
export function assessGeoJson(collection,level){
 if(collection?.type!=='FeatureCollection'||!Array.isArray(collection.features))return {ok:false,error:'Not a GeoJSON FeatureCollection'};
 const expected=level==='governorates'?11:60;
 let count=0,points=0;
 const bbox=[Infinity,Infinity,-Infinity,-Infinity];
 for(const feature of collection.features){
  const geometry=feature?.geometry;
  if(feature?.type!=='Feature'||!['Polygon','MultiPolygon'].includes(geometry?.type))continue;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  if(!Array.isArray(polygons)||polygons.length===0)return {ok:false,error:'Missing polygon coordinates'};
  count++;
  for(const polygon of polygons){
   if(!Array.isArray(polygon)||!polygon.length)return {ok:false,error:'Polygon contains no rings'};
   for(const ring of polygon){
    if(!Array.isArray(ring)||ring.length<4)return {ok:false,error:'Polygon ring must have at least four positions'};
    for(const pt of ring){
     if(!Array.isArray(pt)||pt.length<2||!Number.isFinite(pt[0])||!Number.isFinite(pt[1])||pt[0]<51||pt[0]>62||pt[1]<15||pt[1]>28)return {ok:false,error:'Boundary coordinates outside the Oman region or invalid'};
     bbox[0]=Math.min(bbox[0],pt[0]);bbox[1]=Math.min(bbox[1],pt[1]);bbox[2]=Math.max(bbox[2],pt[0]);bbox[3]=Math.max(bbox[3],pt[1]);
     if(++points>500000)return {ok:false,error:'Boundary geometry is too large'};
    }
   }
  }
 }
 if(level==='governorates'&&count!==11)return {ok:false,error:`Expected 11 governorates, received ${count}`};
 if(level==='wilayats'&&count<expected)return {ok:false,error:`Expected at least ${expected} wilayats, received ${count}`};
 return {ok:true,count,points,bbox,coordinateSystem:'WGS84 / EPSG:4326',validation:'Structure, coordinate range and feature count only; no official legal topology certification'};
}
