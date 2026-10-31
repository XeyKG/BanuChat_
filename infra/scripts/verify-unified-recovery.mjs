#!/usr/bin/env node
// Explicit local recovery exercise. Never starts an API or an N8N runtime.
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync, spawn} from 'node:child_process';
import {constants, closeSync, openSync} from 'node:fs';
import {copyFile, mkdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import {dirname, relative, resolve, sep, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const TASK='OE6-UNIFIED-RECOVERY-01';
const PRIVATE=resolve(process.env.LOCALAPPDATA??ROOT,'BanuChat/recovery',TASK);
export const SOURCES={
 unified:{name:'banuchat-unified-postgres',database:'banuchat_unified',volume:'banuchat-unified-data',schemas:['banuchat','banuchat_auth','banuchat_aux'],port:'55463'},
 oe2:{name:'banuchat-oe6-local-postgres-synthetic-1',database:'postgres',volume:'banuchat-schema-test_pgvector_data',schemas:['public']},
 n8n:{name:'banuchat-unified-n8n',volume:'banuchat-unified-n8n-data',port:'15679'},
};
const ARTIFACT_ROOTS={
 'bch03-m01-m12-local-1':'m01-m12','bch03-ccd-local-2':'expanded-v2',
 'bch03-ccd-local-3':'guidance-v3','bch-ccd-knowledge-1':'product-knowledge-v1',
 'bch-ccd-knowledge-2':'product-knowledge-v2',
};
const fail=code=>{throw new Error(code);};
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const qi=x=>'"'+String(x).replaceAll('"','""')+'"';
const qs=x=>"'"+String(x).replaceAll("'","''")+"'";
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function command(program,args,options={}){
 const childEnv={...process.env};
 // Windows PowerShell must load its own modules instead of inherited PowerShell 7 modules.
 if(program==='powershell')delete childEnv.PSModulePath;
 try{return execFileSync(program,args,{cwd:ROOT,env:childEnv,encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024,timeout:60000,...options});}
 catch{fail('command_failed_'+program.replace(/[^a-z]/gi,''));}
}
const docker=(args,options)=>command('docker',args,options);
const inspect=name=>JSON.parse(docker(['inspect',name]))[0];
const env=d=>Object.fromEntries(d.Config.Env.map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
export function assertSource(d,key){
 const s=SOURCES[key];
 if(!s||d.Name!=='/'+s.name||!d.State.Running||!/^sha256:[a-f0-9]{64}$/.test(d.Image))fail('source_identity_rejected');
 if(d.Mounts.length!==1||d.Mounts[0].Type!=='volume'||d.Mounts[0].Name!==s.volume||
 d.Mounts[0].Destination!==(key==='n8n'?'/home/node/.n8n':'/var/lib/postgresql/data'))fail('source_volume_rejected');
 const ports=Object.values(d.HostConfig.PortBindings??{}).flat();
 if(s.port){if(ports.length!==1||ports[0].HostIp!=='127.0.0.1'||ports[0].HostPort!==s.port||d.Config.Labels?.['banuchat.scope']!=='unified-isolated')fail('source_scope_rejected');}
 else if(ports.length||d.HostConfig.NetworkMode!=='host'||d.Config.Labels?.['com.docker.compose.project']!=='banuchat-oe6-local')fail('oe2_scope_rejected');
 return {name:s.name,id:d.Id,image:d.Image,volume:s.volume,started_at:d.State.StartedAt,restarts:d.RestartCount};
}
export function assertTarget(d,expected){
 if(d.Id!==expected.id||d.Name!=='/'+expected.name||d.Image!==expected.image||
 d.Config.Labels?.['banuchat.recovery.task']!==TASK||d.Config.Labels?.['banuchat.recovery.run']!==expected.run||
 d.HostConfig.NetworkMode!=='none'||Object.keys(d.HostConfig.PortBindings??{}).length||
 (d.HostConfig.Binds??[]).length||(d.Mounts??[]).some(m=>m.Type!=='tmpfs')||
 !d.HostConfig.Tmpfs?.['/var/lib/postgresql/data'])fail('target_isolation_rejected');
 return true;
}
export function safeRelative(path){
 if(typeof path!=='string'||!/^documents\/[a-zA-Z0-9_./-]+$/.test(path)||
 path.split('/').some(p=>!p||p==='.'||p==='..'))fail('artifact_path_rejected');
 return path;
}
export function assertCustodyPhysical(local,base,directory,run){
 const r=relative(local,base);
 if(!r||r==='..'||r.startsWith('..'+sep)||isAbsolute(r)||
 !base.toLowerCase().endsWith((sep+'BanuChat'+sep+'recovery'+sep+TASK).toLowerCase())||
 directory.toLowerCase()!==resolve(base,run).toLowerCase())fail('custody_reparse_point_rejected');
}
export function roleSQL(roles,memberships){
 const statements=[];
 for(const r of roles){
  if(r.rolname==='postgres'||r.rolname.startsWith('pg_'))fail('role_identity_rejected');
  const flags=[r.rolsuper?'SUPERUSER':'NOSUPERUSER',r.rolinherit?'INHERIT':'NOINHERIT',
   r.rolcreaterole?'CREATEROLE':'NOCREATEROLE',r.rolcreatedb?'CREATEDB':'NOCREATEDB',
   r.rolreplication?'REPLICATION':'NOREPLICATION',r.rolbypassrls?'BYPASSRLS':'NOBYPASSRLS'];
  statements.push('CREATE ROLE '+qi(r.rolname)+' NOLOGIN '+flags.join(' ')+' CONNECTION LIMIT '+Number(r.rolconnlimit)+';');
  for(const setting of r.rolconfig??[]){
   if(!['default_transaction_read_only=on','statement_timeout=15s'].includes(setting))fail('role_setting_not_allowlisted');
   const [name,value]=setting.split('=');
   statements.push('ALTER ROLE '+qi(r.rolname)+' SET '+qi(name)+'='+qs(value)+';');
  }
 }
 for(const m of memberships){
  // pg_monitor's built-in memberships belong to each cluster's bootstrap owner.
  // Keep the target defaults and compare them after normalizing that identity.
  if(m.role.startsWith('pg_')&&m.member.startsWith('pg_'))continue;
  for(const [column,option]of [['admin_option','ADMIN'],['inherit_option','INHERIT'],['set_option','SET']]){
  statements.push('SET ROLE '+qi(m.grantor)+';');
  statements.push('GRANT '+qi(m.role)+' TO '+qi(m.member)+' WITH '+option+' '+(m[column]?'TRUE':'FALSE')+' GRANTED BY '+qi(m.grantor)+';');
  statements.push('RESET ROLE;');
  }
 }
 return statements.join('\n');
}

// A psql connection holds the exported read-only snapshot until dump/comparison finish.
class Sql {
 constructor(container,user,database){
  this.child=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-U',user,'-d',database],{cwd:ROOT,stdio:['pipe','pipe','pipe']});
  this.buffer='';this.pending=null;this.closed=false;
  this.child.stdout.on('data',b=>{this.buffer+=b.toString();this.consume();});
  this.child.stderr.on('data',b=>{this.sqlstate=b.toString().match(/ERROR:\s*([0-9A-Z]{5})/)?.[1]??this.sqlstate;});
  this.child.on('error',()=>this.reject('psql_transport_failed'));
  this.child.on('close',()=>{this.closed=true;this.reject('psql_closed'+(this.sqlstate?'_'+this.sqlstate:''));});
 }
 reject(code){if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error(code));this.pending=null;}}
 consume(){
  if(!this.pending)return;
  const end=this.buffer.indexOf(this.pending.marker+'\n');
  if(end<0)return;
  const result=this.buffer.slice(0,end).trim();this.buffer=this.buffer.slice(end+this.pending.marker.length+1);
  const p=this.pending;this.pending=null;clearTimeout(p.timer);p.resolve(result);
 }
 async query(sql){
  if(this.pending||this.closed)fail('psql_state_rejected');
  const marker='recovery_'+randomUUID().replaceAll('-','');
  return new Promise((resolveQuery,reject)=>{
   this.pending={marker,resolve:resolveQuery,reject,timer:setTimeout(()=>{this.reject('psql_deadline');this.child.kill();},30000)};
   this.child.stdin.write(sql+'\n\\echo '+marker+'\n');
  });
 }
 async value(sql){return JSON.parse(await this.query(sql));}
 async close(){if(!this.closed){try{await this.query('ROLLBACK;');}finally{this.child.stdin.end();}}}
}
const schemaFilter=schemas=>schemas.map(qs).join(',');
async function catalog(sql,schemas){
 const allowed=schemaFilter(schemas);
 return sql.value(`SELECT jsonb_build_object(
 'version',current_setting('server_version'),'database',current_database(),'bootstrap_role',pg_get_userbyid(10::oid),
 'bytes',pg_database_size(current_database()),
 'extensions',(SELECT jsonb_agg(jsonb_build_array(extname,extversion,pg_get_userbyid(extowner)) ORDER BY extname) FROM pg_extension),
 'database_meta',(SELECT jsonb_build_object('owner',pg_get_userbyid(datdba),'acl',ARRAY(SELECT x::text FROM unnest(datacl)x ORDER BY 1),'encoding',encoding,'collate',datcollate,'ctype',datctype) FROM pg_database WHERE datname=current_database()),
 'tables',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN (${allowed})),
 'roles',(SELECT jsonb_agg(jsonb_build_object('rolname',rolname,'rolsuper',rolsuper,'rolinherit',rolinherit,'rolcreaterole',rolcreaterole,'rolcreatedb',rolcreatedb,'rolcanlogin',rolcanlogin,'rolreplication',rolreplication,'rolbypassrls',rolbypassrls,'rolconnlimit',rolconnlimit,'rolconfig',rolconfig) ORDER BY rolname) FROM pg_roles WHERE rolname !~ '^pg_' AND rolname<>'postgres'),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin_option',admin_option,'inherit_option',inherit_option,'set_option',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]'::jsonb) FROM pg_auth_members)
 );`);
}
async function fingerprints(sql,tables){
 const result={};
 for(const t of tables){
  result[t.schema+'.'+t.name]=await sql.value(`WITH h AS (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h FROM ${qi(t.schema)}.${qi(t.name)} t)
   SELECT jsonb_build_object('rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(h,'' ORDER BY h),''),'UTF8')),'hex')) FROM h;`);
 }
 return result;
}
async function structure(sql,schemas){
 const allowed=schemaFilter(schemas);
 const queries={
 domains:`SELECT n.nspname,t.typname,c.conname,c.convalidated,pg_get_constraintdef(c.oid) def FROM pg_constraint c JOIN pg_type t ON t.oid=c.contypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN (${allowed}) ORDER BY 1,2,3`,
 schemas:`SELECT nspname,pg_get_userbyid(nspowner) owner,ARRAY(SELECT a::text FROM unnest(nspacl)a ORDER BY 1) acl FROM pg_namespace WHERE nspname IN (${allowed}) ORDER BY 1`,
 relations:`SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,ARRAY(SELECT a::text FROM unnest(c.relacl)a ORDER BY 1) acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN (${allowed}) ORDER BY 1,2`,
 constraints:`SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) def FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN (${allowed}) ORDER BY 1,2,3`,
 columns:`SELECT n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) def,ARRAY(SELECT x::text FROM unnest(a.attacl)x ORDER BY 1) acl FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','S') AND n.nspname IN (${allowed}) ORDER BY 1,2,a.attnum`,
 routines:`SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,ARRAY(SELECT a::text FROM unnest(p.proacl)a ORDER BY 1) acl,pg_get_functiondef(p.oid) def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN (${allowed}) AND p.prokind IN ('f','p') AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') ORDER BY 1,2,3`,
 triggers:`SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) def FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN (${allowed}) AND NOT t.tgisinternal ORDER BY 1,2,3`,
 policies:`SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN (${allowed}) ORDER BY 1,2,3`,
 defaults:`SELECT n.nspname,pg_get_userbyid(d.defaclrole) owner,d.defaclobjtype,ARRAY(SELECT a::text FROM unnest(d.defaclacl)a ORDER BY 1) acl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname IN (${allowed}) OR d.defaclnamespace=0 ORDER BY 1,2,3`,
 indexes:`SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN (${allowed}) ORDER BY 1,2,3`,
 types:`SELECT n.nspname,t.typname,t.typtype,pg_get_userbyid(t.typowner) owner,t.typnotnull,t.typdefault,ARRAY(SELECT a::text FROM unnest(t.typacl)a ORDER BY 1) acl FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN (${allowed}) AND t.typtype IN ('d','e') ORDER BY 1,2`,
 };
 const out={};
 for(const [name,query]of Object.entries(queries)){
  const rows=await sql.value('SELECT coalesce(jsonb_agg(to_jsonb(x)),\'[]\'::jsonb) FROM ('+query+') x;');
  out[name]={count:rows.length,sha256:sha(JSON.stringify(rows))};
 }
 const seq=await sql.value(`SELECT coalesce(jsonb_agg(jsonb_build_array(schemaname,sequencename) ORDER BY schemaname,sequencename),'[]'::jsonb) FROM pg_sequences WHERE schemaname IN (${allowed});`);
 out.sequence_values={};
 for(const [schema,name]of seq)out.sequence_values[schema+'.'+name]=await sql.value(`SELECT to_jsonb(s) FROM ${qi(schema)}.${qi(name)} s;`);
 return out;
}
async function checks(sql,key){
 if(key==='oe2')return sql.value(`SELECT jsonb_build_object('marker',(SELECT marker FROM public.oe2_pipeline_scope),'current',(SELECT current_release_id FROM public.oe2_pipeline_datasets),'ready',(SELECT count(*) FROM public.oe2_pipeline_releases WHERE status='ready'),'snapshots',(SELECT count(*) FROM public.oe2_pipeline_sources),'invalid_origins',(SELECT count(*) FROM public.oe2_pipeline_origins o LEFT JOIN public.oe2_pipeline_sources s USING(dataset_release_id,category,source_id) WHERE s.dataset_release_id IS NULL));`);
 return sql.value(`SELECT jsonb_build_object(
 'ccd_current',(SELECT current_release_id FROM banuchat.datasets WHERE id=1),
 'manifest_sha256',(SELECT manifest_sha256 FROM banuchat.dataset_releases WHERE id=(SELECT current_release_id FROM banuchat.datasets WHERE id=1)),
 'aux_current',(SELECT current_release_id FROM banuchat_aux.datasets WHERE id=1),
 'bad_vector_config',(SELECT count(*) FROM banuchat.document_chunks c JOIN banuchat.dataset_releases r ON r.id=c.dataset_release_id JOIN banuchat.embedding_configs e ON e.id=r.embedding_config_id WHERE c.embedding IS NOT NULL AND vector_dims(c.embedding)<>e.dimension),
 'missing_embedding',(SELECT count(*) FROM banuchat.document_chunks WHERE embedding IS NULL),
 'orphan_sessions',(SELECT count(*) FROM banuchat_auth.sessions s LEFT JOIN banuchat_auth.accounts a ON a.id=s.principal_id WHERE a.id IS NULL),
 'orphan_owners',(SELECT count(*) FROM banuchat_auth.conversation_owners o LEFT JOIN banuchat.conversations c ON c.id=o.conversation_id LEFT JOIN banuchat_auth.accounts a ON a.id=o.principal_id WHERE c.id IS NULL OR a.id IS NULL),
 'conversations_without_owner',(SELECT count(*) FROM banuchat.conversations c LEFT JOIN banuchat_auth.conversation_owners o ON o.conversation_id=c.id WHERE o.conversation_id IS NULL),
 'orphan_messages',(SELECT count(*) FROM banuchat.messages m LEFT JOIN banuchat.conversations c ON c.id=m.conversation_id WHERE c.id IS NULL),
 'orphan_citations',(SELECT count(*) FROM banuchat.message_citations c LEFT JOIN banuchat.messages m ON m.id=c.message_id WHERE m.id IS NULL),
 'mismatched_citation_release',(SELECT count(*) FROM banuchat.message_citations c JOIN banuchat.document_versions v ON v.id=c.document_version_id WHERE v.dataset_release_id<>c.dataset_release_id),
 'invalid_aux_owner',(SELECT count(*) FROM banuchat_aux.account_profiles p LEFT JOIN banuchat_auth.accounts a ON a.id=p.principal_id WHERE a.id IS NULL)
 );`);
}
async function observation(sql,key){
 const c=await catalog(sql,SOURCES[key].schemas);
 return {catalog:c,tables:await fingerprints(sql,c.tables),structure:await structure(sql,SOURCES[key].schemas),checks:await checks(sql,key)};
}
async function sourceSession(key){
 const d=inspect(SOURCES[key].name);assertSource(d,key);
 const user=env(d).POSTGRES_USER;if(!user)fail('source_admin_missing');
 const sql=new Sql(d.Id,user,SOURCES[key].database);
 await sql.query("SET statement_timeout='15s';SET lock_timeout='5s';BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;");
 return {sql,user,d};
}
async function protect(directory){
 if(process.platform!=='win32'||!process.env.LOCALAPPDATA)fail('windows_custody_required');
 if(!directory.startsWith(PRIVATE+sep)||directory.startsWith(ROOT+sep))fail('custody_boundary_rejected');
 await mkdir(directory,{recursive:true});
 const localPhysical=await realpath(process.env.LOCALAPPDATA);
 const privatePhysical=await realpath(PRIVATE);
 const physical=await realpath(directory);
 // MSIX may redirect individual child folders below LOCALAPPDATA/Packages.
 assertCustodyPhysical(localPhysical,privatePhysical,physical,relative(PRIVATE,directory));
 for(const cloud of [process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial].filter(Boolean)){
  const base=resolve(cloud).toLowerCase();
  if(physical.toLowerCase()===base||physical.toLowerCase().startsWith(base+sep))fail('cloud_custody_rejected');
 }
 const sid=command('whoami',['/user','/fo','csv','/nh']).match(/S-1-[0-9-]+/)?.[0];if(!sid)fail('custodian_unavailable');
 command('icacls',[directory,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)(F)']);
 const escaped=directory.replaceAll("'","''");
 const verified=command('powershell',['-NoProfile','-NonInteractive','-Command',`$a=Get-Acl -LiteralPath '${escaped}';$s=@($a.Access|ForEach-Object {$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value});if(-not $a.AreAccessRulesProtected -or $s.Count -ne 1 -or $s[0] -ne '${sid}') {exit 1};Write-Output 'restricted'`]).trim();
 if(verified!=='restricted')fail('private_acl_rejected');
 return true;
}
async function write(directory,name,value){await writeFile(resolve(directory,name),json(value),{flag:'wx'});}
async function configInventory(){
 const names=['infra/local/unified/application.json','infra/local/unified/oe2-reader.json','infra/local/unified/postgres.env','infra/local/unified/n8n.env','infra/local/oe6/n8n-conversation.env','infra/local/auth-i1b/operator-accounts.dpapi'];
 const result=[];
 for(const name of names){const b=await readFile(resolve(ROOT,name));result.push({path:name,bytes:b.length,sha256:sha(b),copied:false});}
 return result;
}
async function artifactInventory(sql){
 return sql.value("SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY version_label,path,sha256),'[]'::jsonb) FROM (SELECT version_label,source_path path,source_sha256 sha256,bool_or(dataset_release_id=(SELECT current_release_id FROM banuchat.datasets WHERE id=1)) is_current FROM banuchat.document_versions GROUP BY version_label,source_path,source_sha256) d;");
}
async function artifactFiles(refs,directory){
 const result=[];
 for(const ref of refs){
  const branch=ARTIFACT_ROOTS[ref.version_label];if(!branch)fail('artifact_version_rejected');
  const base=await realpath(resolve(ROOT,'data/ccd/local',branch));
  const path=safeRelative(ref.path);let source;
  try{source=await realpath(resolve(base,path));}
  catch(error){if(error.code!=='ENOENT'||ref.is_current)fail('artifact_current_missing');result.push({branch,path,expected_sha256:ref.sha256,status:'historical_file_missing',is_current:false});continue;}
  if(!source.startsWith(base+sep))fail('artifact_boundary_rejected');
  const bytes=await readFile(source);
  if(sha(bytes)!==ref.sha256){
   if(ref.is_current)fail('artifact_current_mismatch');
   result.push({branch,path,expected_sha256:ref.sha256,available_sha256:sha(bytes),status:'historical_checksum_mismatch',is_current:false});continue;
  }
  const item={branch,path,bytes:bytes.length,sha256:sha(bytes),status:'verified',is_current:ref.is_current};
  if(directory){const target=resolve(directory,'artifacts',branch,path);await mkdir(dirname(target),{recursive:true});await copyFile(source,target,constants.COPYFILE_EXCL);if(sha(await readFile(target))!==item.sha256)fail('artifact_copy_mismatch');}
  result.push(item);
 }
 return result;
}
function n8nCode(){
 return `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});db.exec('BEGIN');
 const out={workflows:db.prepare('SELECT id,name,active,versionId,activeVersionId,nodes,connections,settings FROM workflow_entity ORDER BY id').all(),
 history:db.prepare('SELECT versionId,workflowId,nodes,connections,name FROM workflow_history ORDER BY workflowId,versionId').all(),
 published:db.prepare('SELECT workflowId,publishedVersionId FROM workflow_published_version ORDER BY workflowId').all(),
 executions:db.prepare('SELECT count(*) n FROM execution_entity').get().n,
 credentials_count:db.prepare('SELECT count(*) n FROM credentials_entity').get().n,
 quick_check:db.prepare('PRAGMA quick_check').get().quick_check};
 db.exec('ROLLBACK');db.close();process.stdout.write(JSON.stringify(out));`;
}
async function n8nRead(){return JSON.parse(docker(['exec',SOURCES.n8n.name,'node','-e',n8nCode()]));}
export function redactDefinitions(value,secrets=[]){
 let redactions=0;
 const visit=(v,key='')=>{
  if(typeof v==='string'){
   if(/^(password|token|secret|apiKey|accessToken|authorization)$/i.test(key)){redactions++;return '[REDACTED]';}
   for(const secret of secrets)if(secret.length>=16&&v.includes(secret)){v=v.replaceAll(secret,'[REDACTED]');redactions++;}
   return v;
  }
  if(Array.isArray(v))return v.map(x=>visit(x));
  if(v&&typeof v==='object'){
   const out={};for(const [k,x]of Object.entries(v))out[k]=visit(x,k);
   if(typeof v.name==='string'&&/authorization|(?:^|[-_])(?:api[-_]?key|token|secret|password)(?:$|[-_])/i.test(v.name)&&'value'in out){out.value='[REDACTED]';redactions++;}
   return out;
  }
  return v;
 };
 // Parse nested JSON so header/password keys cannot evade the structural redactor.
 const input=structuredClone(value);
 for(const rows of [input.workflows,input.history])for(const row of rows)for(const key of ['nodes','connections','settings'])if(typeof row[key]==='string')row[key]=JSON.parse(row[key]);
 return {data:visit(input),redactions};
}
async function definitionsArchive(data,path){
 const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(path);
 try{
  db.exec("CREATE TABLE recovery_definition(kind TEXT NOT NULL,identity TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(kind,identity));BEGIN");
  const insert=db.prepare('INSERT INTO recovery_definition VALUES(?,?,?)');
  for(const kind of ['workflows','history','published'])for(const row of data[kind])insert.run(kind,row.id??row.versionId??row.workflowId,JSON.stringify(row));
  db.exec('COMMIT');const recovered={};
  for(const kind of ['workflows','history','published'])recovered[kind]=db.prepare('SELECT payload FROM recovery_definition WHERE kind=? ORDER BY rowid').all(kind).map(r=>JSON.parse(r.payload));
  if(['workflows','history','published'].some(k=>!same(data[k],recovered[k])))fail('n8n_definition_archive_mismatch');
  const versions=new Set(data.history.map(r=>r.versionId));
  if(data.published.some(p=>!versions.has(p.publishedVersionId)||!data.workflows.some(w=>w.id===p.workflowId&&w.activeVersionId===p.publishedVersionId)))fail('n8n_publication_reference_invalid');
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')fail('definition_sqlite_invalid');
  return {workflows:data.workflows.length,history:data.history.length,published:data.published.length,definitions_equal:true,n8n_runtime_started:false,n8n_full_restore:false};
 }finally{db.close();}
}
async function streamDump(args,path){
 const fd=openSync(path,'wx');
 try{docker(args,{encoding:undefined,stdio:['ignore',fd,'pipe'],timeout:60000});}
 finally{closeSync(fd);}
 const b=await readFile(path);return {bytes:b.length,sha256:sha(b)};
}
async function restoreTarget(key,run,dump,source,report){
 const name='banuchat-recovery-'+key+'-'+run.slice(0,8);
 // Refuse a prior name instead of reusing or replacing it.
 if(docker(['ps','-a','--filter','name=^/'+name+'$','--format','{{.ID}}']).trim())fail('target_name_exists');
 const expected={name,run,image:source.image,id:''};
 report.target=expected;
 try{
  expected.id=docker(['run','--detach','--pull=never','--name',name,'--network','none','--log-driver','none',
   '--label','banuchat.recovery.task='+TASK,'--label','banuchat.recovery.run='+run,
   '--memory','768m','--cpus','1','--pids-limit','128','--shm-size','64m',
   '--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=512m',
   '-e','POSTGRES_DB=restore_control','-e','POSTGRES_HOST_AUTH_METHOD=trust',source.image]).trim();
  assertTarget(inspect(name),expected);
  let ready=false;
  for(let i=0;i<40;i++){
   try{docker(['exec',expected.id,'pg_isready','-h','127.0.0.1','-U','postgres','-d','restore_control']);ready=true;break;}catch{await delay(500);}
  }
  if(!ready)fail('target_not_ready');
  const sql=new Sql(expected.id,'postgres','restore_control');
  try{
   report.phase='roles';
   await sql.query(roleSQL(source.catalog.roles,source.catalog.memberships));
   if(SOURCES[key].database==='postgres')await sql.query('DROP DATABASE postgres;');
  }finally{await sql.close();}
  assertTarget(inspect(name),expected);
  report.phase='restore';
  docker(['exec','-i',expected.id,'pg_restore','-U','postgres','-d','restore_control','--role='+source.catalog.bootstrap_role,'--create','--exit-on-error'],{input:await readFile(dump),timeout:60000,encoding:undefined});
  const check=new Sql(expected.id,'postgres',SOURCES[key].database);
  try{
   report.phase='comparison';
   await check.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;');
   const restored=await observation(check,key);
   const roles=restored.catalog.roles.map(r=>({...r,rolcanlogin:source.catalog.roles.find(s=>s.rolname===r.rolname)?.rolcanlogin}));
   const members=c=>c.memberships.map(m=>({...m,grantor:m.role.startsWith('pg_')&&m.member.startsWith('pg_')&&m.grantor===c.bootstrap_role?'cluster_bootstrap':m.grantor}));
   const extensions=c=>c.extensions.map(([name,version,owner])=>[name,version,name==='plpgsql'&&owner===c.bootstrap_role?'cluster_bootstrap':owner]);
   report.comparisons={tables:same(source.tables,restored.tables),structure:same(source.structure,restored.structure),
    checks:same(source.checks,restored.checks),extensions:same(extensions(source.catalog),extensions(restored.catalog)),
    database_meta:same(source.catalog.database_meta,restored.catalog.database_meta),roles:same(source.catalog.roles,roles),
    memberships:same(members(source.catalog),members(restored.catalog)),all_source_roles_nologin:restored.catalog.roles.every(r=>!r.rolcanlogin)};
   report.restored=restored;
   if(Object.values(report.comparisons).some(v=>!v))fail('restoration_comparison_failed');
   return report;
  }finally{await check.close();}
 }finally{
  // If creation returned uncertainly, inspect the exact unique name; never create it again.
  if(!expected.id){
   const ids=docker(['ps','-a','--filter','name=^/'+name+'$','--format','{{.ID}}']).trim();
   if(ids)expected.id=inspect(name).Id;
  }
  if(expected.id){assertTarget(inspect(name),expected);docker(['rm','--force',expected.id]);report.temporary_container_removed=true;}
 }
}
export async function main(args){
 const mode=args[0];if(!['--preflight','--run'].includes(mode)||args.length!==(mode==='--run'?2:1))fail('explicit_mode_required');
 const run=mode==='--preflight'?randomUUID():args[1];
 if(!/^[a-f0-9-]{36}$/.test(run))fail('run_identity_rejected');
 const directory=resolve(PRIVATE,run);
 if(mode==='--preflight')await protect(directory);
 const scriptHash=sha(await readFile(fileURLToPath(import.meta.url)));
 if(mode==='--preflight'){
  const sources={};for(const key of Object.keys(SOURCES))sources[key]=assertSource(inspect(SOURCES[key].name),key);
  const os=JSON.parse(command('powershell',['-NoProfile','-NonInteractive','-Command',"(Get-CimInstance Win32_OperatingSystem|Select-Object FreePhysicalMemory,TotalVisibleMemorySize)|ConvertTo-Json -Compress"]));
  const disk=JSON.parse(command('powershell',['-NoProfile','-NonInteractive','-Command',"(Get-PSDrive -Name C|Select-Object Free)|ConvertTo-Json -Compress"]));
  if(disk.Free<2*1024**3||os.FreePhysicalMemory<1024**2)fail('host_capacity_insufficient');
  const availableKib=Number(docker(['exec',sources.unified.id,'cat','/proc/meminfo']).match(/^MemAvailable:\s+(\d+)/m)?.[1]);
  if(!availableKib||availableKib<512*1024)fail('docker_capacity_insufficient');
  const sizes={};let artifacts;
  for(const key of ['unified','oe2']){
   const s=await sourceSession(key);try{const c=await catalog(s.sql,SOURCES[key].schemas);sizes[key]=c.bytes;if(c.bytes>128*1024**2||!c.tables?.length)fail('database_capacity_rejected');roleSQL(c.roles,c.memberships);}
   finally{await s.sql.close();}
  }
  const artifactSession=await sourceSession('unified');
  try{artifacts=await artifactFiles(await artifactInventory(artifactSession.sql));}finally{await artifactSession.sql.close();}
  const n8n=await n8nRead();if(n8n.quick_check!=='ok')fail('n8n_sqlite_invalid');
  const plan={run,script_sha256:scriptHash,at:new Date().toISOString(),sources,sizes,host:{free_disk_bytes:disk.Free,free_memory_kib:os.FreePhysicalMemory,docker_available_kib:availableKib,docker_memory_bytes:Number(docker(['info','--format','{{.MemTotal}}']).trim())},
   private_acl_restricted:true,configs:await configInventory(),artifacts:{references:artifacts.length,verified:artifacts.filter(a=>a.status==='verified').length,current:artifacts.filter(a=>a.is_current).length,historical_unavailable:artifacts.filter(a=>a.status!=='verified').length},n8n:{workflows:n8n.workflows.length,history:n8n.history.length,published:n8n.published.length,credentials_count:n8n.credentials_count},consistency:'Per-database exported snapshots; separate stores are not globally atomic',n8n_scope:'Definition-only redacted offline archive; no credentials, keys, execution payloads or N8N runtime'};
  await write(directory,'plan.json',plan);
  console.log(JSON.stringify({status:'PREFLIGHT_READY',run,sizes,n8n:plan.n8n,artifacts:plan.artifacts,host:plan.host}));
  return;
 }
 const plan=JSON.parse(await readFile(resolve(directory,'plan.json'),'utf8'));
 if(plan.run!==run||plan.script_sha256!==scriptHash)fail('preflight_plan_mismatch');
 await protect(directory);
 const marker=openSync(resolve(directory,'run.started'),'wx');closeSync(marker);
 const report={task:TASK,run,started_at:new Date().toISOString(),status:'RUNNING',stores:{},source_preserved:{},cleanup_complete:false};
 const started=performance.now();let identities,cfgBefore,n8nBefore;
 try{
  identities={};for(const key of Object.keys(SOURCES)){identities[key]=assertSource(inspect(SOURCES[key].name),key);if(!same(identities[key],plan.sources[key]))fail('source_changed_since_preflight');}
  cfgBefore=await configInventory();n8nBefore=await n8nRead();
  report.configs_before=cfgBefore;
  for(const key of ['unified','oe2']){
   const begin=performance.now(),s=await sourceSession(key);let source,refs;
   try{
    const snapshot=await s.sql.query('SELECT pg_export_snapshot();');if(!/^[0-9A-F-]+$/.test(snapshot))fail('snapshot_identifier_rejected');
    source=await observation(s.sql,key);
    report.stores[key]={source,snapshot_method:'pg_export_snapshot + pg_dump --snapshot in held REPEATABLE READ READ ONLY transaction'};
    if(key==='oe2'&&(source.checks.marker!=='fictional-oe2-pipeline-demo-02'||source.checks.ready!==6||source.checks.snapshots!==18))fail('oe2_inventory_mismatch');
    if(key==='unified')refs=await artifactInventory(s.sql);
    const dumpPath=resolve(directory,key+'.dump');
    const backup=await streamDump(['exec',s.d.Id,'pg_dump','-U',s.user,'-d',SOURCES[key].database,'--format=custom','--create','--snapshot='+snapshot,'--lock-wait-timeout=5000','--no-password'],dumpPath);
    report.stores[key].backup={...backup,path:key+'.dump'};
   }finally{await s.sql.close();}
   if(key==='unified'){report.artifact_refs=refs;report.artifacts=await artifactFiles(refs,directory);}
   await restoreTarget(key,run,resolve(directory,key+'.dump'),{...source,...identities[key]},report.stores[key]);
   report.stores[key].duration_ms=Math.round(performance.now()-begin);
  }
  const n8nEnv=env(inspect(SOURCES.n8n.name)),app=JSON.parse(await readFile(resolve(ROOT,'infra/local/unified/application.json'),'utf8'));
  const serviceEnv=Object.fromEntries((await readFile(resolve(ROOT,'infra/local/oe6/n8n-conversation.env'),'utf8')).split(/\r?\n/).filter(l=>/^[A-Z][A-Z0-9_]*=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
  const secrets=[...Object.entries(app),...Object.entries(n8nEnv),...Object.entries(serviceEnv)].filter(([k,v])=>/password|token|secret|rate_key|encryption/i.test(k)&&typeof v==='string').map(([,v])=>v);
  const n8n=redactDefinitions(n8nBefore,secrets);
  await write(directory,'n8n-definitions.json',n8n.data);
  report.n8n={...await definitionsArchive(n8n.data,resolve(directory,'n8n-definitions.restore.sqlite')),redactions:n8n.redactions,source_execution_count:n8nBefore.executions,source_credentials_count:n8nBefore.credentials_count};
  report.status='BANUCHAT_OE6_UNIFIED_RECOVERY_PARTIAL'; // Full N8N/secret recovery is deliberately outside this exercise.
 }catch(error){report.status='BANUCHAT_OE6_UNIFIED_RECOVERY_PARTIAL';report.error=/^[a-z0-9_]+$/.test(error.message)?error.message:'recovery_step_failed';}
 finally{
  for(const key of ['unified','oe2']){
   if(!report.stores[key]?.source)continue;
   let s;
   try{s=await sourceSession(key);const after=await observation(s.sql,key);report.source_preserved[key]=same(report.stores[key].source,after);
    // Database physical size may change due to maintenance without logical mutation.
    if(!report.source_preserved[key]){const before=structuredClone(report.stores[key].source);delete before.catalog.bytes;delete after.catalog.bytes;report.source_preserved[key]=same(before,after);}
   }catch{report.source_preserved[key]=false;report.error??='source_after_check_failed';}finally{if(s)await s.sql.close();}
  }
  try{
   if(n8nBefore)report.source_preserved.n8n_selected=same(n8nBefore,await n8nRead());
   if(cfgBefore)report.source_preserved.configs=same(cfgBefore,await configInventory());
   if(report.artifacts)report.source_preserved.artifacts=same(report.artifacts,await artifactFiles(report.artifact_refs));
   if(identities)report.source_preserved.identities=Object.keys(SOURCES).every(key=>same(identities[key],assertSource(inspect(SOURCES[key].name),key)));
   if(Object.values(report.source_preserved).some(v=>!v))report.error??='source_preservation_mismatch';
  }catch{report.error??='preservation_check_failed';}
  report.cleanup_complete=Object.values(report.stores).every(s=>!s.target||s.temporary_container_removed===true);
  report.completed_at=new Date().toISOString();report.duration_ms=Math.round(performance.now()-started);
  await write(directory,'report-private.json',report);
 }
 console.log(JSON.stringify({status:report.status,run,error:report.error,stores:Object.fromEntries(Object.entries(report.stores).map(([k,s])=>[k,{tables:Object.keys(s.source?.tables??{}).length,backup_bytes:s.backup?.bytes,comparisons:s.comparisons,temporary_container_removed:s.temporary_container_removed}])),n8n:report.n8n,source_preserved:report.source_preserved,cleanup_complete:report.cleanup_complete}));
 if(report.error)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 main(process.argv.slice(2)).catch(error=>{console.error(JSON.stringify({status:'BANUCHAT_OE6_UNIFIED_RECOVERY_BLOCKED',error:/^[a-z0-9_]+$/.test(error.message)?error.message:'preflight_failed'}));process.exitCode=1;});
}
