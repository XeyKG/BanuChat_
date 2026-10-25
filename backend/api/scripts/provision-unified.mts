import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
const root=new URL('../../../',import.meta.url),dir=new URL('infra/local/unified/',root);
const name='banuchat-unified-postgres',volume='banuchat-unified-data',database='banuchat_unified',port=55463;
const run=(args:string[],input?:string|Buffer)=>execFileSync('docker',args,{...(input?{input}:{}),encoding:'utf8',stdio:['pipe','pipe','pipe']});
const source=JSON.parse(await readFile(new URL('infra/local/auth-i1b/ccd-deployment.json',root),'utf8'));
await mkdir(dir,{recursive:true});
const exists=run(['ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}']).trim();
if(exists&&!process.argv.includes('--resume'))throw new Error('Unified container exists; use saved configuration, never reprovision implicitly');
if(exists&&await access(new URL('application.json',dir)).then(()=>true,()=>false))throw new Error('Unified application already configured; no resume mutation allowed');
if(exists){const prior=JSON.parse(run(['inspect',name]))[0];if(prior.Config.Labels['banuchat.scope']!=='unified-isolated'||prior.Mounts[0].Name!==volume)throw new Error('resume_target_rejected');}
if(!exists&&run(['volume','ls','--filter','name=^'+volume+'$','--format','{{.Name}}']).trim())throw new Error('Existing unattached volume requires operator inspection');
const sourceName='banuchat-dev-postgres-ccd-auth-1';
const actual=JSON.parse(run(['inspect',sourceName]))[0];
if(!actual.State.Running||actual.Mounts[0].Name!=='banuchat-dev-ccd-auth-data')throw new Error('source_rejected');
const sourcePool=new Pool({host:'127.0.0.1',port:55453,database:source.database,user:source.admin,password:source.adminPassword,options:'-c default_transaction_read_only=on'});
const roles=(await sourcePool.query("SELECT rolname FROM pg_roles WHERE rolname !~ '^pg_'")).rows.map(r=>r.rolname as string);
const dump=exists?await readFile(new URL('ccd-before-unification.sql',dir)):execFileSync('docker',['exec',sourceName,'pg_dump','-U',source.admin,'-d',source.database],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
if(!exists)await writeFile(new URL('ccd-before-unification.sql',dir),dump,{flag:'wx'});
const envFile=fileURLToPath(new URL('postgres.env',dir));await writeFile(envFile,'POSTGRES_DB='+database+'\nPOSTGRES_USER='+source.admin+'\nPOSTGRES_PASSWORD='+source.adminPassword+'\n');
if(!exists){run(['volume','create','--label','banuchat.scope=unified-isolated',volume]);
run(['run','-d','--name',name,'--label','banuchat.scope=unified-isolated','--env-file',envFile,'-p','127.0.0.1:'+port+':5432','--mount','type=volume,src='+volume+',dst=/var/lib/postgresql/data','pgvector/pgvector:pg16']);
}
const admin=new Pool({host:'127.0.0.1',port,database,user:source.admin,password:source.adminPassword});
for(let n=0;n<60;n++){try{await admin.query('SELECT 1');break;}catch{await new Promise(r=>setTimeout(r,500));}}
const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
if(!exists){for(const role of roles)if(role!==source.admin)await admin.query('CREATE ROLE '+quote(role)+' NOLOGIN');
run(['exec','-i',name,'psql','-U',source.admin,'-d',database,'-v','ON_ERROR_STOP=1'],dump);}
const deployment=randomUUID(),rateKey=randomBytes(32).toString('hex');
await admin.query('UPDATE banuchat_auth.runtime_scope SET database_name=$1,deployment_id=$2',[database,deployment]);
await admin.query('ALTER ROLE '+quote(source.runtime)+' LOGIN PASSWORD '+ "'"+String(source.runtimePassword).replaceAll("'","''")+"'");
const migration=await readFile(new URL('infra/db/012_unified_auxiliary.sql',root),'utf8');
await admin.query("SELECT set_config('banuchat_auth.target_database',$1,false),set_config('banuchat_auth.runtime_role',$2,false)",[database,source.runtime]);
if(!exists)await admin.query(migration);
await admin.query('BEGIN');
const previous=(await admin.query('SELECT current_release_id FROM banuchat_aux.datasets WHERE id=1')).rows[0];
const release=previous?.current_release_id??randomUUID(),config=(await admin.query('SELECT embedding_config_id FROM banuchat.dataset_releases LIMIT 1')).rows[0].embedding_config_id;
if(!previous){
await admin.query("INSERT INTO banuchat_aux.dataset_releases(id,embedding_config_id,provenance,status) VALUES($1,$2,$3,'ready')",[release,config,'fictional_auxiliary']);
await admin.query('INSERT INTO banuchat_aux.datasets(id,current_release_id) VALUES(1,$1)',[release]);
const inputs=[
 {path:'profiles/profiles.json',key:'profiles',table:'synthetic_profiles'},
 {path:'courses/courses.json',key:'courses',table:'courses'},
 {path:'profiles/progress.json',key:'progress',table:'profile_courses'},
 {path:'announcements/announcements.json',key:'announcements',table:'announcements'},
 {path:'calendars/events.json',key:'events',table:'calendar_events'},
];
for(const spec of inputs){
 const bytes=await readFile(new URL('data/synthetic/'+spec.path,root)),data=JSON.parse(bytes.toString());
 const hash=createHash('sha256').update(bytes).digest('hex');
 for(const [index,row] of data[spec.key].entries()){
  const record={dataset_release_id:release,...row,source_path:spec.path,source_locator:spec.key+':'+index,source_sha256:hash};
  const keys=Object.keys(record),values=Object.values(record);
  await admin.query('INSERT INTO banuchat_aux.'+spec.table+' ('+keys.join(',')+') VALUES('+values.map((_,i)=>'$'+(i+1)).join(',')+')',values);
 }
}
}
const principals=(await admin.query("SELECT id FROM banuchat_auth.accounts WHERE status='active' ORDER BY synthetic_uid")).rows;
const profiles=(await admin.query('SELECT profile_key FROM banuchat_aux.synthetic_profiles WHERE dataset_release_id=$1 ORDER BY profile_key',[release])).rows;
for(const [i,p] of principals.entries()){
 const key='account-'+p.id,template=profiles[i%profiles.length].profile_key;
 await admin.query("INSERT INTO banuchat_aux.synthetic_profiles SELECT dataset_release_id,$3,'Usuario '||$4,source_path,source_locator,source_sha256 FROM banuchat_aux.synthetic_profiles WHERE dataset_release_id=$1 AND profile_key=$2 ON CONFLICT DO NOTHING",[release,template,key,String(i+1)]);
 await admin.query('INSERT INTO banuchat_aux.profile_courses SELECT dataset_release_id,$3,course_key,status,progress_percent,started_at,completed_at,source_path,source_locator,source_sha256 FROM banuchat_aux.profile_courses WHERE dataset_release_id=$1 AND profile_key=$2 ON CONFLICT DO NOTHING',[release,template,key]);
 await admin.query('INSERT INTO banuchat_aux.account_profiles VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[p.id,release,key]);
}
await admin.query('COMMIT');
const reader='banuchat_unified_mcp_reader',readerPassword=randomBytes(30).toString('hex');
await admin.query('CREATE ROLE '+reader+" LOGIN PASSWORD '"+readerPassword+"' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
await admin.query('REVOKE CONNECT,TEMPORARY ON DATABASE '+quote(database)+' FROM PUBLIC');
await admin.query('REVOKE CONNECT,TEMPORARY ON DATABASE postgres FROM PUBLIC');
await admin.query('REVOKE CONNECT,TEMPORARY ON DATABASE template1 FROM PUBLIC');
await admin.query('GRANT CONNECT ON DATABASE '+quote(database)+' TO '+quote(source.runtime));
await admin.query('GRANT CONNECT ON DATABASE '+quote(database)+' TO '+reader);
await admin.query("ALTER ROLE "+reader+" SET default_transaction_read_only=on");
await admin.query('GRANT USAGE ON SCHEMA banuchat,banuchat_auth,banuchat_aux TO '+reader);
await admin.query('GRANT SELECT ON ALL TABLES IN SCHEMA banuchat_aux TO '+reader);
await admin.query('GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.embedding_configs,banuchat.documents,banuchat.document_versions TO '+reader);
await admin.query('GRANT EXECUTE ON FUNCTION banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer) TO '+reader);
const old=JSON.parse(await readFile(new URL('infra/local/banuchat-dev/ccd-auth-api.json',root),'utf8'));
const cfg={container:name,volume,database,database_port:port,api_port:3004,deployment,runtime_user:source.runtime,runtime_password:source.runtimePassword,rate_key:rateKey,
 mcp_user:reader,mcp_password:readerPassword,ollama_base_url:old.ollama_base_url,generator_model:old.generator_model,generator_model_revision:old.generator_model_revision,
 generator_runtime_version:old.generator_runtime_version,structured_release:release};
await writeFile(new URL('application.json',dir),JSON.stringify(cfg,null,2)+'\n',{flag:'wx'});
const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/)![0];
execFileSync('icacls',[fileURLToPath(dir),'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)(F)'],{stdio:'ignore'});
for(const file of await readdir(dir))execFileSync('icacls',[fileURLToPath(new URL(file,dir)),'/inheritance:r','/grant:r','*'+sid+':(F)'],{stdio:'ignore'});
await Promise.all([admin.end(),sourcePool.end()]);
console.log(JSON.stringify({status:'PASS',container:name,port,ccd_original_untouched:true,synthetic_documents_imported:0,auxiliary_release:release}));

