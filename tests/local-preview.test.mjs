import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const index = resolve(dist, 'index.html');
async function exists(file){try{await stat(file);return true;}catch{return false;}}

test('Node preview serves assets and Worker API routes without workerd', async () => {
  const created = !(await exists(index));
  if(created){await mkdir(dist,{recursive:true});await writeFile(index,'<!doctype html><title>Local Smoke</title>');}
  const port=18787;
  const child = spawn(process.execPath,['scripts/local_node_preview.mjs'],{
    cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']
  });
  let output='';child.stdout.on('data',d=>output+=String(d));child.stderr.on('data',d=>output+=String(d));
  try {
    let ready=false;
    for(let i=0;i<45;i++){
      if(child.exitCode!==null)break;
      try{const r=await fetch(`http://127.0.0.1:${port}/api/status`);if(r.ok){ready=true;break;}}catch{}
      await new Promise(r=>setTimeout(r,100));
    }
    assert.ok(ready,`Preview did not start: ${output}`);
    const status=await fetch(`http://127.0.0.1:${port}/api/status`).then(r=>r.json());
    assert.equal(status.ready,true);assert.equal(status.aiConfigured,false);
    const invalid=await fetch(`http://127.0.0.1:${port}/api/power?lat=999&lon=55&start=2000&end=2025`);
    assert.equal(invalid.status,400);
    const unknown=await fetch(`http://127.0.0.1:${port}/api/does-not-exist`);
    assert.equal(unknown.status,404);
    const html=await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(html.status,200);
    assert.match(html.headers.get('content-type')||'',/text\/html/);
  } finally {
    child.kill('SIGTERM');
    if(created)await rm(index,{force:true});
    // remove only created empty dist; leave user build untouched
    if(created)try{await rm(dist,{recursive:false});}catch{}
  }
});
