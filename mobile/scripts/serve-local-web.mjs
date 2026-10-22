/** Local-only operational check of the existing Expo Web export; not a deployed service. */
import { createServer } from 'node:http';
import { readFile, mkdir, appendFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mode = process.argv[2];
if (!['ccd_local', 'synthetic'].includes(mode)) throw new Error('Select ccd_local or synthetic');
const port = mode === 'ccd_local' ? 8083 : 8084;
const target = mode === 'ccd_local' ? 3001 : 3302;
const root = fileURLToPath(new URL(`../.expo/${mode === 'ccd_local' ? 'ccd' : 'synthetic'}-web/`, import.meta.url));
const evidence = fileURLToPath(new URL(`../.expo/${mode}-evidence/`, import.meta.url));
await mkdir(evidence, { recursive: true });
const log = path.join(evidence, `http-${Date.now()}.jsonl`);
const origin = `http://127.0.0.1:${port}`;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}` || (req.headers.origin && req.headers.origin !== origin)) {
      res.writeHead(403).end(); return;
    }
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/v1/')) {
      if (!['GET', 'POST'].includes(req.method)) { res.writeHead(405).end(); return; }
      let body = '';
      for await (const part of req) { body += part; if (body.length > 16384) { res.writeHead(413).end(); return; } }
      // Explicit test fixture only; never forwarded to the backend or enabled by default.
      if (mode === 'ccd_local' && req.method === 'POST' && /\/conversations\/[^/]+\/messages$/u.test(url.pathname)) {
        let simulate = false;
        try { await rename(path.join(evidence, 'simulate-conflict-once'), path.join(evidence, `conflict-consumed-${Date.now()}`)); simulate = true; } catch { /* No fixture requested. */ }
        if (simulate) {
          const response = JSON.stringify({ error: { code: 'CONFLICT', message: 'La operación entra en conflicto con el estado actual.', request_id: '11111111-1111-4111-8111-111111111111' } });
          await appendFile(log, JSON.stringify({ at: new Date().toISOString(), method: req.method, route: url.pathname,
            request: body, status: 409, simulated: true, response }) + '\n');
          res.writeHead(409, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(response); return;
        }
      }
      const response = await fetch(`http://127.0.0.1:${target}${url.pathname}${url.search}`, {
        method: req.method, redirect: 'error', signal: AbortSignal.timeout(180000),
        ...(body ? { body, headers: { 'content-type': 'application/json' } } : {}),
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      await appendFile(log, JSON.stringify({ at: new Date().toISOString(), method: req.method, route: url.pathname + url.search,
        request: body || null, status: response.status, response: new TextDecoder().decode(bytes) }) + '\n');
      res.writeHead(response.status, { 'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
        'cache-control': 'no-store' }).end(bytes); return;
    }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const resolved = path.resolve(root, relative);
    if (resolved !== path.resolve(root) && !resolved.startsWith(path.resolve(root) + path.sep)) { res.writeHead(403).end(); return; }
    const candidates = [resolved, resolved + '.html', path.join(resolved, 'index.html')];
    if (!path.extname(relative)) candidates.push(path.join(root, 'index.html'));
    for (const candidate of candidates) {
      try {
        const content = await readFile(candidate);
        res.writeHead(200, { 'content-type': types[path.extname(candidate)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(content); return;
      } catch { /* Try only the fixed export paths above. */ }
    }
    res.writeHead(404).end();
  } catch { res.writeHead(503, { 'content-type': 'text/plain' }).end('Local preview unavailable'); }
});
server.listen(port, '127.0.0.1', () => console.log(`BanuChat ${mode} local preview ${origin}; evidence ${path.basename(log)}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); server.closeIdleConnections(); });
