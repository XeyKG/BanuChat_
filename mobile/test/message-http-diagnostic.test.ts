/// <reference types="node" />
import assert from 'node:assert/strict';
import test, {type TestContext} from 'node:test';
import {AuthSession, type RefreshStore} from '../src/auth/auth-session';
import {installAuthSession} from '../src/auth/runtime';
import {sendMessage, MessageRequestError, MESSAGE_TIMEOUT_MS} from '../src/api/messages';

const base = 'http://127.0.0.1:3003/api/v2';
const id = '11111111-1111-4111-8111-111111111111';
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const access = 'A'.repeat(43), refresh = 'B'.repeat(42) + 'A';
const password = 'PRIVATE_PASSWORD_FIXTURE_ONLY', question = 'PRIVATE_QUESTION_FIXTURE_ONLY';
const document = 'PRIVATE_DOCUMENT_FIXTURE_ONLY', cookie = 'PRIVATE_COOKIE_FIXTURE_ONLY';
const me = {principal_id:id, synthetic_uid:'U08000001', session_id:id, session_expires_at:'2035-01-01T00:00:00Z', release_id:id,
  evidence_mode:'ccd_local', profile:{profile_key:'account-001', alias:'Usuario'}, capabilities:['chat','history','progress','calendar','announcements','documents']};
const pair = {access_token:access, refresh_token:refresh, token_type:'Bearer', expires_in:900, session_expires_at:me.session_expires_at};
const globals = globalThis as typeof globalThis & {__DEV__?: boolean};
const names = ['EXPO_PUBLIC_DEMO_MODE', 'EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_AUTH_LOCAL_CHANNEL', 'EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP'];
const original = names.map(name => [name, process.env[name]] as const), originalDev = globals.__DEV__;

test.afterEach(() => {
  for (const [name, value] of original) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  if (originalDev === undefined) delete globals.__DEV__; else globals.__DEV__ = originalDev;
});
test.beforeEach(() => {
  process.env.EXPO_PUBLIC_DEMO_MODE = 'ccd_authenticated';
  process.env.EXPO_PUBLIC_API_BASE_URL = base;
  process.env.EXPO_PUBLIC_AUTH_LOCAL_CHANNEL = 'adb_reverse';
  delete process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP;
  globals.__DEV__ = true;
});

function capture(t: TestContext) {
  const logs: unknown[][] = [];
  t.mock.method(console, 'info', (...args: unknown[]) => { logs.push(args); });
  return logs;
}
async function flush() { for (let i = 0; i < 5; i++) await new Promise<void>(resolve => setImmediate(resolve)); }
async function fixture(handler: typeof fetch) {
  let stored: string | null = null, posts = 0;
  const vault: RefreshStore = {available:async()=>true, get:async()=>stored, set:async v=>{stored=v;}, clear:async()=>{stored=null;}};
  const client = new AuthSession(vault, () => base, async (url, options) => {
    if (String(url).endsWith('/auth/login')) return Response.json(pair);
    if (String(url).endsWith('/auth/me')) return Response.json(me);
    if (String(url).endsWith('/messages')) posts++;
    return handler(url, options);
  });
  await client.login(me.synthetic_uid, password); installAuthSession(client);
  return {client, posts:()=>posts, stored:()=>stored};
}
function failure(status: number, code: unknown, correlation: unknown = requestId): Response {
  return Response.json({error:{code, request_id:correlation, message:question, stack:document, authorization:access, uid:me.synthetic_uid},
    password, refresh, conversation_id:id, document, cookie},
  {status, headers:{Authorization:'Bearer '+access, 'Set-Cookie':cookie}});
}
function assertSafe(logs: unknown[][]) {
  const serialized = JSON.stringify(logs);
  for (const secret of [password, question, document, cookie, access, refresh, me.synthetic_uid, id, base]) assert.ok(!serialized.includes(secret));
  for (const [prefix, fields, ...extra] of logs) {
    assert.equal(prefix, '[BanuChat message HTTP]'); assert.deepEqual(extra, []);
    assert.ok(fields && typeof fields === 'object');
    assert.ok(Object.keys(fields).every(key => ['http_status','duration_ms','error_code','request_id'].includes(key)));
    const row = fields as {http_status:number; duration_ms:number};
    assert.equal(Number.isInteger(row.http_status), true); assert.ok(Number.isInteger(row.duration_ms) && row.duration_ms >= 0);
  }
}

for (const [status, code] of [[400,'INVALID_ARGUMENT'],[429,'RATE_LIMITED'],[500,'INTERNAL_ERROR'],[503,'DEPENDENCY_UNAVAILABLE'],[409,'CONFLICT']] as const) {
  test(`diagnostic ${status} exposes only allowed metadata and preserves one POST / ${status === 409 ? 'conflict' : 'http'}`, async t => {
    process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
    let now = 1000; t.mock.method(Date, 'now', () => now);
    const f = await fixture(async () => { now += 137; return failure(status, code); });
    await assert.rejects(sendMessage(id, question), e => e instanceof MessageRequestError && e.kind === (status === 409 ? 'conflict' : 'http'));
    await flush(); assert.equal(f.posts(), 1); assert.equal(f.client.getSnapshot().phase, 'authenticated');
    assert.equal(logs.length, 2);
    assert.deepEqual(logs[0]![1], {http_status:status, duration_ms:137});
    assert.deepEqual(logs[1]![1], {http_status:status, duration_ms:137, error_code:code, request_id:requestId}); assertSafe(logs);
  });
}
test('diagnostic is disabled by default, for other flag values, and outside development', async t => {
  const logs = capture(t);
  for (const [flag, dev] of [[undefined,true],['0',true],['true',true],[' 1',true],['1',false],['1',undefined]] as const) {
    if (flag === undefined) delete process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP; else process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = flag;
    if (dev === undefined) delete globals.__DEV__; else globals.__DEV__ = dev;
    let clones = 0; const r = failure(500,'INTERNAL_ERROR'); r.clone = () => { clones++; throw Error(document); };
    const f = await fixture(async () => r);
    await assert.rejects(sendMessage(id,question), e => e instanceof MessageRequestError && e.kind === 'http');
    await flush(); assert.equal(f.posts(),1); assert.equal(clones,0); assert.deepEqual(logs,[]);
  }
});
test('missing, hostile or malformed error metadata never leaks into a diagnostic', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  for (const make of [
    () => failure(500,access,question), () => failure(500,me.synthetic_uid,id+'\n'),
    () => failure(500,{secret:password},{secret:refresh}), () => Response.json({error:null,document},{status:500}),
    () => new Response(document,{status:500}),
    () => {const r=failure(500,'INTERNAL_ERROR');r.clone=()=>{throw Error(document);};return r;},
  ]) {
    const prior = logs.length, f = await fixture(async () => make());
    await assert.rejects(sendMessage(id,question), e => e instanceof MessageRequestError && e.kind === 'http');
    await flush(); assert.equal(f.posts(),1); assert.equal(logs.length,prior+1);
    assert.deepEqual(Object.keys(logs.at(-1)![1] as object).sort(),['duration_ms','http_status']);
  }
  assertSafe(logs);
});
test('valid optional fields survive independently; original body is not consumed', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  const r = failure(503,'DEPENDENCY_UNAVAILABLE',password); const f = await fixture(async () => r);
  await assert.rejects(sendMessage(id,question)); await flush();
  assert.equal(r.bodyUsed,false); assert.equal((await r.json()).error.message,question);
  assert.deepEqual(logs[1]![1], {...logs[0]![1] as object, error_code:'DEPENDENCY_UNAVAILABLE'});
  const second = await fixture(async () => failure(400,password)); await assert.rejects(sendMessage(id,question)); await flush();
  assert.deepEqual(logs[3]![1], {...logs[2]![1] as object, request_id:requestId});
  assert.equal(f.posts(),1); assert.equal(second.posts(),1); assertSafe(logs);
});
test('HTTP classification is immediate even if diagnostic metadata has not arrived', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  let finish!: (body: unknown) => void; const held = new Promise<unknown>(resolve=>{finish=resolve;});
  const r = failure(409,'CONFLICT'); r.clone = () => ({json:()=>held}) as Response;
  await fixture(async()=>r);
  await assert.rejects(sendMessage(id,question), e=>e instanceof MessageRequestError && e.kind==='conflict');
  assert.equal(logs.length,1); finish({error:{code:'CONFLICT',request_id:requestId,message:question}}); await flush();
  assert.equal(logs.length,2); assertSafe(logs);
});
test('401 remains observable while auth invalidates the session without retry', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  const f = await fixture(async()=>failure(401,'UNAUTHENTICATED'));
  await assert.rejects(sendMessage(id,question), e=>e instanceof MessageRequestError && e.kind==='network');
  await flush(); assert.equal(f.posts(),1); assert.equal(f.client.getSnapshot().phase,'signed_out'); assert.equal(f.stored(),null);
  assert.equal((logs[1]![1] as {error_code:string}).error_code,'UNAUTHENTICATED'); assertSafe(logs);
});
test('network failure remains uncertain with no invented HTTP diagnostic or POST retry', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  const f = await fixture(async()=>{throw Error(question+' '+access);});
  await assert.rejects(sendMessage(id,question), e=>e instanceof MessageRequestError && e.kind==='network');
  await flush(); assert.equal(f.posts(),1); assert.deepEqual(logs,[]);
});
test('the existing 90-second timeout remains uncertain, without a diagnostic or POST retry', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  let entered!:()=>void;const began=new Promise<void>(resolve=>{entered=resolve;});
  const f=await fixture(async(_url,options)=>new Promise<Response>((_resolve,reject)=>{
    options!.signal!.addEventListener('abort',()=>reject(Error(document)),{once:true}); entered();
  }));
  assert.equal(MESSAGE_TIMEOUT_MS,90_000); t.mock.timers.enable({apis:['setTimeout']});
  const pending=sendMessage(id,question); await began; t.mock.timers.tick(MESSAGE_TIMEOUT_MS);
  await assert.rejects(pending,e=>e instanceof MessageRequestError && e.kind==='timeout');
  assert.equal(f.posts(),1); assert.deepEqual(logs,[]);
});
test('201, malformed success and unrelated protected requests do not emit HTTP rejection logs', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  const f = await fixture(async(url)=>String(url).endsWith('/messages')?Response.json({}, {status:201}):failure(503,'DEPENDENCY_UNAVAILABLE'));
  await assert.rejects(sendMessage(id,question),e=>e instanceof MessageRequestError && e.kind==='invalid_response');
  const unrelated=await f.client.resource(base+'/conversations'); assert.equal(unrelated.status,503);
  await flush(); assert.equal(f.posts(),1); assert.deepEqual(logs,[]);
});
test('successful 201 keeps the normal messages and emits no diagnostic', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; const logs = capture(t);
  const payload={conversation_id:id,user_message:{message_id:id,role:'user',content:question,created_at:'2026-10-23T00:00:00Z'},
    assistant_message:{message_id:id,role:'assistant',content:document,created_at:'2026-10-23T00:00:00Z',insufficient_evidence:true,citations:[]}};
  const f=await fixture(async()=>Response.json(payload,{status:201}));
  assert.deepEqual(await sendMessage(id,question),payload);await flush();assert.equal(f.posts(),1);assert.deepEqual(logs,[]);
});
test('throwing console output cannot change HTTP error classification or trigger retries', async t => {
  process.env.EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'; t.mock.method(console,'info',()=>{throw Error(document);});
  const f=await fixture(async()=>failure(500,'INTERNAL_ERROR'));
  await assert.rejects(sendMessage(id,question),e=>e instanceof MessageRequestError && e.kind==='http'); await flush(); assert.equal(f.posts(),1);
});
