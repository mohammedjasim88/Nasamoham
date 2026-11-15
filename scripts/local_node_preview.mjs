/**
 * Node.js local preview for Oman Earth Intelligence.
 * Purpose: avoid workerd.exe on Windows when Wrangler dev crashes.
 * Local only (127.0.0.1). Shares API business logic with the deployed Worker.
 * This is not Cloudflare's exact production runtime, and does not emulate Workers AI.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import cloudflareWorker from '../worker/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const PORT = Number(process.env.PORT || 8787);
const HOST = '127.0.0.1';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.wasm': 'application/wasm',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

async function assetsFetch(request) {
  const url = new URL(request.url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return new Response('Invalid path encoding', { status: 400 }); }
  if (pathname.includes('\\') || pathname.includes('\0')) {
    return new Response('Invalid path', { status: 400 });
  }
  const candidate = resolve(dist, '.' + pathname);
  if (candidate !== dist && !candidate.startsWith(dist + sep)) {
    return new Response('Forbidden', { status: 403 });
  }
  let file = candidate;
  try {
    if (!(await stat(file)).isFile()) file = resolve(dist, 'index.html');
  } catch {
    // SPA route: serve index.html only if path does not look like an asset.
    if (extname(pathname)) return new Response('Asset not found', { status: 404 });
    file = resolve(dist, 'index.html');
  }
  try {
    const content = await readFile(file);
    // Exercise the production CSP/permissions policy locally; Cloudflare applies _headers itself.
    const staticHeaders={};
    try{
      for(const line of (await readFile(resolve(dist,'_headers'),'utf8')).split(/\r?\n/)){
        if(!/^\s+[^:]+:/.test(line))continue;
        const text=line.trim(),colon=text.indexOf(':');staticHeaders[text.slice(0,colon)]=text.slice(colon+1).trim();
      }
    }catch{/* Optional for older releases without a static header file. */}
    // This loopback preview is HTTP; WebKit otherwise upgrades its assets to HTTPS.
    // Keep the deployed _headers policy intact for Cloudflare's HTTPS origin.
    if(url.protocol==='http:' && staticHeaders['Content-Security-Policy']){
      staticHeaders['Content-Security-Policy']=staticHeaders['Content-Security-Policy']
        .split(';').map(rule=>rule.trim()).filter(rule=>rule!=='upgrade-insecure-requests').join('; ');
    }
    return new Response(content, {
      headers: {
        ...staticHeaders,
        'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Build output missing. Run npm run build.', { status: 503 });
  }
}

async function bodyBuffer(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error('Request body exceeds 1 MiB limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url || '/', `http://${HOST}:${PORT}`);
    const body = await bodyBuffer(incoming);
    const options = { method: incoming.method, headers: incoming.headers };
    if (body !== undefined) options.body = body;
    const request = new Request(url, options);
    const env = { ASSETS: { fetch: assetsFetch } }; // AI binding intentionally unavailable.
    const ctx = { waitUntil(promise) { Promise.resolve(promise).catch(() => {}); } };
    const response = await cloudflareWorker.fetch(request, env, ctx);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (incoming.method === 'HEAD') return outgoing.end();
    if (response.body) {
      for await (const chunk of response.body) outgoing.write(chunk);
    }
    outgoing.end();
  } catch (error) {
    const msg = error?.message === 'Request body exceeds 1 MiB limit' ? 'Request too large' : 'Local preview error';
    const status = msg === 'Request too large' ? 413 : 500;
    if (!outgoing.headersSent) outgoing.writeHead(status, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ error: msg }));
    console.error('[local-preview]', error);
  }
});
server.on('error', error => {
  console.error('[local-preview] Cannot bind to', `${HOST}:${PORT}`, error?.message);
  process.exitCode = 1;
});
server.listen(PORT, HOST, () => {
  console.log('-----------------------------------------------------------');
  console.log('Oman Earth Intelligence - Local Node.js Preview');
  console.log(`Open: http://${HOST}:${PORT}`);
  console.log(`API:  http://${HOST}:${PORT}/api/status`);
  console.log('Native Cloudflare workerd is NOT used in this preview.');
  console.log('NASA API requires internet. Workers AI is disabled locally.');
  console.log('Press Ctrl+C to stop.');
  console.log('-----------------------------------------------------------');
});
