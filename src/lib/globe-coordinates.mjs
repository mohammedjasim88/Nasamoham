/** Match Three.js SphereGeometry's equirectangular UV mapping.
 * NASA texture: u=(longitude+180)/360, v=(latitude+90)/180.
 * Display coordinates only; never used to transform climate measurements.
 */
export function globeCoordinates(longitude,latitude,radius=1){
 if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||Math.abs(longitude)>180||Math.abs(latitude)>90||!Number.isFinite(radius)||radius<=0)throw new Error('Invalid globe coordinate');
 const lon=longitude*Math.PI/180,lat=latitude*Math.PI/180;
 return [radius*Math.cos(lat)*Math.cos(lon),radius*Math.sin(lat),-radius*Math.cos(lat)*Math.sin(lon)];
}
