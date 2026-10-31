import test from 'node:test';
import assert from 'node:assert/strict';
import {createObserver,wrapMethod,wrapSql,observedFetch,sqlStage,numericOllamaMetrics,ollamaEndpoint,type LatencyTrace} from '../scripts/unified-latency-observer.mjs';
import {summarizedTrace,statistics} from '../scripts/evaluate-unified-latency.mjs';
const secret='SYNTHETIC_PRIVATE_TEXT_AND_TOKEN';
test('sync observation preserves this, arguments and return identity without payload logging',()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t));
 const result={private:secret},target={call(input:unknown){assert.equal(this,target);assert.equal(input,secret);return result;}};
 const undo=wrapMethod(target,'call','router',o);
 o.request('D1','message',done=>{assert.equal(target.call(secret),result);done(201);done(201);});
 assert.equal(logs.length,1);assert.equal(logs[0]?.spans.length,1);assert.ok(!JSON.stringify(logs).includes(secret));
 undo();assert.equal(target.call(secret),result);
});
test('nested asynchronous spans keep parents and return the original values',async()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t));
 const result={value:secret};
 await o.request('D2','message',async done=>{
  assert.equal(await o.measure('generator',async()=>o.measure('generator_verify',async()=>result)),result);done(201);
 });
 const outer=logs[0]?.spans.find(s=>s.stage==='generator'),inner=logs[0]?.spans.find(s=>s.stage==='generator_verify');
 assert.equal(inner?.parent,outer?.id);assert.ok((outer?.duration_ms??-1)>=0);
});
test('errors preserve identity but never serialize messages, SQL or payloads',async()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t));const error=new Error(secret);
 await o.request('D3','message',async done=>{await assert.rejects(async()=>o.measure('embedding',async()=>{throw error;}),e=>e===error);done(503);});
 assert.equal(logs[0]?.spans[0]?.outcome,'error');assert.ok(!JSON.stringify(logs).includes(secret));
});
test('SQL promise and callback overloads retain results, callback this and arguments',async()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t)),result={rows:[{value:secret}]};
 const promise={query(_text:string,_values:unknown[]){return Promise.resolve(result);}};wrapSql(promise,o);
 await o.request('D1','message',async done=>{assert.equal(await promise.query('SELECT * FROM banuchat_auth.retrieve_ccd_knowledge_chunks($1)',[secret]),result);done(201);});
 const owner={id:1};const callback={query(_text:string,fn:(this:unknown,e:null,r:typeof result)=>void){fn.call(owner,null,result);return undefined;}};wrapSql(callback,o);
 o.request('D2','message',done=>{callback.query('SELECT * FROM banuchat_auth.persist_unified_turn($1)',function(e,r){assert.equal(this,owner);assert.equal(e,null);assert.equal(r,result);done(201);});});
 assert.equal(logs[0]?.spans[0]?.stage,'sql_retrieval');assert.equal(logs[1]?.spans[0]?.stage,'sql_persist');
 assert.ok(!JSON.stringify(logs).includes(secret));
});
test('fetch observation consumes JSON once and emits only numeric Ollama metrics',async()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t));let reads=0;
 const body={message:{content:secret},embeddings:[[0.1,0.2]],total_duration:12000000,load_duration:2000000,prompt_eval_count:8,eval_count:3};
 const response=new Response(JSON.stringify(body));const native=response.json.bind(response);response.json=async()=>{reads++;return native();};
 const fetcher=observedFetch((async()=>response) as typeof fetch,o);
 await o.request('D4','message',async done=>{assert.equal(await fetcher('http://127.0.0.1:11434/api/chat'),response);assert.deepEqual(await response.json(),body);done(201);});
 assert.equal(reads,1);assert.equal(logs[0]?.spans[0]?.metrics?.total_duration_ms,12);
 const serialized=JSON.stringify(logs);assert.ok(!serialized.includes(secret));assert.ok(!serialized.includes('embeddings'));
});
test('unscoped requests do not collect metrics or alter the fetch function result',async()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t));const response=new Response('{}');
 const fetcher=observedFetch((async()=>response) as typeof fetch,o);
 assert.equal(await fetcher('http://127.0.0.1:11434/api/show'),response);assert.equal(logs.length,0);
});
test('concurrent async contexts do not mix correlations',async()=>{
 const logs:LatencyTrace[]=[];const o=createObserver(t=>logs.push(t));
 await Promise.all(['D1','D2'].map(qid=>o.request(qid,'message',async done=>{await o.measure(qid==='D1'?'embedding':'generator',async()=>Promise.resolve(1));done(201);})));
 assert.equal(logs.find(t=>t.qid==='D1')?.spans[0]?.stage,'embedding');assert.equal(logs.find(t=>t.qid==='D2')?.spans[0]?.stage,'generator');
});
test('sink failure cannot change the application result',()=>{
 const o=createObserver(()=>{throw new Error(secret);});
 assert.equal(o.request('C1','progress',done=>{done(200);return 42;}),42);
});
test('classification and metric allowlists do not expose arbitrary values',()=>{
 assert.equal(sqlStage('SELECT '+secret),'sql_other');assert.equal(sqlStage('SELECT manifest FROM banuchat.dataset_releases'),'sql_manifest');
 assert.equal(ollamaEndpoint('http://outside.invalid:11434/api/chat'),null);
 assert.deepEqual(numericOllamaMetrics({total_duration:secret,eval_count:-1,message:secret}),{});
 assert.equal(sqlStage("SELECT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('banuchat_auth.retrieve_ccd_knowledge_chunks(uuid,public.vector,integer,text[])'))"),'sql_guard');
 assert.equal(sqlStage('SELECT * FROM banuchat_auth.retrieve_ccd_knowledge_chunks($1,$2,$3,$4)'),'sql_retrieval');
});
test('public summary keeps nested scopes separate and excludes raw span topology',()=>{
 const t:LatencyTrace={qid:'D1',kind:'message',started_at:'synthetic',server_ms:10,status:201,spans:[
  {id:1,parent:null,stage:'embedding',start_ms:0,duration_ms:8,outcome:'ok'},
  {id:2,parent:1,stage:'embedding_verify',start_ms:0,duration_ms:2,outcome:'ok'},
  {id:3,parent:null,stage:'sql_guard',start_ms:8,duration_ms:0.5,outcome:'ok'},
  {id:4,parent:null,stage:'sql_retrieval',start_ms:8.5,duration_ms:0.5,outcome:'ok'}]};
 const s=summarizedTrace(t);assert.equal(s.timings.embedding_inclusive.wall_ms,8);
 assert.equal(s.timings.embedding_verification_subset.wall_ms,2);
 assert.equal(s.timings.reference_guard_and_retrieval_rpc.wall_ms,1);
 assert.equal(s.timings.answer_validation,'NOT_MEASURED');assert.ok(!JSON.stringify(s).includes('start_ms'));
 assert.deepEqual(statistics([10,20,30,40]),{n:4,mean_ms:25,median_ms:25,max_ms:40});
 assert.equal(statistics([37.348,30.275]).mean_ms,33.8115);
 assert.equal(statistics([37.348,30.275]).median_ms,33.8115);
});
