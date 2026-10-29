import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createConnection} from 'node:net';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {Pool} from 'pg';
import {assessApi,assessExpo,assessModel,assessListener,authorizedSerials,check,type Check} from '../src/operations/ccd-preflight.js';
import {validateQueryEmbeddingConfig} from '../src/application/document-query-retrieval.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const releaseId='10af4ffd-effb-41fc-bbfe-4dc48cb3398f',manifestHash='fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852';
type RecordValue=Record<string,any>;
const object=(v:unknown):RecordValue=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:{};
export function assessConfiguration(value:unknown):Check {
 const c=object(value);
 return check('private_configuration',c.database==='banuchat_unified'&&c.database_port===55463&&c.api_port===3004&&
  ['http://127.0.0.1:11434','http://localhost:11434','http://127.0.0.1:11434/','http://localhost:11434/'].includes(c.ollama_base_url)&&
  c.generator_model==='qwen3:4b-instruct'&&/^[a-f\d]{64}$/iu.test(c.generator_model_revision??'')&&/^\d+\.\d+\.\d+$/u.test(c.generator_runtime_version??'')&&
  typeof c.runtime_user==='string'&&c.runtime_user.length>0&&typeof c.runtime_password==='string'&&c.runtime_password.length>0,'EXISTING_UNIFIED_CONFIGURATION_REQUIRED');
}
export function assessUnifiedContainer(value:unknown):Check {
 const c=object(value);
 if(c.Name!=='/banuchat-unified-postgres')return check('postgres_container',false,'EXPECTED_CONTAINER_MISSING');
 if(c.State?.Running!==true)return check('postgres_container',false,'EXISTING_CONTAINER_STOPPED_DO_NOT_RECREATE');
 const bindings=c.NetworkSettings?.Ports?.['5432/tcp'];
 return check('postgres_container',Array.isArray(bindings)&&bindings.length===1&&bindings[0]?.HostIp==='127.0.0.1'&&bindings[0]?.HostPort==='55463'&&
  Array.isArray(c.Mounts)&&c.Mounts.some((m:RecordValue)=>m.Type==='volume'&&m.Name==='banuchat-unified-data'),'EXACT_UNIFIED_LOOPBACK_AND_EXISTING_VOLUME_REQUIRED');
}
export function assessPublication(value:unknown):Check {
 const r=object(value);
 return check('current_release',r.id===releaseId&&r.current_release_id===releaseId&&r.dataset_schema_version==='ccd-1.4.0'&&r.status==='ready'&&r.manifest_sha256===manifestHash,'EXPECTED_CURRENT_CCD14_MANIFEST_REQUIRED');
}
export function assessServicePort(name:string,addresses:unknown,validResponse:boolean,running:boolean):Check {
 if(!Array.isArray(addresses))return check(name,false,'PORT_INSPECTION_INVALID');
 if(!addresses.length)return check(name,!running,running?'SERVICE_NOT_RUNNING':'PORT_FREE_START_EXISTING_ENTRYPOINT');
 if(assessListener(addresses).status!=='PASS')return check(name,false,'NON_LOOPBACK_LISTENER_REJECTED');
 return check(name,validResponse,validResponse?'EXPECTED_SERVICE_ALREADY_LISTENING':'PORT_OCCUPIED_BY_UNEXPECTED_OR_UNHEALTHY_SERVICE');
}
export function safeFailure(name:string,error:unknown):Check {
 const code=object(error).code;
 return check(name,false,code==='42501'?'READ_PRIVILEGE_MISSING_NO_ESCALATION':code==='28P01'?'PRIVATE_RUNTIME_AUTHENTICATION_FAILED':code==='ENOENT'?'LOCAL_TOOL_OR_FILE_MISSING':code==='ECONNREFUSED'?'LOCAL_SERVICE_STOPPED':'PROBE_FAILED_DETAILS_SUPPRESSED');
}
const command=(exe:string,args:string[])=>execFileSync(exe,args,{cwd:root,encoding:'utf8',timeout:12000,windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
const tcp=(port:number)=>new Promise<boolean>(resolve=>{const s=createConnection({host:'127.0.0.1',port});const end=(v:boolean)=>{s.destroy();resolve(v);};s.once('connect',()=>end(true));s.once('error',()=>end(false));s.setTimeout(1200,()=>end(false));});
const request=(url:string,body?:unknown)=>fetch(url,{redirect:'error',signal:AbortSignal.timeout(6000),...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
const listeners=(port:number)=>JSON.parse(command('powershell',['-NoProfile','-NonInteractive','-Command',`ConvertTo-Json -InputObject @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalAddress) -Compress`]));

/** No startup, provisioning, authentication, generation, embeddings or DB writes. */
export async function runPreflight(args:string[]):Promise<number>{
 if(args.some(a=>!['--running','--adb','--report'].includes(a)))throw Error('INVALID_PREFLIGHT_ARGUMENTS');
 const running=args.includes('--running'),checks:Check[]=[],observations:RecordValue={};
 const json=async(path:string)=>JSON.parse(await readFile(join(root,path),'utf8'));
 const probe=async(name:string,work:()=>Promise<void>|void)=>{try{await work();}catch(e){checks.push(safeFailure(name,e));}};
 checks.push(check('node',Number(process.versions.node.split('.')[0])>=22,'NODE_22_OR_LATER_REQUIRED'));
 await probe('repository',()=>{observations.head=command('git',['rev-parse','HEAD']);observations.dirty_files=command('git',['status','--short']).split(/\r?\n/u).filter(Boolean).length;});
 await probe('local_dependencies',async()=>{for(const f of ['backend/api/node_modules/tsx/package.json','backend/api/node_modules/pg/package.json','mobile/node_modules/expo/package.json'])await access(join(root,f));checks.push(check('local_dependencies',true,'EXISTING_DEPENDENCIES_PRESENT_NO_INSTALL_PERFORMED'));});
 await probe('expo',async()=>{checks.push(assessExpo((await json('mobile/package.json')).dependencies.expo,(await json('mobile/node_modules/expo/package.json')).version));});
 let config:RecordValue|undefined,embedding:ReturnType<typeof validateQueryEmbeddingConfig>|undefined;
 await probe('private_configuration',async()=>{const c=await json('infra/local/unified/application.json'),result=assessConfiguration(c);checks.push(result);if(result.status==='PASS')config=c;});
 await probe('private_startup_files',async()=>{for(const f of ['infra/local/oe6/n8n-conversation.env','infra/local/auth-i1b/operator-accounts.dpapi'])await access(join(root,f));checks.push(check('private_startup_files',true,'PRIVATE_STARTUP_AND_OPERATOR_FILES_PRESENT_CONTENT_NOT_DISPLAYED'));});
 let postgres=false;
 await probe('postgres_container',()=>{const result=assessUnifiedContainer(JSON.parse(command('docker',['inspect','banuchat-unified-postgres']))[0]);checks.push(result);postgres=result.status==='PASS';});
 if(config&&postgres)await probe('publication_read_only',async()=>{
  const db=new Pool({host:'127.0.0.1',port:55463,database:config!.database,user:config!.runtime_user,password:config!.runtime_password,connectionTimeoutMillis:5000,statement_timeout:10000,options:'-c default_transaction_read_only=on'});
  try{const c=await db.connect();try{
   await c.query('BEGIN READ ONLY');checks.push(check('sql_read_only',(await c.query('SHOW transaction_read_only')).rows[0]?.transaction_read_only==='on','READ_ONLY_TRANSACTION_REQUIRED'));
   const r=(await c.query("SELECT r.id,d.current_release_id,r.status,r.dataset_schema_version,r.manifest_sha256,e.provider,e.model,e.model_revision,e.dimension,e.distance_metric,e.parameters FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id JOIN banuchat.embedding_configs e ON e.id=r.embedding_config_id WHERE d.id=1")).rows[0];
   checks.push(assessPublication(r));embedding=validateQueryEmbeddingConfig(r);checks.push(check('release_embedding_configuration',true,'PINNED_1024_COSINE_CONFIGURATION_VALIDATED'));
   observations.release_id=r.id;observations.manifest_sha256=r.manifest_sha256;
  }finally{await c.query('ROLLBACK').catch(()=>{});c.release();}}finally{await db.end();}
 });
 if(config)await probe('ollama_models',async()=>{
  const base=config!.ollama_base_url.replace(/\/$/u,''),version=await(await request(base+'/api/version')).json(),tags=await(await request(base+'/api/tags')).json();
  checks.push(check('ollama_runtime',version.version===config!.generator_runtime_version,'PINNED_OLLAMA_VERSION_REQUIRED'));
  const show=await(await request(base+'/api/show',{model:config!.generator_model})).json();checks.push(assessModel(tags,show,{model:config!.generator_model,digest:config!.generator_model_revision,capability:'completion'},'generator_model'));
  if(embedding){const showEmbedding=await(await request(base+'/api/show',{model:embedding.model})).json();checks.push(assessModel(tags,showEmbedding,{model:embedding.model,digest:embedding.model_revision,capability:'embedding',dimension:embedding.dimension},'embedding_model'));checks.push(check('embedding_runtime',version.version===embedding.runtime_version,'RELEASE_RUNTIME_VERSION_REQUIRED'));}
 });
 for(const [name,port,path]of [['api',3004,'/api/v2/auth/me'],['metro',8084,'/status']] as const)await probe(name,async()=>{
  const addresses=listeners(port);let valid=false;
  if(addresses.length){try{const r=await request(`http://127.0.0.1:${port}${path}`);valid=name==='api'?assessApi(r.status,await r.json()).status==='PASS':r.ok&&(await r.text()).trim()==='packager-status:running';}catch{/* Report occupied/unhealthy without response bodies. */}}
  checks.push(assessServicePort(name,addresses,valid,running));
 });
 observations.api_attestation='Anonymous challenge does not prove loaded code revision, account access or active corpus; confirm at login using the documented entrypoint.';
 observations.multisource_n8n_tcp=await tcp(15679);observations.multisource_note='Optional for the documentary demonstration; TCP alone does not attest webhook/workflow/authentication.';
 if(args.includes('--adb')){
  if(!await tcp(5037))checks.push(check('adb',false,'ADB_SERVER_NOT_RUNNING_NO_DAEMON_STARTED'));
  else await probe('adb',()=>{
   const adb=process.env.LOCALAPPDATA?join(process.env.LOCALAPPDATA,'Android','Sdk','platform-tools','adb.exe'):'adb';
   const devices=command(adb,['devices']),serials=authorizedSerials(devices);checks.push(check('adb_device',serials.length===1,'EXACTLY_ONE_PREVIOUSLY_AUTHORIZED_DEVICE_REQUIRED'));if(serials.length!==1)return;
   const run=(a:string[])=>command(adb,['-s',serials[0]!,...a]);
   const routes=run(['reverse','--list']).split(/\r?\n/u).map(l=>l.trim().split(/\s+/u).slice(-2).join(' '));
   checks.push(check('adb_reverse',[3004,8084].every(p=>routes.includes(`tcp:${p} tcp:${p}`)),'USB_REVERSE_3004_AND_8084_REQUIRED'));
   const pkg=run(['shell','dumpsys','package','com.anonymous.banuchat']);checks.push(check('development_build',/versionName=1\.0\.0\b/u.test(pkg),'EXISTING_DEVELOPMENT_BUILD_REQUIRED_NO_INSTALL_PERFORMED'));
   observations.device_model=run(['shell','getprop','ro.product.model']);
  });
 }else checks.push({check:'adb',status:'NOT_EXECUTED',reason:'OPT_IN_WITH_ADB_NO_PHYSICAL_VALIDATION_PERFORMED'});
 const result={at:new Date().toISOString(),phase:running?'services_running':'before_start',status:checks.some(c=>c.status==='FAIL')?'NOT_READY':running?'DEPENDENCY_CHECKS_PASSED':'PREREQUISITES_CHECKED',checks,observations,mutations:'none; optional private report only',scope:'No login, queries, model generation, RAGAS, baseline or physical UI replay'};
 if(args.includes('--report')){const directory=join(root,'data/ccd/local/delivery/entrega-01');command('git',['check-ignore','--quiet','--',join(directory,'preflight.json')]);await mkdir(directory,{recursive:true});await writeFile(join(directory,'preflight-'+Date.now()+'.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});}
 console.log(JSON.stringify(result,null,2));return result.status==='NOT_READY'?1:0;
}
