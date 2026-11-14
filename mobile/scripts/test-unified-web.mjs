import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp, writeFile, rm, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createUnifiedWebServer, WEB_ORIGIN} from './serve-unified-web.mjs';

test('same-origin proxy preserves REST errors/binary, restricts transport and serves only the export', async () => {
  const directory = await mkdtemp(path.join(tmpdir(),'banuchat-web-'));
  await writeFile(path.join(directory,'index.html'),'<h1>BanuChat</h1>');
  await mkdir(path.join(directory,'assets')); await writeFile(path.join(directory,'assets','secret.map'),'not public');
  const calls = [];
  const backend = http.createServer(async (req,res) => {
    const chunks=[]; for await (const part of req) chunks.push(part);
    calls.push({path:req.url,method:req.method,headers:req.headers,body:Buffer.concat(chunks)});
    if (req.url.endsWith('/artifact')) {res.writeHead(200,{'Content-Type':'application/octet-stream'});res.end(Buffer.from([0,255,60,62]));}
    else if (req.url.endsWith('/logout')) {res.writeHead(204);res.end();}
    else {res.writeHead(409,{'Content-Type':'application/json','Set-Cookie':'forbidden=1','Cache-Control':'public'});res.end('{"error":{"code":"CONFLICT"}}');}
  });
  await new Promise(r=>backend.listen(0,'127.0.0.1',r));
  const backendPort = backend.address().port;
  const proxy = createUnifiedWebServer({directory,transport:(options,callback)=>{
    assert.equal(options.hostname,'127.0.0.1');assert.equal(options.port,3004);
    return http.request({...options,port:backendPort},callback);
  }});
  await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
  const request=(target,method='GET',body='',extra={})=>new Promise((resolve,reject)=>{
    const headers={Host:'127.0.0.1:8085',Origin:WEB_ORIGIN,...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),...extra};
    for(const key of Object.keys(headers))if(headers[key]===null)delete headers[key];
    const req=http.request({hostname:'127.0.0.1',port:proxy.address().port,path:target,method,headers},res=>{
      const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });req.on('error',reject);req.end(body);
  });
  try {
    let r=await request('/');assert.equal(r.status,200);assert.match(r.body.toString(),/BanuChat/);assert.equal(r.headers['cache-control'],'no-store');assert.match(r.headers['content-security-policy'],/script-src 'self'/);
    for (const [target,method,body,headers,status] of [
      ['/','GET','',{Host:'evil.test'},403],['/','GET','',{Origin:'http://evil.test'},403],
      ['/','GET','',{'Sec-Fetch-Site':'cross-site'},403],
      ['/api/v1/profiles','GET','',{},404],['/api/v2/admin','GET','',{},404],
      ['/api/v2/auth/password/reset','POST','{}',{},404],
      ['/api/v2/conversations','PUT','{}',{},405],
      ['/api/v2/auth/login?token=secret','POST','{}',{},400],
      ['/api/v2/conversations?profile_key=other','GET','',{},400],
      ['/api/v2/conversations?limit=1&limit=2','GET','',{},400],
      ['/api/v2/auth/login','POST','{}',{Origin:''},403],
      ['/api/v2/auth/login','POST','{}',{'Content-Type':'text/plain'},400],
      ['/api/v2/auth/login','POST','x'.repeat(16385),{},413],
      ['/api/v2/auth/login','POST','x'.repeat(16385),{'Content-Length':null,'Transfer-Encoding':'chunked'},413],
      ['/api/v2/auth/me','GET','',{Authorization:['Bearer first','Bearer second']},400],
      ['/api/v2/auth/login','POST','{}',{'Content-Encoding':'gzip'},400],
      ['/api/v2/auth/me','GET','{}',{},400],['/api/v2/auth/logout','POST','{}',{},400],
      ['/../package.json','GET','',{},400],['/%2e%2e/package.json','GET','',{},400],
      ['//evil.test/api/v2/auth/me','GET','',{},400],['/assets/secret.map','GET','',{},404],
    ]) {r=await request(target,method,body,headers);assert.equal(r.status,status,`${method} ${target}`);}
    assert.equal(calls.length,0,'rejections must never contact backend');
    r=await request('/api/v2/conversations','POST','{}',{Authorization:'Bearer synthetic-not-a-token',Cookie:'private=not-forwarded'});
    assert.equal(r.status,409);assert.equal(r.body.toString(),'{"error":{"code":"CONFLICT"}}');
    assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.headers['access-control-allow-origin'],undefined);
    assert.equal(calls[0].headers.authorization,'Bearer synthetic-not-a-token');assert.equal(calls[0].headers.cookie,undefined);assert.equal(calls[0].body.toString(),'{}');
    r=await request('/api/v2/documents/11111111-1111-4111-8111-111111111111/artifact');assert.equal(r.status,200);assert.deepEqual(r.body,Buffer.from([0,255,60,62]));
    r=await request('/api/v2/auth/logout','POST');assert.equal(r.status,204);assert.equal(r.body.length,0);
    const origin = 'https://demo.banuchat.test';
    const publicProxy = createUnifiedWebServer({directory,origin,transport:(options,callback)=>http.request({...options,port:backendPort},callback)});
    await new Promise(r=>publicProxy.listen(0,'127.0.0.1',r));
    try {
      const post = headers => new Promise((resolve,reject) => {
        const req = http.request({hostname:'127.0.0.1',port:publicProxy.address().port,
          path:'/api/v2/auth/logout',method:'POST',headers:{Host:'demo.banuchat.test',...headers}}, response => {
          response.resume();
          resolve(response.statusCode);
        });
        req.on('error',reject).end();
      });
      assert.equal(await post({}),204);
      assert.equal(await post({Origin:origin,'Sec-Fetch-Site':'same-origin'}),204);
      assert.equal(await post({Origin:'https://other.test'}),403);
      assert.equal(await post({'Sec-Fetch-Site':'cross-site'}),403);
    } finally {
      publicProxy.closeAllConnections();
      await new Promise(r=>publicProxy.close(r));
    }
    await new Promise(r=>backend.close(r));r=await request('/api/v2/auth/me');assert.equal(r.status,503);assert.ok(!r.body.toString().includes(directory));
  } finally {
    proxy.closeAllConnections();backend.closeAllConnections();
    await new Promise(r=>proxy.close(r)); if(backend.listening) await new Promise(r=>backend.close(r));
    await rm(directory,{recursive:true,force:true});
  }
});
