import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {root,local,pool,fingerprint,evidence,storage,type Environment} from './auth-i1b/environment.js';
import {getDocumentArtifact} from '../src/application/document-artifact.js';
const docker=(args:string[],input?:string)=>execFileSync('docker',args,{encoding:'utf8',...(input===undefined?{}:{input}),maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe']});
let stage='preflight';
const resumeCcd=process.argv[2]==='--resume-ccd';
try{
 for(const kind of ['ccd','uid'] as const){
 const ccd=kind==='ccd',name=ccd?'banuchat-ccd-auth-i1b-test':'banuchat-auth-i1b-uid-test',sourceName=ccd?'banuchat-ccd-dev-postgres-ccd-1':'banuchat-postgres';
 if(!(ccd&&resumeCcd)){
 assert.equal(docker(['ps','-a','--filter',`name=^/${name}$`,'--format','{{.Names}}']).trim(),'');
 assert.equal(docker(['volume','ls','--filter',`name=^${name}-data$`,'--format','{{.Name}}']).trim(),'');
 assert.equal(docker(['network','ls','--filter',`name=^${name}-isolated$`,'--format','{{.Name}}']).trim(),'');
 }
 const origin=JSON.parse(docker(['inspect',sourceName]))[0];const binding=origin.NetworkSettings.Ports['5432/tcp'][0];assert.equal(binding.HostIp,'127.0.0.1');assert.equal(binding.HostPort,ccd?'55433':'5432');
 const vars=Object.fromEntries((origin.Config.Env as string[]).map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
 const source=new pg.Pool({host:'127.0.0.1',port:ccd?55433:5432,database:vars.POSTGRES_DB,user:vars.POSTGRES_USER,password:vars.POSTGRES_PASSWORD,connectionTimeoutMillis:5000});let target:pg.Pool|undefined;
 try{
  stage=kind+'-snapshot';assert.equal((await source.query('SELECT current_database() AS db')).rows[0].db,ccd?'banuchat_ccd_dev':vars.POSTGRES_DB);
  const before={corpus:await fingerprint(source,ccd),history:await fingerprint(source,ccd,true)};
  if(ccd){const r=(await source.query("SELECT count(*)::int AS n FROM banuchat.dataset_releases WHERE status='ready' AND manifest->'synthetic'='false'::jsonb")).rows[0];assert.equal(r.n,3);assert.equal((await source.query('SELECT current_release_id FROM banuchat.datasets')).rows[0].current_release_id,'3d6cedac-0e86-40c8-909b-d3ff6e8ab741');
   const baseline=JSON.parse(await readFile(new URL('eval/integration/results/bch05-ccd-auth-r0-ccd-inventory.json',root),'utf8'));
   for(const old of baseline.releases){const actual=(await source.query('SELECT manifest_sha256,pipeline_sha256 FROM banuchat.dataset_releases WHERE id=$1',[old.id])).rows[0];assert.equal(actual.manifest_sha256,old.manifest_sha256);assert.equal(actual.pipeline_sha256,old.pipeline_sha256);}
   const versions=(await source.query('SELECT id,source_sha256 FROM banuchat.document_versions')).rows;assert.equal(versions.length,24);assert.equal((await source.query('SELECT count(*)::int AS n FROM banuchat.document_chunks WHERE embedding IS NOT NULL')).rows[0].n,24);
   for(const v of versions){const bytes=(await getDocumentArtifact(source,{document_version_id:v.id},storage)).bytes;assert.equal(createHash('sha256').update(bytes).digest('hex'),v.source_sha256);}
  }
  const dump=ccd&&resumeCcd?'':docker(['exec',sourceName,'pg_dump','-U',vars.POSTGRES_USER!,'-d',vars.POSTGRES_DB!,'--schema=banuchat','--no-owner','--no-acl',...['conversations','messages','message_citations'].map(t=>'--exclude-table-data=banuchat.'+t)]);
  const prefix=ccd?'auth_i1b':'auth_i1b_uid';let e:Environment={name,database:ccd?'banuchat_ccd_auth_i1b_test':'banuchat_auth_i1b_uid_test',port:ccd?55443:55444,network:name+'-isolated',volume:name+'-data',containerId:'',deployment:randomUUID(),admin:prefix+'_admin',runtime:prefix+'_runtime',provisioner:prefix+'_provisioner',adminPassword:randomBytes(32).toString('hex'),runtimePassword:randomBytes(32).toString('hex'),provisionPassword:randomBytes(32).toString('hex'),rateKey:randomBytes(32).toString('hex'),mode:ccd?'ccd_local':'synthetic'};
  if(ccd&&resumeCcd){e=JSON.parse(await readFile(new URL('ccd-deployment.json',local),'utf8')) as Environment;assert.equal(e.name,name);assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);}
  if(!(ccd&&resumeCcd)){
  await mkdir(local,{recursive:true});const config=fileURLToPath(new URL(kind+'-deployment.json',local));await writeFile(config,JSON.stringify(e));const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];execFileSync('icacls',[config,'/inheritance:r','/grant:r',`*${sid}:(F)`],{stdio:'ignore'});
  stage=kind+'-container';docker(['network','create','--label','banuchat.task=BCH05-CCD-AUTH-I1B','--opt','com.docker.network.bridge.enable_ip_masquerade=false',e.network]);docker(['volume','create','--label','banuchat.task=BCH05-CCD-AUTH-I1B',e.volume]);
  e.containerId=execFileSync('docker',['run','-d','--pull','never','--name',name,'--label','banuchat.task=BCH05-CCD-AUTH-I1B','--network',e.network,'-p',`127.0.0.1:${e.port}:5432`,'--mount',`type=volume,src=${e.volume},dst=/var/lib/postgresql/data`,'--env','POSTGRES_USER','--env','POSTGRES_DB','--env','POSTGRES_PASSWORD','pgvector/pgvector:pg16','-c','log_statement=none','-c','log_parameter_max_length_on_error=0'],{env:{...process.env,POSTGRES_USER:e.admin,POSTGRES_DB:e.database,POSTGRES_PASSWORD:e.adminPassword},encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();await writeFile(config,JSON.stringify(e));
  }
  for(let i=0;i<30;i++){try{docker(['exec',name,'pg_isready','-U',e.admin,'-d',e.database]);break;}catch{if(i===29)throw Error('READINESS');await new Promise(r=>setTimeout(r,500));}}
  const actual=JSON.parse(docker(['inspect',e.containerId]))[0];assert.equal(actual.Config.Labels['banuchat.task'],'BCH05-CCD-AUTH-I1B');assert.equal(actual.Mounts[0].Name,e.volume);assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostPort,String(e.port));assert.ok(actual.NetworkSettings.Networks[e.network]);
  target=pool(e);assert.equal((await target.query('SELECT current_database() AS db,current_user AS role')).rows[0].role,e.admin);
  if(!(ccd&&resumeCcd)){
  stage=kind+'-restore';docker(['exec','-i',name,'psql','-X','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-U',e.admin,'-d',e.database],'CREATE EXTENSION vector;\n'+dump);
  await target.query('REVOKE ALL ON SCHEMA banuchat FROM PUBLIC; REVOKE ALL ON ALL TABLES IN SCHEMA banuchat FROM PUBLIC; REVOKE ALL ON ALL FUNCTIONS IN SCHEMA banuchat FROM PUBLIC');assert.equal(await fingerprint(target,ccd),before.corpus);
  for(const [role,password] of [[e.runtime,e.runtimePassword],[e.provisioner,e.provisionPassword]])await target.query(`CREATE ROLE ${pg.escapeIdentifier(role!)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral(password!)}`);
  }else{assert.equal(await fingerprint(target,true),before.corpus);assert.equal((await target.query("SELECT to_regnamespace('banuchat_auth') IS NULL AS clean")).rows[0].clean,true);assert.equal((await target.query('SELECT count(*)::int AS n FROM banuchat.conversations')).rows[0].n,0);}
  const c=await target.connect();try{
   await c.query("SELECT set_config('banuchat_auth.target_database',$1,false),set_config('banuchat_auth.runtime_role',$2,false),set_config('banuchat_auth.deployment_id',$3,false)",[e.database,e.runtime,e.deployment]);
   stage=kind+'-migrations';for(const migration of ccd?['011_ccd_authenticated_bootstrap.sql']:['006_synthetic_auth.sql','007_authenticated_resources.sql','008_verified_recovery_email.sql'])await c.query(await readFile(new URL('infra/db/'+migration,root),'utf8'));
   if(!ccd){
    // A pre-009 legacy account and its historical principal are kept, never renamed.
    const principal=randomUUID(),p=(await c.query('SELECT profile_key,dataset_release_id FROM banuchat.synthetic_profiles p JOIN banuchat.datasets d ON d.current_release_id=p.dataset_release_id ORDER BY profile_key LIMIT 1')).rows[0];
    await c.query("INSERT INTO banuchat_auth.accounts(id,synthetic_uid,recovery_email,synthetic_display_name) VALUES($1,'BCH-DEMO-9401','legacy-i1b@banuchat.test','Legado Ficticio I1B')",[principal]);
    await c.query('INSERT INTO banuchat_auth.profile_bindings(principal_id,dataset_id,profile_key) VALUES($1,1,$2)',[principal,p.profile_key]);await c.query('INSERT INTO banuchat_auth.profile_binding_versions(principal_id,dataset_id,dataset_release_id,profile_key) VALUES($1,1,$2,$3)',[principal,p.dataset_release_id,p.profile_key]);await c.query('INSERT INTO banuchat_auth.corpus_grants(principal_id,dataset_id) VALUES($1,1)',[principal]);
    await c.query(await readFile(new URL('infra/db/009_demo_uid_convention.sql',root),'utf8'));await c.query(await readFile(new URL('infra/db/010_authenticated_document_reads.sql',root),'utf8'));
    assert.equal((await c.query("SELECT id FROM banuchat_auth.accounts WHERE synthetic_uid='BCH-DEMO-9401'")).rows[0].id,principal);
   }
  }finally{c.release();}
  stage=kind+'-acl';for(const row of (await target.query('SELECT datname FROM pg_database')).rows)await target.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(row.datname)} FROM PUBLIC`);
  const template=await readFile(new URL('backend/api/test/auth-i1a-setup.mts',root),'utf8');const grants=template.match(/await target.query\(`(GRANT CONNECT ON DATABASE[\s\S]+?)`\);/u)![1]!;
  // This reviewed block is shared with I1A; identifiers only, never SQL from a client.
  const substituted=grants.replaceAll('${e.database}',e.database).replaceAll('${e.runtime}',e.runtime).replaceAll('${e.provisioner}',e.provisioner);
  await target.query('CREATE ROLE auth_i1a_outsider NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');await target.query(substituted);
  if(ccd)await target.query(`GRANT SELECT ON banuchat.ccd_demo_contexts TO ${e.runtime},${e.provisioner}; GRANT SELECT ON banuchat_auth.runtime_scope TO ${e.provisioner}`);
  const after={corpus:await fingerprint(source,ccd),history:await fingerprint(source,ccd,true)};assert.deepEqual(after,before);assert.equal(await fingerprint(target,ccd),before.corpus);
  const counts=(await target.query(`SELECT r.id,d.current_release_id=r.id AS current,(SELECT count(*)::int FROM banuchat.document_versions v WHERE v.dataset_release_id=r.id) AS documents,(SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id) AS chunks,(SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id AND c.embedding IS NOT NULL) AS embeddings FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id ORDER BY r.id`)).rows;
  await evidence(kind+'-setup',{checkpoint:'BCH-05/CCD-AUTH-I1B',at:new Date().toISOString(),database:e.database,port:e.port,container:e.name,container_id:e.containerId,network:e.network,volume:e.volume,deployment:e.deployment,migrations:ccd?['011']:['006','007','008','009','010'],source_before:before,source_after:after,copy_corpus_sha256:await fingerprint(target,ccd),counts,histories_copied:0,ingestion:false,migration_sha256:createHash('sha256').update(await readFile(new URL('infra/db/'+(ccd?'011_ccd_authenticated_bootstrap.sql':'009_demo_uid_convention.sql'),root))).digest('hex')});
  console.log(JSON.stringify({prepared:kind,database:e.database,port:e.port,source_unchanged:true}));
 }finally{await source.end();await target?.end();}
 }
}catch(error){await mkdir(local,{recursive:true});await writeFile(new URL('setup-failure-'+Date.now()+'.json',local),JSON.stringify({stage,code:(error as {code?:string}).code??'ASSERTION',sqlstate:String((error as {stderr?:unknown}).stderr??'').match(/ERROR:\s+([0-9A-Z]{5})/u)?.[1]??null}));console.error('I1B setup stopped. No automatic rerun or writes to original sources.');process.exitCode=1;}
