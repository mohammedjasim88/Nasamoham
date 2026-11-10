/** Evidence archive for NASA POWER. No climate values are recalculated or altered here.
 * ZIP uses the standard STORE method (no compression), compatible with Windows Explorer.
 */
const encoder=new TextEncoder();
const MAX_ORIGINAL_JSON_BYTES=1_000_000;
const MAX_ARCHIVE_BYTES=6_000_000;
const toBytes=value=>typeof value==='string'?encoder.encode(value):value;
const numericValue=value=>value===null||value===undefined||value===''||Number(value)===-999||!Number.isFinite(Number(value))?null:Number(value);
const safeSlug=s=>String(s).toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,64)||'site';
const quoteCsv=value=>`"${String(value??'').replaceAll('"','""')}"`;
const csv=rows=>rows.map(row=>row.map(quoteCsv).join(',')).join('\r\n')+'\r\n';
function guardRawEvidence(item,metric){
 const raw=item?.nasa?.sourceRawJson;
 if(typeof raw!=='string'||!raw.trim()||encoder.encode(raw).length>MAX_ORIGINAL_JSON_BYTES)throw Error('Original NASA JSON was not preserved for this run. Run verification again.');
 let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('Original NASA response was not valid JSON. Run verification again.');}
 const annual=parsed?.properties?.parameter?.[metric];
 if(!annual||typeof annual!=='object'||Array.isArray(annual))throw Error('Original NASA JSON does not contain the selected metric.');
 if(!Array.isArray(item?.comparison?.rows)||!Array.isArray(item?.nasa?.years)||!item.comparison.rows.length)throw Error('Incomplete comparison cannot be exported.');
 const years=new Map(item.nasa.years.map(r=>[Number(r.year),numericValue(r.value)]));
 for(const [index,row] of item.comparison.rows.entries()){
  if(row.year!==item.nasa.start+index)throw Error('Comparison year range is inconsistent with the NASA source.');
  const rawValue=numericValue(annual[`${row.year}13`]);
  const compared=numericValue(row.nasa);
  const retrieved=years.get(row.year);
  if((rawValue===null)!==(compared===null)||rawValue!==null&&Math.abs(rawValue-compared)>1e-9||!years.has(row.year)||(retrieved===null)!==(compared===null)||retrieved!==null&&Math.abs(retrieved-compared)>1e-9)throw Error('NASA source and comparison diverged; evidence download is blocked.');
 }
 return raw;
}
async function sha256(bytes){
 if(!globalThis.crypto?.subtle)throw Error('Secure SHA-256 hashing is unavailable; archive was not generated.');
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function crc32(bytes){let c=-1;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(0xedb88320&-(c&1));}return (c^(-1))>>>0;}
/** Create a standard ZIP archive, using uncompressed UTF-8 entries and CRC32. */
export function createZipArchive(files,{date=new Date()}={}){
 if(!Array.isArray(files)||!files.length)throw Error('Cannot create an empty evidence archive');
 const stamp=date instanceof Date&&Number.isFinite(date.getTime())?date:new Date();
 const yr=Math.max(1980,Math.min(2107,stamp.getUTCFullYear()));
 const dosDate=((yr-1980)<<9)|((stamp.getUTCMonth()+1)<<5)|stamp.getUTCDate();
 const dosTime=(stamp.getUTCHours()<<11)|(stamp.getUTCMinutes()<<5)|(stamp.getUTCSeconds()>>>1);
 const entries=[];const names=new Set();let total=22;
 for(const file of files){
  const name=file?.name;
  if(typeof name!=='string'||!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(part=>part==='..'||part==='.'||part==='')||names.has(name))throw Error('Unsafe or duplicate ZIP entry name');
  names.add(name);
  const nameBytes=encoder.encode(name),data=toBytes(file.content);
  if(!(data instanceof Uint8Array)||nameBytes.length>65535)throw Error('Invalid ZIP content');
  const record={nameBytes,data,size:data.length,crc:crc32(data),offset:0};
  total+=30+nameBytes.length+data.length+46+nameBytes.length;
  if(total>MAX_ARCHIVE_BYTES)throw Error('Evidence exceeds archive size limit');
  entries.push(record);
 }
 const output=new Uint8Array(total),view=new DataView(output.buffer);let position=0;
 const write16=v=>{view.setUint16(position,v,true);position+=2;};
 const write32=v=>{view.setUint32(position,v,true);position+=4;};
 const writeBytes=b=>{output.set(b,position);position+=b.length;};
 for(const e of entries){
  e.offset=position;write32(0x04034b50);write16(20);write16(0x0800);write16(0);write16(dosTime);write16(dosDate);
  write32(e.crc);write32(e.size);write32(e.size);write16(e.nameBytes.length);write16(0);writeBytes(e.nameBytes);writeBytes(e.data);
 }
 const cdStart=position;
 for(const e of entries){
  write32(0x02014b50);write16(20);write16(20);write16(0x0800);write16(0);write16(dosTime);write16(dosDate);
  write32(e.crc);write32(e.size);write32(e.size);write16(e.nameBytes.length);write16(0);write16(0);write16(0);
  write16(0);write32(0);write32(e.offset);writeBytes(e.nameBytes);
 }
 const cdSize=position-cdStart;
 write32(0x06054b50);write16(0);write16(0);write16(entries.length);write16(entries.length);write32(cdSize);write32(cdStart);write16(0);
 if(position!==total)throw Error('Internal ZIP archive length mismatch');
 return output;
}
/**
 * Create one self-contained source-and-difference archive from the *same* verification response.
 * @typedef {{name: string, rows: Array<{year: number, value: number|null}>, originalBytes: Uint8Array}} UploadedWebsiteEvidence
 * @param {any[]} results
 * @param {{metric?: string, start?: number, end?: number, generatedAt?: string, uploadedFile?: UploadedWebsiteEvidence|null}} [options]
 */
export async function buildEvidenceArchive(results,{metric,start,end,generatedAt=new Date().toISOString(),uploadedFile=null}={}){
 if(!Array.isArray(results)||results.length<1||results.length>2||!['T2M','RH2M','PRECTOTCORR_SUM'].includes(metric)||!Number.isInteger(start)||!Number.isInteger(end)||start>end)throw Error('Invalid evidence selection');
 const documents=[];const locations=[];let allMatched=true;
 for(const result of results){
  const original=guardRawEvidence(result,metric),loc=result.location,nasa=result.nasa,comparison=result.comparison;
  if(nasa.metric!==metric||nasa.start!==start||nasa.end!==end||Math.abs(nasa.latitude-loc.lat)>0.0001||Math.abs(nasa.longitude-loc.lon)>0.0001)throw Error('Verification scope has changed. Run verification again.');
  if(comparison.rows.length!==end-start+1)throw Error('Incomplete year range; run verification again.');
  const directory=`locations/${safeSlug(loc.id)}`;
  const originalName=`${directory}/nasa-original-response.json`;
  const comparisonName=`${directory}/annual-comparison.csv`;
  const sourceName=`${directory}/website-values-used.csv`;
  documents.push({name:originalName,content:original});
  documents.push({name:comparisonName,content:csv([
   ['Year','Website_value','NASA_value','Difference_website_minus_NASA','Status','Metric','NASA_unit','Latitude','Longitude','Verification_tolerance'],
   ...comparison.rows.map(r=>[r.year,r.site,r.nasa,r.difference,r.status,metric,nasa.unit??'',loc.lat,loc.lon,comparison.tolerance])
  ])});
  documents.push({name:sourceName,content:csv([
   ['Year','Website_value_used_for_verification','Metric','Latitude','Longitude','Value_source'],
   ...comparison.rows.map(r=>[r.year,r.site,metric,loc.lat,loc.lon,result.sourceType])
  ])});
  if(result.sourceType==='uploaded'){
   if(!(uploadedFile?.originalBytes instanceof Uint8Array))throw Error('Uploaded source bytes are unavailable; run verification again.');
   documents.push({name:`${directory}/uploaded-website-original.csv`,content:uploadedFile.originalBytes});
  }
  allMatched=allMatched&&comparison.passed;
  locations.push({locationId:loc.id,locationName:loc.en,latitude:loc.lat,longitude:loc.lon,nasaSourceUrl:nasa.sourceUrl,nasaRetrievedAt:nasa.retrievedAt,sourceType:result.sourceType,websiteSourceLabel:result.sourceLabel,unit:nasa.unit,annualField:nasa.annualField,comparisonStatus:comparison.passed?'matched':'review_required',counts:comparison.summary,paths:{nasaRaw:originalName,comparison:comparisonName,websiteValues:sourceName}});
 }
 const notes=[
  'NASA POWER — INDEPENDENT VERIFICATION EVIDENCE',
  `Archive generated (UTC): ${generatedAt}`,
  `Verification outcome: ${allMatched?'ALL VALUES MATCHED WITHIN TOLERANCE':'REVIEW REQUIRED — DIFFERENCES OR MISSING VALUES'}`,
  `Metric: ${metric}; period: ${start}–${end}; tolerance: ±0.01 in source metric units.`,
  '',
  'nasa-original-response.json is the original NASA POWER JSON response text captured during this same verification request (monthly and YYYY13 annual values).',
  'annual-comparison.csv lists every annual difference and missing or mismatched observations.',
  'website-values-used.csv contains the exact website annual values submitted for comparison (not a replacement for the original website export).',
  'manifest.json records source URLs, timestamps, comparison status and SHA-256 digests of included evidence files.',
  '',
  'WARNING: Agreement with NASA POWER gridded products does not prove ground-station accuracy, geographic coverage of an entire governorate, or causal climate trends.',
  'NOTE: Precipitation aggregation and anomalous years require independent scientific interpretation even when values match.',
  '',
  'العربية: يتضمن هذا الأرشيف استجابة ناسا الأصلية من عملية التحقق نفسها، وقيم الموقع، وجدول المطابقة، ووقت الفحص وبصمات SHA-256.',
  'المطابقة تثبت اتفاق القيم مع بيانات ناسا الشبكية ضمن هامش المقارنة، ولا تعني التحقق من محطة أرصاد أو متوسط المحافظة.',
  'عند ظهور قيم مختلفة أو مفقودة، تكون النتيجة: تتطلب المراجعة، وليست شهادة تطابق.',
  ''
 ].join('\n');
 documents.push({name:'README.txt',content:notes});
 const signatures=[];
 for(const d of documents){const bytes=toBytes(d.content);signatures.push({path:d.name,sha256:await sha256(bytes),bytes:bytes.length});}
 const manifest={schema:'oman-earth-intelligence/nasa-evidence/v1',generatedAt,issuedBy:'Oman Earth Intelligence — NASA Verification Lab',dataProvider:'NASA POWER',validationMethod:'Fresh independent monthly JSON response; compare annual YYYY13 values with website data',metric,startYear:start,endYear:end,tolerance:0.01,toleranceRule:'absolute difference <= 0.01 in metric unit',overallStatus:allMatched?'matched':'review_required',isNasaCertification:false,integrityNote:'SHA-256 checksums support file integrity checks; they are not a NASA signature or authenticity certificate.',limitations:['NASA POWER is a gridded estimate, not an independent ground-station measurement','Point location values are not governorate-wide spatial averages','Precipitation unit/aggregation and anomalies require context'],locations,files:signatures};
 documents.push({name:'manifest.json',content:JSON.stringify(manifest,null,2)+'\n'});
 return {bytes:createZipArchive(documents),manifest,filename:`NASA_Verification_Evidence_${metric}_${start}-${end}_${results.map(r=>safeSlug(r.location.id)).join('_')}.zip`};
}
