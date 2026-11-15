import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createNetServer } from 'node:net';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

async function findAvailablePort() {
  const listener = createNetServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const address = listener.address();
  assert.ok(address && typeof address === 'object');
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return address.port;
}

test('Vite development server handles API routes through the local Worker', async () => {
  const port = await findAvailablePort();
  const server = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '0.0.0.0', port, strictPort: true },
    logLevel: 'silent',
  });
  try {
    await server.listen();
    const address = server.httpServer.address();
    assert.ok(address && typeof address === 'object');
    assert.equal(address.port, port);
    assert.notEqual(address.port, 5173);
    const origin = `http://127.0.0.1:${address.port}`;

    const statusResponse = await fetch(`${origin}/api/status`);
    assert.equal(statusResponse.status, 200);
    assert.equal(statusResponse.headers.get('x-content-type-options'), 'nosniff');
    const status = await statusResponse.json();
    assert.equal(status.ready, true);
    assert.equal(status.aiConfigured, false);

    for (const [host, claimedOrigin] of [
      ['localhost', `http://127.0.0.1:${address.port}`],
      ['127.0.0.1', `http://localhost:${address.port}`],
    ]) {
      const response = await fetch(`http://${host}:${address.port}/api/status`, {
        headers: { Origin: claimedOrigin },
      });
      assert.equal(response.status, 200, `${host} with loopback alias Origin`);
      assert.equal(response.headers.get('access-control-allow-origin'), claimedOrigin);
    }

    const foreignOrigin = await fetch(`${origin}/api/status`, {
      headers: { Origin: 'https://example.invalid' },
    });
    assert.equal(foreignOrigin.status, 403);

    const crossSite = await fetch(`${origin}/api/status`, {
      headers: { Origin: `http://localhost:${address.port}`, 'Sec-Fetch-Site': 'cross-site' },
    });
    assert.equal(crossSite.status, 403);

    const invalidQuery = await fetch(`${origin}/api/power?lat=999&lon=55&start=2000&end=2025`);
    assert.equal(invalidQuery.status, 400);
    assert.equal(invalidQuery.headers.get('cache-control'), 'no-store');

    const unavailableAi = await fetch(`${origin}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(unavailableAi.status, 501);
    assert.equal((await unavailableAi.json()).modelEnabled, false);
  } finally {
    await server.close();
  }
});
