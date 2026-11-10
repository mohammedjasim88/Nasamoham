/** Check an exported NASA Verification Lab ZIP offline, using Node.js only.
 * Validates ZIP CRC32 and the SHA-256 manifest for each evidence file.
 * Does NOT authenticate the NASA server or certify observations.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const MAX_SIZE=6_000_000;
function crc32(bytes){let c=-1;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(0xedb88320&-(c&1));}return (c^(-1))>>>0;}
export function checkArchive(bytes){
 const buffer=Buffer.from(bytes);
 if(buffer.length>MAX_SIZE||buffer.length<22)throw Error('Archive size invalid');
 const view=new DataView(buffer.buffer,buffer.byteOffset,buffer.byteLength),u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
 let eocd=-1;
 for(let pos=buffer.length-22;pos>=Math.max(0,buffer.length-65557);pos--){if(u32(pos)===0x06054b50){eocd=pos;break;}}
 if(eocd<0)throw Error('ZIP central directory not found');
 const count=u16(eocd+10),directoryLength=u32(eocd+12),directoryOffset=u32(eocd+16);
 if(count!==u16(eocd+8)||directoryOffset+directoryLength>eocd)throw Error('Damaged ZIP directory');
 const files=new Map();let pos=directoryOffset;
 for(let i=0;i<count;i++){
  if(pos+46>eocd||u32(pos)!==0x02014b50)throw Error('Invalid ZIP directory entry');
  const method=u16(pos+10),checksum=u32(pos+16),size=u32(pos+20),rawSize=u32(pos+24),nameLength=u16(pos+28),extraLength=u16(pos+30),commentLength=u16(pos+32),local=u32(pos+42);
  if(method!==0||size!==rawSize)throw Error('Unsupported ZIP compression method');
  const name=buffer.toString('utf8',pos+46,pos+46+nameLength);
  if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>p==='.'||p==='..'||p==='')||files.has(name))throw Error('Invalid ZIP path');
  if(local+30>buffer.length||u32(local)!==0x04034b50)throw Error('Invalid ZIP local file header');
  const offset=local+30+u16(local+26)+u16(local+28);
  if(offset+size>directoryOffset)throw Error('ZIP entry exceeds its bounds');
  const content=buffer.subarray(offset,offset+size);
  if(crc32(content)!==checksum)throw Error(`CRC32 mismatch: ${name}`);
  files.set(name,content);pos+=46+nameLength+extraLength+commentLength;
 }
 if(pos!==directoryOffset+directoryLength)throw Error('ZIP directory length mismatch');
 const text=files.get('manifest.json');if(!text)throw Error('Verification manifest missing');
 const manifest=JSON.parse(text.toString('utf8'));
 if(manifest.schema!=='oman-earth-intelligence/nasa-evidence/v1'||!Array.isArray(manifest.files))throw Error('Unrecognised evidence format');
 if(manifest.files.length!==files.size-1)throw Error('Manifest does not enumerate every evidence file');
 for(const entry of manifest.files){
  const content=files.get(entry.path);if(!content||content.length!==entry.bytes)throw Error(`Missing or changed file: ${entry.path}`);
  if(createHash('sha256').update(content).digest('hex')!==entry.sha256)throw Error(`SHA-256 mismatch: ${entry.path}`);
 }
 return {checkedFiles:manifest.files.length,overallStatus:manifest.overallStatus,locations:manifest.locations.length,manifest};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const file=process.argv[2];
 if(!file){console.error('Usage: node scripts/check_evidence_archive.mjs <evidence.zip>');process.exitCode=2;}
 else try{
  const result=checkArchive(await readFile(file));
  console.log(`PASS: ZIP CRC32 and SHA-256 integrity checks (${result.checkedFiles} evidence files, ${result.locations} location(s)).`);
  console.log(`Saved verification result: ${result.overallStatus}. This does not authenticate NASA or certify ground observations.`);
 }catch(error){console.error(`FAIL: ${error.message}`);process.exitCode=1;}
}
