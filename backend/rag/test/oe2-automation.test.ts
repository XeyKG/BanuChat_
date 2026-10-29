import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test,{after} from 'node:test';
import {createOe2FixtureService} from '../src/oe2/main.js';
import {FileOe2StateStore,runOe2FixtureFlow,extractOe2Fixture} from '../src/oe2/flow.js';
import {Oe2FlowError} from '../src/oe2/errors.js';
import {createOe2HttpServer} from '../src/oe2/server.js';
import type {Oe2ExecutionRecord} from '../src/oe2/types.js';

const sourceRoot=fileURLToPath(new URL('../../../eval/oe2/fixtures/',import.meta.url));
const temporaryRoots:string[]=[];
after(async()=>{for(const root of temporaryRoots){
 assert.equal(path.dirname(path.resolve(root)),path.resolve(tmpdir()));assert.ok(path.basename(root).startsWith('banuchat-oe2-automation-'));
 await rm(root,{recursive:true,force:true});
}});
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'banuchat-oe2-automation-'));
 temporaryRoots.push(root);
 const sources=path.join(root,'sources'),state=path.join(root,'state');await mkdir(sources);await mkdir(state);
 const bytes=await readFile(path.join(sourceRoot,'news.json'));await writeFile(path.join(sources,'news.json'),bytes);
 const store=new FileOe2StateStore(state),input={category:'news' as const,sourceId:'fixture-news-v1',fixtureRoot:sources,store};
 await runOe2FixtureFlow(input);
 return {root,sources,state,bytes,store,input,read:()=>readFile(path.join(state,'news.json'),'utf8')};
}

test('empty, invalid and duplicate sources preserve the last valid file',async()=>{
 const f=await fixture(),before=await f.read();
 for(const mutation of ['empty','date','duplicate']){
  const data=JSON.parse(f.bytes.toString());
  if(mutation==='empty')data.records=[];
  if(mutation==='date')data.records[0].published_at='2026-02-30T10:00:00-05:00';
  if(mutation==='duplicate')data.records.push(data.records[0]);
  await writeFile(path.join(f.sources,'news.json'),JSON.stringify(data)+'\n');
  await assert.rejects(runOe2FixtureFlow(f.input));assert.equal(await f.read(),before);
 }
 const journal=(await readFile(path.join(f.state,'executions.jsonl'),'utf8')).trim().split('\n').map(l=>JSON.parse(l));
 assert.equal(journal.filter(r=>r.outcome==='failed').length,3);assert.equal(journal[1].error_code,'SOURCE_EMPTY');
});

test('temporary acquisition failure is reconciled before a repeated unchanged run',async()=>{
 const f=await fixture(),before=await f.read();
 await rename(path.join(f.sources,'news.json'),path.join(f.sources,'news.offline'));
 await assert.rejects(runOe2FixtureFlow(f.input),e=>e instanceof Oe2FlowError&&e.code==='SOURCE_UNAVAILABLE');
 assert.equal(await f.read(),before);assert.equal((await f.store.status('news') as {operation_state:string}).operation_state,'idle');
 await rename(path.join(f.sources,'news.offline'),path.join(f.sources,'news.json'));
 assert.equal((await runOe2FixtureFlow(f.input)).outcome,'unchanged');assert.equal(await f.read(),before);
});

test('exclusive writer rejects overlaps and keeps a crash-style lease for explicit inspection',async()=>{
 const f=await fixture();let release!:()=>void,entered!:()=>void;
 const ready=new Promise<void>(resolve=>{entered=resolve;});
 const held=f.store.withLease('news',async()=>{entered();await new Promise<void>(r=>{release=r;});});await ready;
 assert.equal((await f.store.status('news') as {operation_state:string}).operation_state,'running');
 await assert.rejects(runOe2FixtureFlow(f.input),e=>e instanceof Oe2FlowError&&e.code==='RUN_IN_PROGRESS');
 release();await held;
 await writeFile(path.join(f.state,'news.lock'),'abandoned-test-lease',{flag:'wx'});
 await assert.rejects(runOe2FixtureFlow(f.input),e=>e instanceof Oe2FlowError&&e.code==='RUN_IN_PROGRESS');
 assert.equal(await readFile(path.join(f.state,'news.lock'),'utf8'),'abandoned-test-lease');
});

test('corrupted state is rejected and never silently replaced by a new candidate',async()=>{
 const f=await fixture(),state=JSON.parse(await f.read());state.records[0].title='Tampered';
 const invalid=JSON.stringify(state)+'\n';await writeFile(path.join(f.state,'news.json'),invalid);
 await assert.rejects(runOe2FixtureFlow(f.input),e=>e instanceof Oe2FlowError&&e.code==='STATE_ERROR');
 assert.equal(await f.read(),invalid);
});

test('audit failure after an atomic save is resolved by status, then an idempotent run',async()=>{
 const f=await fixture();let fail=true;
 class AuditFault extends FileOe2StateStore {
  override async recordRun(record:Oe2ExecutionRecord){if(fail&&record.outcome==='succeeded'){fail=false;throw new Error('private audit failure');}return super.recordRun(record);}
 }
 const changed=JSON.parse(f.bytes.toString());changed.records[0].title+=' Actualizado';await writeFile(path.join(f.sources,'news.json'),JSON.stringify(changed)+'\n');
 const store=new AuditFault(f.state),input={...f.input,store};
 await assert.rejects(runOe2FixtureFlow(input),e=>e instanceof Oe2FlowError&&e.code==='STATE_ERROR');
 const observed=await store.load('news');assert.equal(observed?.records[0]?.title,changed.records[0].title);
 const after=await f.read();assert.equal((await runOe2FixtureFlow(input)).outcome,'unchanged');assert.equal(await f.read(),after);
});

test('invalid civil dates are rejected instead of normalized into March',async()=>{
 const bytes=await readFile(path.join(sourceRoot,'academic-offer.json')),data=JSON.parse(bytes.toString());
 data.records[0].start_date='2026-02-30';assert.throws(()=>extractOe2Fixture(Buffer.from(JSON.stringify(data)+'\n'),'academic_offer','fixture-academic-offer-v1'));
});

test('operational HTTP errors retain their class and do not expose native details',async()=>{
 const token='oe2-test-service-token-'+ 'a'.repeat(32);
 const server=createOe2HttpServer({async run(){throw new Oe2FlowError('SOURCE_UNAVAILABLE');},async status(){throw new Error('SECRET C:/private/path SELECT password');}},token);
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address==='object');
 try{for(const [endpoint,status,code]of [['run',503,'SOURCE_UNAVAILABLE'],['status',500,'INTERNAL_ERROR']] as const){
  const response:Response=await fetch(`http://127.0.0.1:${address.port}/internal/oe2/${endpoint}`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(endpoint==='run'?{category:'news',source_id:'fixture-news-v1'}:{category:'news'})});
  assert.equal(response.status,status);const raw=await response.text();assert.equal(JSON.parse(raw).error_code,code);assert.doesNotMatch(raw,/SECRET|private|SELECT|password/u);
 }}finally{await new Promise<void>(r=>server.close(()=>r()));}
});

test('source and state roots must be disjoint',()=>{
 assert.throws(()=>createOe2FixtureService(sourceRoot,sourceRoot));
 assert.throws(()=>createOe2FixtureService(sourceRoot,path.join(sourceRoot,'state')));
});

test('all workflow templates stay inactive with status admission, reconciliation and no retry',async()=>{
 for(const slug of ['academic-offer','calls','news']){
  const workflow=JSON.parse(await readFile(new URL('../../../n8n/workflows/oe2-'+slug+'-fixture-v1.json',import.meta.url),'utf8'));
  assert.equal(workflow.active,false);const http=workflow.nodes.filter((n:{type:string})=>n.type==='n8n-nodes-base.httpRequest');
  assert.equal(http.length,3);assert.ok(http.every((n:{retryOnFail:boolean})=>n.retryOnFail===false));
  assert.equal(workflow.connections['Run Fixture Flow Once'].main[1][0].node,'Reconcile After Uncertain Run');
  assert.equal(workflow.connections['Check Last Valid State'].main[0][0].node,'Admit Only Idle State');
 }
});
