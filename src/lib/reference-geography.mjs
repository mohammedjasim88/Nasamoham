/** Display-only Mercator projection. Never used in scientific calculations. */
const rad=Math.PI/180;
const north=27.25,south=16.2,west=51.5,east=60.5;
const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*rad/2));
export const REFERENCE_VIEW={width:680,height:860};
const x0=west*rad,y0=mercator(north),scale=Math.min(620/((east-west)*rad),800/(y0-mercator(south)));
const offsetX=(680-(east-west)*rad*scale)/2,offsetY=(860-(y0-mercator(south))*scale)/2;
export function projectReference(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<51||lon>62||lat<15||lat>28)throw new Error('Invalid Oman display coordinate');
 return [offsetX+(lon*rad-x0)*scale,offsetY+(y0-mercator(lat))*scale];
}
export function referencePaths(collection){
 if(collection?.type!=='FeatureCollection'||!Array.isArray(collection.features)||collection.features.length!==11)throw new Error('Incomplete governorate collection');
 return collection.features.map((feature,index)=>{
  const g=feature.geometry, polygons=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:null;
  if(!Array.isArray(polygons)||!polygons.length)throw new Error('Invalid polygon');
  const parts=[];
  for(const polygon of polygons){
   if(!Array.isArray(polygon)||!polygon.length)throw new Error('Invalid rings');
   for(const ring of polygon){
    if(!Array.isArray(ring)||ring.length<4)throw new Error('Invalid ring');
    parts.push(ring.map((position,i)=>{
     if(!Array.isArray(position)||position.length<2)throw new Error('Invalid coordinate');
     const [x,y]=projectReference(position[0],position[1]);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ')+'Z');
   }
  }
  return {id:String(index),d:parts.join(' ')};
 });
}
