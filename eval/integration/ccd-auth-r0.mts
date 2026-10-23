/** BCH-05/R0 diagnostic only. Restores a disposable snapshot; never applies migrations.
 * Run from backend/api: node --import tsx ../../eval/integration/ccd-auth-r0.mts
 * Requires the retained AUTH-P4-L1 local environment and Docker. No automatic retry/cleanup.
 * Full responses remain ignored under data/ccd/evidence/auth-r0.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createAuthenticatedRuntimeServer} from '../../backend/api/src/authenticated-runtime.js';
import {SyntheticAccountProvisioner} from '../../backend/api/src/auth/provision-account.js';
import {LocalPasswordAdministrator} from '../../backend/api/src/auth/local-password-administrator.js';
import {generateDocumentRagAnswer} from '../../backend/api/src/chat/document-rag.js';
import {loadDefaultIntentRouter} from '../../backend/api/src/routing/intent-router.js';
import {loadGeneratorRuntimeConfig} from '../../backend/api/src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../../backend/api/src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../../backend/api/src/retrieval/ollama-query-embedding-client.js';
const require=createRequire(new URL('../../backend/api/package.json',import.meta.url));
const {Pool}=require('pg') as typeof import('pg');
const docker=(args:string[],input?:string)=>execFileSync('docker',args,{...(input===undefined?{}:{input}),encoding:'utf8',maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe']});
const root=new URL('../../',import.meta.url),local=new URL('infra/local/ccd-auth-r0/',root);
const evidence=new URL('data/ccd/evidence/auth-r0/',root);
const name='banuchat-auth-r0-replay',database='banuchat_auth_r0_replay',port=55441;
const label='banuchat.task=BCH05-CCD-AUTH-R0';
const resume=process.argv[2]==='--resume-prepared';
assert.ok(process.argv.length===2||(process.argv.length===3&&resume));
const corpusTables=['datasets','dataset_releases','embedding_configs','documents','document_versions','document_chunks','synthetic_profiles','profile_courses','courses','calendar_events','announcements','ingestion_runs','ingestion_items'];
async function fingerprint(pool:import('pg').Pool,tables:string[],schema='banuchat'){
 const hash=createHash('sha256');for(const t of tables){const r=await pool.query(`SELECT to_jsonb(t)::text AS row FROM ${schema}.${t} t ORDER BY to_jsonb(t)::text`);hash.update(t+JSON.stringify(r.rows));}return hash.digest('hex');
}
let source:import('pg').Pool|undefined,target:import('pg').Pool|undefined,runtime:import('pg').Pool|undefined,provision:import('pg').Pool|undefined;
let server:Awaited<ReturnType<typeof createAuthenticatedRuntimeServer>>|undefined;
const report:Record<string,unknown>={checkpoint:'BCH-05/CCD-AUTH-R0',started_at:new Date().toISOString(),migrations_applied:false,ccd_ingestion:false};
let stage='preflight';
try{
 // Existing private technical config is read, never echoed or copied into evidence.
 const c=JSON.parse(await readFile(new URL('infra/local/auth-p4l1/deployment.json',root),'utf8'));
 assert.equal(c.name,'banuchat-auth-p4l1-demo');assert.equal(c.database,'banuchat_auth_p4l1_demo');assert.equal(c.port,55440);
 const original=JSON.parse(docker(['inspect',c.name]))[0];assert.equal(original.Id,c.containerId);
 assert.equal(original.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');
 assert.equal(original.NetworkSettings.Ports['5432/tcp'][0].HostPort,'55440');
 if(!resume){assert.equal(docker(['ps','-a','--filter',`name=^/${name}$`,'--format','{{.Names}}']).trim(),'');
 assert.equal(docker(['volume','ls','--filter',`name=^${name}-data$`,'--format','{{.Name}}']).trim(),'');
 assert.equal(docker(['network','ls','--filter',`name=^${name}-isolated$`,'--format','{{.Name}}']).trim(),'');}
 const connection={host:'127.0.0.1',port:c.port,database:c.database,user:c.migrator,password:c.migratorPassword,connectionTimeoutMillis:5000};
 source=new Pool(connection);stage='source_fingerprint';
 const authTables=(await source.query("SELECT tablename FROM pg_tables WHERE schemaname='banuchat_auth' ORDER BY tablename")).rows.map(r=>String(r.tablename));
 const before={corpus:await fingerprint(source,corpusTables),history:await fingerprint(source,['conversations','messages','message_citations']),auth:await fingerprint(source,authTables,'banuchat_auth')};
 let config:any,id:string;
 if(!resume){
 stage='snapshot';const dump=docker(['exec',c.name,'pg_dump','-U',c.migrator,'-d',c.database,'--schema=banuchat','--schema=banuchat_auth','--no-owner',
  '--exclude-table-data=banuchat_auth.*',...['conversations','messages','message_citations'].map(t=>'--exclude-table-data=banuchat.'+t)]);
 config={name,database,port,network:name+'-isolated',volume:name+'-data',migrator:c.migrator,runtime:c.runtime,provisioner:c.provisioner,
  migratorPassword:randomBytes(32).toString('hex'),runtimePassword:randomBytes(32).toString('hex'),provisionPassword:randomBytes(32).toString('hex'),deployment:randomUUID(),rateKey:randomBytes(32).toString('hex')};
 await mkdir(local,{recursive:true});await mkdir(evidence,{recursive:true});
 const configPath=fileURLToPath(new URL('deployment.json',local));await writeFile(configPath,JSON.stringify(config));
 const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];
 execFileSync('icacls',[configPath,'/inheritance:r','/grant:r',`*${sid}:(F)`],{stdio:'ignore'});
 docker(['network','create','--label',label,'--opt','com.docker.network.bridge.enable_ip_masquerade=false',config.network]);
 docker(['volume','create','--label',label,config.volume]);
 id=execFileSync('docker',['run','-d','--pull','never','--name',name,'--label',label,'--network',config.network,'-p',`127.0.0.1:${port}:5432`,
  '--mount',`type=volume,src=${config.volume},dst=/var/lib/postgresql/data`,'--env','POSTGRES_USER','--env','POSTGRES_DB','--env','POSTGRES_PASSWORD',
  'pgvector/pgvector:pg16','-c','log_statement=none','-c','log_parameter_max_length_on_error=0'],{
  env:{...process.env,POSTGRES_USER:config.migrator,POSTGRES_DB:database,POSTGRES_PASSWORD:config.migratorPassword},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 await writeFile(new URL('resources.json',local),JSON.stringify({id,name,label,network:config.network,volume:config.volume}));
 // Readiness observation only, never a retry of a write/test/POST.
 for(let attempt=0;attempt<30;attempt++){
  try{docker(['exec',name,'pg_isready','-U',config.migrator,'-d',database]);break;}catch{if(attempt===29)throw Error('READINESS');await new Promise(r=>setTimeout(r,500));}
 }
 target=new Pool({...connection,port,database,password:config.migratorPassword});stage='roles';
 for(const role of [config.runtime,config.provisioner]){
  const password=role===config.runtime?config.runtimePassword:config.provisionPassword;
  // Names are taken only from the checked retained test deployment.
  assert.match(role,/^auth_p4l1_(?:runtime|provisioner)$/u);
  await target.query(`CREATE ROLE ${require('pg').escapeIdentifier(role)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${require('pg').escapeLiteral(password)}`);
 }
 await target.query('CREATE ROLE banuchat_auth_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
 stage='restore';docker(['exec','-i',name,'psql','-X','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-U',config.migrator,'-d',database],'CREATE EXTENSION vector;\n'+dump);
 // Restore SECURITY DEFINER ownership omitted by --no-owner, not their bodies.
 stage='restore_acl';await target.query(`GRANT CREATE ON SCHEMA banuchat_auth TO banuchat_auth_executor;
  ALTER FUNCTION banuchat_auth.resource_context(text,uuid,boolean,boolean) OWNER TO banuchat_auth_executor;
  ALTER FUNCTION banuchat_auth.persist_turn(text,uuid,uuid,integer,text,text,boolean,jsonb) OWNER TO banuchat_auth_executor;
  REVOKE CREATE ON SCHEMA banuchat_auth FROM banuchat_auth_executor`);
 await target.query('INSERT INTO banuchat_auth.runtime_scope VALUES(true,$1,$2)',[config.deployment,database]);
 for(const r of (await target.query('SELECT datname FROM pg_database')).rows)await target.query(`REVOKE ALL ON DATABASE ${require('pg').escapeIdentifier(r.datname)} FROM PUBLIC`);
 await target.query(`GRANT CONNECT ON DATABASE ${database} TO ${config.runtime},${config.provisioner}`);
 }else{
  config=JSON.parse(await readFile(new URL('deployment.json',local),'utf8'));
  assert.equal(config.database,database);assert.equal(config.port,port);assert.equal(config.name,name);
  const resource=JSON.parse(await readFile(new URL('resources.json',local),'utf8'));id=resource.id;
  const actual=JSON.parse(docker(['inspect',name]))[0];assert.equal(actual.Id,id);assert.equal(actual.Config.Labels['banuchat.task'],'BCH05-CCD-AUTH-R0');
  target=new Pool({...connection,port,database,password:config.migratorPassword});
  assert.equal((await target.query('SELECT count(*)::int AS n FROM banuchat_auth.sessions')).rows[0].n,0);
  assert.equal((await target.query('SELECT count(*)::int AS n FROM banuchat_auth.accounts')).rows[0].n,2);
 }
 assert.equal(await fingerprint(target,corpusTables),before.corpus);
 assert.equal((await target.query('SELECT count(*)::int AS n FROM banuchat.conversations')).rows[0].n,0);
 runtime=new Pool({...connection,port,database,user:config.runtime,password:config.runtimePassword});
 provision=new Pool({...connection,port,database,user:config.provisioner,password:config.provisionPassword});
 const profile=(await target.query('SELECT profile_key FROM banuchat.synthetic_profiles p JOIN banuchat.datasets d ON p.dataset_release_id=d.current_release_id ORDER BY profile_key LIMIT 1')).rows[0].profile_key;
 stage='administrator';const administrator=await LocalPasswordAdministrator.create({pool:runtime,database,deployment:config.deployment});
 const accounts=[{uid:'BCH-DEMO-9201',name:'Alba Ficticia R0',password:randomBytes(30).toString('base64url')},{uid:'BCH-DEMO-9202',name:'Bruno Ficticio R0',password:randomBytes(30).toString('base64url')}];
 stage='provision';for(const a of accounts){if(!resume)await new SyntheticAccountProvisioner(provision,database).provision({synthetic_uid:a.uid,synthetic_display_name:a.name,profile_key:profile,recovery_email:a.uid.toLowerCase()+'@banuchat.test'},randomUUID());await administrator.establish(a.uid,a.password,resume);}
 const baselinePath=new URL('data/ccd/evidence/increment-5/http-1792693227245.json',root),baselineBytes=await readFile(baselinePath);
 const baseline=JSON.parse(baselineBytes.toString());
 // Pin the already evaluated generator recipe; clients verify actual runtime/model on calls.
 const router=await loadDefaultIntentRouter(),generation=loadGeneratorRuntimeConfig({BANUCHAT_GENERATOR_MODEL:baseline.generator.model,
  BANUCHAT_GENERATOR_MODEL_REVISION:baseline.generator.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:baseline.generator.runtime_version});
 const generator=new OllamaGeneratorClient(generation.base_url),embedder=new OllamaQueryEmbeddingClient(generation.base_url);
 let trace:{route?:string;rag_calls:number;embedding_calls:number;generator_calls:number;selected_locators:string[]}={rag_calls:0,embedding_calls:0,generator_calls:0,selected_locators:[]};
 const observedRouter={...router,route:(input:Parameters<typeof router.route>[0])=>{const decision=router.route(input);trace.route=decision.route;return decision;}};
 stage='http';server=await createAuthenticatedRuntimeServer({pool:runtime,expectedDatabase:database,deploymentId:config.deployment,rateKey:Buffer.from(config.rateKey,'hex'),router:observedRouter,
  document_rag:input=>{trace.rag_calls++;return generateDocumentRagAnswer({sql:runtime!,evidence_mode:'synthetic',generator_config:generation.generator,
   generator_client:{generate:(prompt,config)=>{trace.generator_calls++;trace.selected_locators=[...prompt.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]!);return generator.generate(prompt,config);}},
   query_embedding_client:{embedQuery:(text,config)=>{trace.embedding_calls++;return embedder.embedQuery(text,config);}}},input);},
  artifacts:{root:fileURLToPath(new URL('data/synthetic/',root))}});
 await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});
 const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/v2`;
 async function request(path:string,token?:string,body?:unknown,method=body===undefined?'GET':'POST'){
  const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
  return {status:r.status,body:r.status===204?null:await r.json() as any};
 }
 const tokens:string[]=[];for(const a of accounts){const r=await request('/auth/login',undefined,{synthetic_uid:a.uid,password:a.password});assert.equal(r.status,200);tokens.push(r.body.access_token);a.password='';}
 const current=await request('/auth/me',tokens[0]);assert.equal(current.status,200);report.current_release=current.body.release_id;
 report.baseline={path:'data/ccd/evidence/increment-5/http-1792693227245.json',sha256:createHash('sha256').update(baselineBytes).digest('hex'),started_at:baseline.started_at,release_id:baseline.release_id};
 const selected=['REG','AMB','AMB_FRESH','T02','T07','T11'];const turns:any[]=[];report.turns=turns;
 let firstChat='';
 for(const scenario of selected){
  const creation=await request('/conversations',tokens[0],{});assert.equal(creation.status,201);const chat=creation.body.conversation_id as string;if(!firstChat)firstChat=chat;
  const completed=new Set<number>();let historyReliable=true;
  for(const prior of baseline.turns.filter((t:any)=>t.scenario===scenario)){
   const dependencies:number[]=scenario==='REG'&&prior.turn>=5?[]:scenario==='REG'&&prior.turn===4?[1]:prior.turn===1?[]:[prior.turn-1];
   if(!historyReliable||dependencies.some(turn=>!completed.has(turn))){turns.push({scenario,turn:prior.turn,question:prior.question,state:'not_evaluable',reason:'required antecedent failed or history unavailable; no automatic resend'});continue;}
   trace={rag_calls:0,embedding_calls:0,generator_calls:0,selected_locators:[]};
   const started=performance.now(),result=await request(`/conversations/${chat}/messages`,tokens[0],{content:prior.question});
   const observed=await request(`/conversations/${chat}`,tokens[0]);
   const persisted=result.status===201&&observed.status===200&&[result.body.user_message,result.body.assistant_message].every(m=>observed.body.messages.some((p:any)=>JSON.stringify(p)===JSON.stringify(m)));
   if(persisted)completed.add(prior.turn);historyReliable=observed.status===200;
   turns.push({scenario,turn:prior.turn,question:prior.question,state:persisted?'completed':'failed',elapsed_ms:performance.now()-started,...trace,result,persisted,
    ccd_baseline:{status:prior.result.status,response:prior.result.body.assistant_message,embedding_calls:prior.embedding_calls,generator_calls:prior.generator_calls,selected_locators:prior.selected_locators??[]}});
   console.log(JSON.stringify({scenario,turn:prior.turn,status:result.status,route:trace.route,rag_calls:trace.rag_calls,persisted}));
  }
 }
 const foreign=await request(`/conversations/${firstChat}`,tokens[1]),anonymous=await request(`/conversations/${firstChat}`);
 const foreignPost=await request(`/conversations/${firstChat}/messages`,tokens[1],{content:'¿Y qué temas tiene?'});
 assert.equal(foreign.status,404);assert.equal(foreignPost.status,404);assert.equal(anonymous.status,401);
 const citations=(await target.query('SELECT source_kind,source_locator,source_sha256,dataset_release_id,document_version_id,chunk_id FROM banuchat.message_citations ORDER BY message_id,citation_index')).rows;
 const after={corpus:await fingerprint(source,corpusTables),history:await fingerprint(source,['conversations','messages','message_citations']),auth:await fingerprint(source,authTables,'banuchat_auth')};
 assert.deepEqual(after,before);assert.equal(await fingerprint(target,corpusTables),before.corpus);
 report.environment={database,port,container:name,container_id:id,source:'AUTH-P4-L1; read-only snapshot',deployment:config.deployment,generator:generation.generator};
 report.ownership={same_synthetic_profile:true,foreign_get:foreign.status,foreign_post:foreignPost.status,anonymous_get:anonymous.status};
 report.integrity={source_before:before,source_after:after,copy_corpus:await fingerprint(target,corpusTables)};report.citations=citations;
 report.completed=turns.filter(t=>t.state==='completed').length;report.planned=turns.length;
 report.finished_at=new Date().toISOString();await writeFile(new URL('comparison.json',evidence),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checkpoint:report.checkpoint,planned:report.planned,completed:report.completed,original_unchanged:true,migrations_applied:false}));
 if(report.completed!==report.planned)process.exitCode=1;
}catch(error){
 // Never print exception messages, bound SQL, credentials, source paths or child_process output.
 await mkdir(evidence,{recursive:true});await writeFile(new URL('failure-'+Date.now()+'.json',evidence),JSON.stringify({checkpoint:report.checkpoint,at:new Date().toISOString(),stage,code:(error as {code?:string}).code??'ASSERTION_OR_DEPENDENCY',sqlstate:String((error as {stderr?:unknown}).stderr??'').match(/ERROR:\s+([0-9A-Z]{5})/u)?.[1]??null,completed:report.completed??null})+'\n');
 console.error('BCH-05/R0 diagnostic stopped; inspect the disposable destination privately. No automatic rerun.');process.exitCode=1;
}finally{
 server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
 await Promise.all([source,target,runtime,provision].map(p=>p?.end()));
 // Retain only this labeled disposable instance for review. No implicit destructive cleanup.
}
