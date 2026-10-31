// Isolated Linux fixture harness. No regular application startup or institutional data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,appendFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createOe2FixtureService} from '../../src/oe2/service.js';
import {createOe2HttpServer} from '../../src/oe2/server.js';
import {CATEGORIES,prepareDemoCandidate,ProjectionError,type DemoApproval} from '../../src/oe2/pipeline/projection.js';
import {assertDemoTarget,currentDemoRelease,publishDemoCandidate,demoReadSql,getDemoProgramming} from '../../src/oe2/pipeline/publication.js';
import {createApiServer} from '../../../api/src/http/api-server.js';
import {getAnnouncements} from '../../../api/src/application/announcements.js';
import type {IntentRouter} from '../../../api/src/routing/intent-router-types.js';

const env=process.env;assert.equal(env.PGHOST,'127.0.0.1');assert.equal(env.PGDATABASE,'postgres');
const token=env.OE2_PIPELINE_TOKEN!;assert.ok(token?.length>=32);
const writer=new Pool({host:'127.0.0.1',port:5432,database:'postgres',user:'banuchat_oe2_pipeline_writer',password:env.OE2_PIPELINE_WRITER_PASSWORD,max:4});
const reader=new Pool({host:'127.0.0.1',port:5432,database:'postgres',user:'banuchat_oe2_pipeline_reader',password:env.OE2_PIPELINE_READER_PASSWORD,options:'-c default_transaction_read_only=on',max:4});
for(const pool of [writer,reader])pool.on('error',()=>{});
await assertDemoTarget(writer,true);await assertDemoTarget(reader);await mkdir('/tmp/oe2-pipeline-state',{recursive:true});
const acquisitions=createOe2FixtureService('/inputs/fixtures','/tmp/oe2-pipeline-state');
const acquisitionServer=createOe2HttpServer(acquisitions,token);
const events:Record<string,unknown>[]=[];
async function capture(){
 const buffers=await Promise.all(CATEGORIES.map(c=>readFile('/tmp/oe2-pipeline-state/'+c+'.json')));
 return prepareDemoCandidate({academic_offer:buffers[0]!,calls:buffers[1]!,news:buffers[2]!});
}
async function event(record:Record<string,unknown>){const entry={at:new Date().toISOString(),...record};events.push(entry);await appendFile('/outputs/publications.jsonl',JSON.stringify(entry)+'\n');}
const sql=demoReadSql(reader);
const router:IntentRouter={catalog_valid:true,catalog_version:'isolated-oe2-query-only',route:()=>({route:'capabilities_help',parameters:{},response_variant:null})};
const existing=createApiServer({sql,router,document_rag:async()=>{throw new Error('not_in_scope');}});
const rest=createServer((req,res)=>{if(req.method==='GET'&&new URL(req.url!,'http://local').pathname==='/api/v1/announcements')existing.emit('request',req,res);else{res.writeHead(404);res.end();}});
const control=createServer((req,res)=>void(async()=>{
 const send=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 if(req.headers.authorization!=='Bearer '+token){send(401,{error_code:'UNAUTHORIZED'});return;}
 if(req.method==='GET'&&req.url==='/internal/oe2-pipeline/inspect'){
  const current=await currentDemoRelease(reader);
  const releases=(await reader.query('SELECT id,status,content_sha256,approval_ref,published_at FROM public.oe2_pipeline_releases ORDER BY published_at')).rows;
  let candidate_sha256:string|null=null;try{candidate_sha256=(await capture()).content_sha256;}catch{}
  send(200,{current,releases,candidate_sha256,programming:await getDemoProgramming(reader),announcements:current?await getAnnouncements(sql,{temporal_status:'all',reference_time:'2026-10-06T12:00:00Z'}):null,events});return;
 }
 if(req.method!=='POST'||req.url!=='/internal/oe2-pipeline/publish'){send(404,{});return;}
 let raw='';for await(const part of req){raw+=String(part);if(raw.length>100)throw new Error('body_limit');}if(raw!=='{}'){send(400,{error_code:'INVALID_REQUEST'});return;}
 const operation_id=String(req.headers['x-banuchat-operation-id']??'');
 let candidate;try{candidate=await capture();}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT'){send(200,{outcome:'awaiting_snapshots'});return;}
  const error_code=e instanceof ProjectionError?e.code:'SNAPSHOT_DEPENDENCY_FAILURE';
  await event({operation_id,outcome:'projection_rejected',error_code});send(422,{error_code,retryable:false});return;}
 const approvals=JSON.parse(await readFile('/inputs/approvals.json','utf8')) as {approved_candidates:DemoApproval[]};
 const approval=approvals.approved_candidates.find(a=>a.candidate_sha256===candidate.content_sha256);
 if(!approval){await event({operation_id,outcome:'awaiting_approval',candidate_sha256:candidate.content_sha256});send(200,{outcome:'awaiting_approval',candidate_sha256:candidate.content_sha256});return;}
 const base=await currentDemoRelease(writer);
 try{const publication=await publishDemoCandidate({pool:writer,candidate,approval,expected_base_release_id:base});await event({operation_id,...publication});send(200,publication);}
 catch(error){await event({operation_id,outcome:'rejected',error_code:error instanceof ProjectionError?error.code:'PUBLICATION_REJECTED'});send(409,{error_code:'PUBLICATION_REJECTED',retryable:false});}
})().catch(()=>{res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error_code":"PIPELINE_DEPENDENCY_OR_VALIDATION_FAILURE","retryable":false}');}));
await Promise.all([[acquisitionServer,3031],[rest,3032],[control,3033]].map(([server,port])=>new Promise<void>(resolve=>(server as ReturnType<typeof createServer>).listen(Number(port),'0.0.0.0',resolve))));
console.log(JSON.stringify({event:'fixture_runtime_ready',ports:[3031,3032,3033],scope:'fictional_auxiliary_only'}));
process.once('SIGTERM',()=>{for(const server of [acquisitionServer,rest,control])server.close();void Promise.all([writer.end(),reader.end()]);});
