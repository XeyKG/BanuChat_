import http from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile, realpath, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const WEB_ORIGIN = 'http://127.0.0.1:8085';
const HOST = '127.0.0.1:8085', MAX_BODY = 16384;
const UUID = '[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}';
const routes = [
  [/^\/auth\/(?:login|refresh)$/, ['POST'], []],
  [/^\/auth\/me$/, ['GET'], []],
  [/^\/auth\/logout$/, ['POST'], []],
  [/^\/conversations$/, ['GET','POST'], ['limit']],
  [new RegExp(`^/conversations/${UUID}$`), ['GET','DELETE'], []],
  [new RegExp(`^/conversations/${UUID}/messages$`), ['POST'], []],
  [/^\/me\/progress$/, ['GET'], ['statuses','limit']],
  [/^\/me\/academic$/, ['GET'], []],
  [/^\/calendar\/events$/, ['GET'], ['date_from','date_to','event_types','limit']],
  [/^\/announcements$/, ['GET'], ['query','temporal_status','reference_time','limit']],
  [new RegExp(`^/documents/${UUID}/artifact$`), ['GET'], []],
  [/^\/demo\/oe2\/programming$/, ['GET'], ['query','mode','limit']],
  [/^\/demo\/oe2\/announcements$/, ['GET'], ['query','type','temporal_status','limit']],
  [/^\/demo\/oe2\/changes$/, ['GET'], ['category','change_type','limit']],
];
const pages = new Set(['index','login','home','chat','history','document','calendar','progress','announcements','oe2','oe2-changes']);
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
function csp(hashes = []) {
  return `default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
}
function headers(res) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Vary','Authorization');
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy', csp());
}
function fail(res,status,code,extra={}) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...extra});
  res.end(JSON.stringify({error:{code,message:'No fue posible completar la solicitud local.'}}));
}
function invalidTarget(raw) {
  return raw.length > 8192 || !raw.startsWith('/') || raw.startsWith('//') || /[\\#\u0000-\u0020\u007f]/u.test(raw) || /%(?:2f|5c|00|2e)/iu.test(raw.split('?')[0]) || /(?:^|\/)\.{1,2}(?:\/|$)/u.test(raw.split('?')[0]);
}

/** The transport seam is only for tests. The CLI always targets 127.0.0.1:3004. No request logging. */
export function createUnifiedWebServer({directory, transport = http.request}) {
  const server = http.createServer({maxHeaderSize:16384}, async (req,res) => {
    headers(res);
    try {
      for (const name of ['host','origin','authorization','content-type']) {
        let count=0;
        for(let index=0;index<req.rawHeaders.length;index+=2) if(req.rawHeaders[index].toLowerCase()===name) count++;
        if(count>1) return fail(res,400,'INVALID_ARGUMENT');
      }
      if (req.headers.host !== HOST || (req.headers.origin !== undefined && req.headers.origin !== WEB_ORIGIN) ||
          (req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site']))) return fail(res,403,'ORIGIN_NOT_ALLOWED');
      const raw = req.url ?? '';
      if (invalidTarget(raw)) return fail(res,400,'INVALID_ARGUMENT');
      const url = new URL(raw, WEB_ORIGIN), api = url.pathname.startsWith('/api/');
      if (api) {
        if (!url.pathname.startsWith('/api/v2/')) return fail(res,404,'NOT_FOUND');
        const route = routes.find(([pattern]) => pattern.test(url.pathname.slice(7)));
        if (!route) return fail(res,404,'NOT_FOUND');
        if (!route[1].includes(req.method)) return fail(res,405,'METHOD_NOT_ALLOWED',{Allow:route[1].join(', ')});
        if (['POST','DELETE'].includes(req.method) && req.headers.origin !== WEB_ORIGIN) return fail(res,403,'ORIGIN_NOT_ALLOWED');
        const queryAllowed = req.method === 'GET' ? route[2] : [];
        for (const key of url.searchParams.keys()) {
          const count = url.searchParams.getAll(key).length;
          if (!queryAllowed.includes(key) || count > (['statuses','event_types'].includes(key) ? 3 : 1)) return fail(res,400,'INVALID_ARGUMENT');
        }
        if (req.headers['content-encoding'] !== undefined) return fail(res,400,'INVALID_ARGUMENT');
        if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) return fail(res,413,'PAYLOAD_TOO_LARGE');
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > MAX_BODY) { fail(res,413,'PAYLOAD_TOO_LARGE'); return; }
          chunks.push(chunk);
        }
        if ((['GET','DELETE'].includes(req.method) || url.pathname === '/api/v2/auth/logout') && size !== 0) return fail(res,400,'INVALID_ARGUMENT');
        if (req.method === 'POST' && url.pathname !== '/api/v2/auth/logout' && !/^application\/json(?:;\s*charset=utf-8)?$/iu.test(req.headers['content-type'] ?? '')) return fail(res,400,'INVALID_ARGUMENT');
        const forwarded = {};
        for (const name of ['authorization','content-type']) if (req.headers[name] !== undefined) forwarded[name] = req.headers[name];
        if (size) forwarded['content-length'] = String(size);
        const upstream = transport({hostname:'127.0.0.1',port:3004,path:raw,method:req.method,headers:forwarded}, response => {
          const allowed = {};
          for (const name of ['content-type','content-length','content-disposition','allow','retry-after']) if (response.headers[name] !== undefined) allowed[name] = response.headers[name];
          const location = response.headers.location;
          if (typeof location === 'string' && /^\/api\/v2\/conversations\/[a-f0-9-]+$/iu.test(location)) allowed.location = location;
          res.writeHead(response.statusCode ?? 502, allowed);
          response.on('error', () => res.destroy()); response.pipe(res);
        });
        upstream.setTimeout(180000, () => upstream.destroy());
        upstream.on('error', () => { if (!res.headersSent) fail(res,503,'DEPENDENCY_UNAVAILABLE'); else res.destroy(); });
        res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
        upstream.end(size ? Buffer.concat(chunks) : undefined);
        return;
      }
      if (!['GET','HEAD'].includes(req.method)) return fail(res,405,'METHOD_NOT_ALLOWED',{Allow:'GET, HEAD'});
      if (req.headers['transfer-encoding'] || Number(req.headers['content-length'] ?? 0) !== 0) return fail(res,400,'INVALID_ARGUMENT');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.split('/').some(part => part.startsWith('.'))) return fail(res,404,'NOT_FOUND');
      let relative = pathname.slice(1);
      if (pathname === '/') relative = 'index.html';
      else if (pages.has(relative)) relative += '.html';
      else if (!relative.startsWith('_expo/') && !relative.startsWith('assets/') && relative !== 'favicon.ico') return fail(res,404,'NOT_FOUND');
      if (!mime[path.extname(relative)] || relative.endsWith('.map')) return fail(res,404,'NOT_FOUND');
      const root = await realpath(directory), file = await realpath(path.join(root,relative));
      const inside = path.relative(root,file);
      if (inside.startsWith('..') || path.isAbsolute(inside)) return fail(res,404,'NOT_FOUND');
      const info = await stat(file);
      if (!info.isFile()) return fail(res,404,'NOT_FOUND');
      if (path.extname(file) === '.html') {
        const html = await readFile(file,'utf8');
        const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)]
          .filter(match => !/\bsrc\s*=/iu.test(match[1]))
          .map(match => `'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
        res.setHeader('Content-Security-Policy',csp(hashes));
      }
      res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Content-Length':info.size});
      if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch {
      if (!res.headersSent) fail(res,404,'NOT_FOUND'); else res.destroy();
    }
  });
  server.headersTimeout = 10000; server.requestTimeout = 180000;
  server.on('clientError', (_error,socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Length: 0\r\n\r\n'); });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const directory = fileURLToPath(new URL('../.expo/unified-web/', import.meta.url));
  const server = createUnifiedWebServer({directory});
  server.on('error', () => { process.stderr.write('No fue posible iniciar BanuChat Web local.\n'); process.exitCode = 1; });
  server.listen(8085,'127.0.0.1', () => process.stdout.write(`BanuChat Web local: ${WEB_ORIGIN}\n`));
}
