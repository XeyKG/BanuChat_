/** Explicit one-time preparation of a NEW synthetic-only isolated instance. No CCD access. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {local,corpusTables,fingerprint,evidence,type Environment} from './auth-i1a/environment.js';
import {retrieveDocumentChunks} from '../src/application/document-retrieval.js';
import {retrieveAuthenticatedDocumentChunks} from '../src/application/authenticated-document-retrieval.js';
const root=new URL('../../../',import.meta.url);
const docker=(args:string[],input?:string)=>execFileSync('docker',args,{encoding:'utf8',...(input===undefined?{}:{input}),maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe']});
let source:pg.Pool|undefined,target:pg.Pool|undefined,runtime:pg.Pool|undefined;let stage='preflight';
try{
 const name='banuchat-auth-i1a-test',label='BCH05-CCD-AUTH-I1A';
 assert.equal(docker(['ps','-a','--filter',`name=^/${name}$`,'--format','{{.Names}}']).trim(),'');
 assert.equal(docker(['volume','ls','--filter',`name=^${name}-data$`,'--format','{{.Name}}']).trim(),'');
 assert.equal(docker(['network','ls','--filter',`name=^${name}-isolated$`,'--format','{{.Name}}']).trim(),'');
 const original=JSON.parse(docker(['inspect','banuchat-postgres']))[0];
 assert.equal(original.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');
 assert.equal(original.NetworkSettings.Ports['5432/tcp'][0].HostPort,'5432');
 const vars=Object.fromEntries((original.Config.Env as string[]).map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
 source=new pg.Pool({host:'127.0.0.1',port:5432,database:vars.POSTGRES_DB,user:vars.POSTGRES_USER,password:vars.POSTGRES_PASSWORD,connectionTimeoutMillis:5000});
 const sourceGuard=(await source.query(`SELECT to_regclass('banuchat.ccd_demo_contexts') IS NULL AS no_ccd,
  to_regnamespace('banuchat_auth') IS NULL AS no_auth,(SELECT count(*) FROM banuchat.datasets)=1 AND EXISTS(
   SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
   WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb) AS synthetic`)).rows[0];
 assert.ok(Object.values(sourceGuard).every(v=>v===true));
 const before={corpus:await fingerprint(source),history:await fingerprint(source,['conversations','messages','message_citations'])};
 const dump=docker(['exec','banuchat-postgres','pg_dump','-U',vars.POSTGRES_USER!,'-d',vars.POSTGRES_DB!,'--schema=banuchat','--no-owner','--no-acl',
  ...['conversations','messages','message_citations'].map(t=>'--exclude-table-data=banuchat.'+t)]);
 const e:Environment={name,database:'banuchat_auth_i1a_test',port:55442,network:name+'-isolated',volume:name+'-data',containerId:'',deployment:randomUUID(),
  admin:'auth_i1a_admin',runtime:'auth_i1a_runtime',provisioner:'auth_i1a_provisioner',adminPassword:randomBytes(32).toString('hex'),runtimePassword:randomBytes(32).toString('hex'),provisionPassword:randomBytes(32).toString('hex'),rateKey:randomBytes(32).toString('hex')};
 await mkdir(local,{recursive:true});const config=fileURLToPath(new URL('deployment.json',local));await writeFile(config,JSON.stringify(e));
 const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];execFileSync('icacls',[config,'/inheritance:r','/grant:r',`*${sid}:(F)`],{stdio:'ignore'});
 stage='container';docker(['network','create','--label','banuchat.task='+label,'--opt','com.docker.network.bridge.enable_ip_masquerade=false',e.network]);docker(['volume','create','--label','banuchat.task='+label,e.volume]);
 e.containerId=execFileSync('docker',['run','-d','--pull','never','--name',name,'--label','banuchat.task='+label,'--network',e.network,'-p',`127.0.0.1:${e.port}:5432`,'--mount',`type=volume,src=${e.volume},dst=/var/lib/postgresql/data`,'--env','POSTGRES_USER','--env','POSTGRES_DB','--env','POSTGRES_PASSWORD','pgvector/pgvector:pg16','-c','log_statement=none','-c','log_parameter_max_length_on_error=0'],{env:{...process.env,POSTGRES_USER:e.admin,POSTGRES_DB:e.database,POSTGRES_PASSWORD:e.adminPassword},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 await writeFile(config,JSON.stringify(e));
 for(let i=0;i<30;i++){try{docker(['exec',name,'pg_isready','-U',e.admin,'-d',e.database]);break;}catch{if(i===29)throw Error('READINESS');await new Promise(r=>setTimeout(r,500));}}
 target=new pg.Pool({host:'127.0.0.1',port:e.port,database:e.database,user:e.admin,password:e.adminPassword});
 stage='identity';const instance=JSON.parse(docker(['inspect',e.containerId]))[0];assert.equal(instance.Name,'/'+name);assert.equal(instance.Config.Labels['banuchat.task'],label);assert.equal(instance.Mounts[0].Name,e.volume);assert.ok(instance.NetworkSettings.Networks[e.network]);
 assert.equal((await target.query('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port')).rows[0].db,e.database);
 stage='restore';docker(['exec','-i',name,'psql','-X','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-U',e.admin,'-d',e.database],'CREATE EXTENSION vector;\n'+dump);
 await target.query('REVOKE ALL ON SCHEMA banuchat FROM PUBLIC; REVOKE ALL ON ALL TABLES IN SCHEMA banuchat FROM PUBLIC; REVOKE ALL ON ALL FUNCTIONS IN SCHEMA banuchat FROM PUBLIC');
 assert.equal(await fingerprint(target),before.corpus);
 for(const [role,password] of [[e.runtime,e.runtimePassword],[e.provisioner,e.provisionPassword]])await target.query(`CREATE ROLE ${pg.escapeIdentifier(role!)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral(password!)}`);
 await target.query('CREATE ROLE auth_i1a_outsider NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
 stage='006-008';const c=await target.connect();try{
  await c.query("SELECT set_config('banuchat_auth.target_database',$1,false),set_config('banuchat_auth.runtime_role',$2,false),set_config('banuchat_auth.deployment_id',$3,false)",[e.database,e.runtime,e.deployment]);
  for(const migration of ['006_synthetic_auth.sql','007_authenticated_resources.sql','008_verified_recovery_email.sql'])await c.query(await readFile(new URL('infra/db/'+migration,root),'utf8'));
 }finally{c.release();}
 for(const row of (await target.query('SELECT datname FROM pg_database')).rows)await target.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(row.datname)} FROM PUBLIC`);
 await target.query(`GRANT CONNECT ON DATABASE ${e.database} TO ${e.runtime},${e.provisioner};
  GRANT USAGE ON SCHEMA banuchat,banuchat_auth,public TO ${e.runtime};
  GRANT USAGE ON TYPE banuchat.finite_time,banuchat.sha256_hex,banuchat.stable_key TO ${e.runtime};
  GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.embedding_configs,banuchat.synthetic_profiles,banuchat.profile_courses,banuchat.courses,banuchat.calendar_events,banuchat.announcements,banuchat.documents,banuchat.document_versions,banuchat.conversations,banuchat.messages,banuchat.message_citations TO ${e.runtime};
  GRANT SELECT ON banuchat_auth.accounts,banuchat_auth.password_credentials,banuchat_auth.sessions,banuchat_auth.refresh_tokens,banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,banuchat_auth.auth_rate_limits,banuchat_auth.conversation_owners TO ${e.runtime};
  GRANT UPDATE(updated_at) ON banuchat_auth.accounts TO ${e.runtime};
  GRANT INSERT ON banuchat_auth.sessions,banuchat_auth.refresh_tokens,banuchat_auth.auth_rate_limits,banuchat_auth.security_events,banuchat.conversations,banuchat_auth.conversation_owners TO ${e.runtime};
  GRANT DELETE ON banuchat.conversations TO ${e.runtime};
  GRANT UPDATE(access_token_digest,access_issued_at,access_expires_at,last_seen_at,revoked_at) ON banuchat_auth.sessions TO ${e.runtime};
  GRANT UPDATE(consumed_at,replaced_by) ON banuchat_auth.refresh_tokens TO ${e.runtime};
  GRANT UPDATE(attempts) ON banuchat_auth.auth_rate_limits TO ${e.runtime};
  GRANT EXECUTE ON FUNCTION banuchat.current_retrieval_context(),banuchat.search_chunks_cosine(public.vector,integer,uuid) TO ${e.runtime};
  GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO ${e.provisioner};
  GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.synthetic_profiles TO ${e.provisioner};
  GRANT INSERT ON banuchat_auth.accounts,banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,banuchat_auth.security_events TO ${e.provisioner};
  GRANT USAGE ON SCHEMA banuchat_auth,public TO auth_i1a_outsider`);
 runtime=new pg.Pool({host:'127.0.0.1',port:e.port,database:e.database,user:e.runtime,password:e.runtimePassword});
 const release=(await target.query('SELECT current_release_id FROM banuchat.datasets')).rows[0].current_release_id as string;
 const vector=[1,...Array<number>(1023).fill(0)];stage='reproduce-before';let beforeCode='';
 try{await retrieveDocumentChunks(runtime,{release_id:release,query_embedding:vector,top_k:5});}catch(error){beforeCode=(error as {code?:string}).code??'OTHER';}assert.equal(beforeCode,'42501');
 const scopeBefore=(await target.query('SELECT * FROM banuchat_auth.runtime_scope')).rows;
 stage='010';const m=await target.connect();try{await m.query("SELECT set_config('banuchat_auth.target_database',$1,false),set_config('banuchat_auth.runtime_role',$2,false),set_config('banuchat_auth.deployment_id',$3,false)",[e.database,e.runtime,e.deployment]);await m.query(await readFile(new URL('infra/db/010_authenticated_document_reads.sql',root),'utf8'));}finally{m.release();}
 stage='read-after';const rows=await retrieveAuthenticatedDocumentChunks(runtime,{release_id:release,query_embedding:vector,top_k:5});assert.equal(rows.length,5);
 assert.deepEqual((await target.query('SELECT * FROM banuchat_auth.runtime_scope')).rows,scopeBefore);
 const after={corpus:await fingerprint(source),history:await fingerprint(source,['conversations','messages','message_citations'])};assert.deepEqual(after,before);assert.equal(await fingerprint(target),before.corpus);
 await evidence('setup',{checkpoint:'BCH-05/CCD-AUTH-I1A',at:new Date().toISOString(),database:e.database,port:e.port,container:e.name,container_id:e.containerId,network:e.network,volume:e.volume,deployment:e.deployment,migrations:['006','007','008','010'],business_schema:'read-only snapshot of installed 001 + published synthetic corpus; no source history',before_sqlstate:beforeCode,after_rows:rows.length,scope_unchanged:true,source_before:before,source_after:after,copy_corpus_sha256:await fingerprint(target),migration_sha256:createHash('sha256').update(await readFile(new URL('infra/db/010_authenticated_document_reads.sql',root))).digest('hex'),corpus_tables:corpusTables});
 console.log('I1A isolated preparation complete: prior 42501 reproduced, new read succeeds, source and corpus unchanged.');
}catch(error){await mkdir(local,{recursive:true});await writeFile(new URL('setup-failure-'+Date.now()+'.json',local),JSON.stringify({stage,code:(error as {code?:string}).code??'ASSERTION',sqlstate:String((error as {stderr?:unknown}).stderr??'').match(/ERROR:\s+([0-9A-Z]{5})/u)?.[1]??null}));console.error('I1A setup stopped; inspect only the new destination. No automatic rerun.');process.exitCode=1;}
finally{await Promise.all([source,target,runtime].map(p=>p?.end()));}
