import { Readable } from 'node:stream';
import worker from '../worker/index.mjs';

const API_PREFIX = '/api/';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const LOCAL_ENV = {};
const LOCAL_CONTEXT = {
  waitUntil(promise) {
    Promise.resolve(promise).catch(error => {
      console.error('[vite-local-api] Background task failed:', error);
    });
  },
};

function requestHeaders(incoming) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value === undefined || ['connection', 'host', 'transfer-encoding', 'upgrade'].includes(name)) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  return headers;
}

function requestUrl(incoming) {
  const hostUrl = new URL(incoming.url || '/', `http://${incoming.headers.host || 'localhost'}`);
  const origin = incoming.headers.origin;
  if (!origin) return hostUrl;

  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return hostUrl;
  }
  const localPort = incoming.socket.localPort;
  const requestPort = Number(hostUrl.port || (hostUrl.protocol === 'https:' ? 443 : 80));
  const originPort = Number(originUrl.port || (originUrl.protocol === 'https:' ? 443 : 80));
  const isHttpLoopback = url => url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);

  if (isHttpLoopback(hostUrl) && isHttpLoopback(originUrl)
      && requestPort === localPort && originPort === localPort) {
    hostUrl.host = originUrl.host;
  }
  return hostUrl;
}

function sendResponse(outgoing, response) {
  outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  if (!response.body) {
    outgoing.end();
    return Promise.resolve();
  }
  return (async () => {
    for await (const chunk of response.body) {
      if (!outgoing.write(chunk)) await new Promise(resolve => outgoing.once('drain', resolve));
    }
    outgoing.end();
  })();
}

/** @returns {import('vite').Plugin} */
export function localApiPlugin() {
  return {
    name: 'oman-earth-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((incoming, outgoing, next) => {
        let pathname;
        try {
          pathname = requestUrl(incoming).pathname;
        } catch {
          outgoing.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          outgoing.end(JSON.stringify({ error: 'Invalid request URL' }));
          return;
        }
        if (pathname !== '/api' && !pathname.startsWith(API_PREFIX)) return next();

        void (async () => {
          try {
            const url = requestUrl(incoming);
            const init = { method: incoming.method, headers: requestHeaders(incoming) };
            if (incoming.method !== 'GET' && incoming.method !== 'HEAD') {
              init.body = Readable.toWeb(incoming);
              init.duplex = 'half';
            }
            const request = new Request(url, init);
            const response = await worker.fetch(request, LOCAL_ENV, LOCAL_CONTEXT);
            await sendResponse(outgoing, response);
          } catch (error) {
            console.error('[vite-local-api] Request failed:', error);
            if (!outgoing.headersSent) {
              outgoing.writeHead(500, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
              });
            }
            outgoing.end(JSON.stringify({ error: 'Local API request failed' }));
          } finally {
            if (!incoming.complete) incoming.resume();
          }
        })();
      });
    },
  };
}
