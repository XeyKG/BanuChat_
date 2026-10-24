/** Read-only local preflight. No accounts, message POSTs, migrations, daemon startup or service restarts. */
import {access,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createConnection} from 'node:net';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {environment,root} from './auth-i1b/environment.js';
import {validateQueryEmbeddingConfig} from '../src/application/document-query-retrieval.js';
import {PgAuthStore} from '../src/auth/pg-auth-store.js';
import {assessApi,assessExpo,assessContainer,assessPublicMobile,assessModel,authorizedSerials,assessAdbReverse,assessListener,assessProbeFailure,check,type Check} from '../src/operations/ccd-preflight.js';
const checks:Check[]=[];
const unavailable=(name:string,reason:string):Check=>({check:name,status:'NOT_EVALUABLE',reason});
const command=(exe:string,args:string[])=>execFileSync(exe,args,{cwd:fileURLToPath(root),encoding:'utf8',timeout:10000,stdio:['pipe','pipe','pipe'],windowsHide:true}).trim();
const json=async(path:string)=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const probe=async(name:string,action:()=>Promise<void>|void)=>{try{await action();}catch(error){checks.push(assessProbeFailure(name,error));}};
const request=async(url:string,body?:unknown)=>fetch(url,{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(5000),...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
const connected=(port:number)=>new Promise<boolean>(resolve=>{const s=createConnection({host:'127.0.0.1',port});const finish=(ok:boolean)=>{s.destroy();resolve(ok);};s.once('connect',()=>finish(true));s.once('error',()=>finish(false));s.setTimeout(1500,()=>finish(false));});
async function main(){
 const args=process.argv.slice(2);if(args.some(a=>!['--adb','--report'].includes(a)))throw Error('ARGUMENTS');
 let head:string|undefined,dirty:number|undefined;
 await probe('repository',()=>{
  const top=command('git',['rev-parse','--show-toplevel']).replaceAll('\\','/').toLowerCase();
  checks.push(check('repository_root',top===fileURLToPath(root).replaceAll('\\','/').replace(/\/$/u,'').toLowerCase(),'EXPECTED_REPOSITORY_ROOT'));
  const revision=command('git',['rev-parse','HEAD']);if(/^[a-f0-9]{40}$/u.test(revision))head=revision;
  checks.push(check('repository_revision',!!head,'VALID_GIT_REVISION'));
  dirty=command('git',['status','--porcelain']).split(/\r?\n/u).filter(Boolean).length;
  checks.push(check('working_tree',dirty===0,'DIRTY_TREE_REQUIRES_REVIEW_BEFORE_DEMONSTRATION'));
 });
 await probe('dependencies',async()=>{
  for(const path of ['backend/api/node_modules/tsx/package.json','backend/api/node_modules/typescript/package.json','backend/api/node_modules/pg/package.json','mobile/node_modules/react-native/package.json'])await json(path);
  checks.push(check('local_dependencies',true,'EXISTING_LOCAL_PACKAGES_PRESENT'));
 });
 await probe('expo_sdk',async()=>{checks.push(assessExpo((await json('mobile/package.json')).dependencies.expo,(await json('mobile/node_modules/expo/package.json')).version));});
 checks.push(assessPublicMobile(process.env));
 await probe('mobile_launcher',async()=>{
  const source=await readFile(new URL('mobile/scripts/start-ccd-auth.ps1',root),'utf8');
  checks.push(check('mobile_launcher',source.includes("$env:EXPO_PUBLIC_DEMO_MODE = 'ccd_authenticated'")&&source.includes("$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3003/api/v2'")&&source.includes("$env:EXPO_PUBLIC_AUTH_LOCAL_CHANNEL = 'adb_reverse'")&&source.includes('expo start --localhost --port 8084'),'EXISTING_LAUNCHER_CONFIGURES_CCD_LOOPBACK'));
 });
 checks.push(unavailable('metro_effective_environment','RUNNING_METRO_ENVIRONMENT_NOT_ATTESTED_BY_SHELL_OR_SCRIPT'));
 await probe('metro',async()=>{const r=await request('http://127.0.0.1:8084/status');checks.push(check('metro',r.ok&&(await r.text())==='packager-status:running','METRO_8084_STATUS_REQUIRED'));});
 await probe('api_v2_anonymous',async()=>{const r=await request('http://127.0.0.1:3003/api/v2/auth/me');checks.push(assessApi(r.status,await r.json().catch(()=>undefined)));});
 checks.push(unavailable('api_running_revision','HTTP_AUTH_CHALLENGE_DOES_NOT_IDENTIFY_LOADED_CODE_OR_CCD_MODE'));
 await probe('api_loopback_binding',()=>{
  const value=JSON.parse(command('powershell',['-NoProfile','-NonInteractive','-Command',"$addresses=@(Get-NetTCPConnection -State Listen -LocalPort 3003 -ErrorAction Stop | Select-Object -ExpandProperty LocalAddress); ConvertTo-Json -InputObject $addresses -Compress"]));checks.push(assessListener(value));
 });
 let embedding:ReturnType<typeof validateQueryEmbeddingConfig>|undefined;
 await probe('postgres_identity',async()=>{
  // The existing live-environment guard dereferences active port bindings.
  // Inspect first so a stopped container is diagnosed without starting it.
  const saved=await json('infra/local/auth-i1b/ccd-deployment.json');
  if(saved.database!=='banuchat_ccd_auth_i1b_test'||saved.port!==55443||saved.name!=='banuchat-ccd-auth-i1b-test'||saved.mode!=='ccd_local'){checks.push(check('postgres_identity',false,'WRONG_PRIVATE_LAB_CONFIGURATION'));return;}
  const inspected=JSON.parse(command('docker',['inspect','banuchat-ccd-auth-i1b-test']))[0];
  const container=assessContainer(inspected,{id:saved.containerId,network:saved.network,volume:saved.volume});checks.push(container);if(container.status!=='PASS')return;
  const e=await environment();
  const db=new Pool({host:'127.0.0.1',port:55443,database:e.database,user:e.runtime,password:e.runtimePassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:10000});
  try{
   await new PgAuthStore(db).assertRuntime(e.database,'ccd_local');
   const scope=(await db.query('SELECT deployment_id,database_name,evidence_mode FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0];
   checks.push(check('postgres_scope',scope?.deployment_id===e.deployment&&scope.database_name===e.database&&scope.evidence_mode==='ccd_local','EXACT_I1B_DEPLOYMENT_AND_CCD_SCOPE'));
   const rows=(await db.query('SELECT ec.* FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id JOIN banuchat.embedding_configs ec ON ec.id=r.embedding_config_id WHERE d.id=1 AND r.status=\'ready\'')).rows;
   if(rows.length!==1)throw Error('RELEASE');embedding=validateQueryEmbeddingConfig(rows[0]);checks.push(check('release_embedding_configuration',true,'READY_RELEASE_VALIDATED_1024_COSINE'));
  }finally{await db.end();}
 });
 await probe('ollama',async()=>{
  const expected=(await json('eval/auth/results/bch05-ccd-auth-i1a-http.json')).generator;
  const version=await(await request('http://127.0.0.1:11434/api/version')).json() as any;
  checks.push(check('ollama_version',version.version===expected.runtime_version,'PINNED_OLLAMA_RUNTIME_REQUIRED'));
  const tags=await(await request('http://127.0.0.1:11434/api/tags')).json();
  const show=await(await request('http://127.0.0.1:11434/api/show',{model:expected.model})).json();
  checks.push(assessModel(tags,show,{model:expected.model,digest:expected.model_revision,capability:'completion'},'generator_model'));
  if(embedding){const showEmbedding=await(await request('http://127.0.0.1:11434/api/show',{model:embedding.model})).json();checks.push(assessModel(tags,showEmbedding,{model:embedding.model,digest:embedding.model_revision,capability:'embedding',dimension:embedding.dimension},'embedding_model'));checks.push(check('embedding_runtime',version.version===embedding.runtime_version,'RELEASE_RUNTIME_REQUIRED'));}
  else checks.push(unavailable('embedding_model','RELEASE_CONFIGURATION_NOT_VERIFIED'));
 });
 if(!args.includes('--adb'))checks.push({check:'adb',status:'NOT_EXECUTED',reason:'OPT_IN_WITH_ADB_FLAG'});
 else if(!await connected(5037))checks.push(unavailable('adb','ADB_SERVER_NOT_RUNNING_NO_DAEMON_STARTED'));
 else await probe('adb',async()=>{
  let adb='adb';
  try{command('where.exe',['adb']);}catch{
   if(!process.env.LOCALAPPDATA)throw Error('ADB_UNAVAILABLE');
   adb=join(process.env.LOCALAPPDATA,'Android','Sdk','platform-tools','adb.exe');await access(adb);
  }
  const devices=command(adb,['devices']);const serials=authorizedSerials(devices);
  if(serials.length===0)checks.push(unavailable('adb','NO_AUTHORIZED_DEVICE_OPERATOR_INTERACTION_REQUIRED'));
  if(/\s(?:unauthorized|offline)\s*$/mu.test(devices))checks.push(unavailable('adb_other_devices','UNAUTHORIZED_OR_OFFLINE_DEVICE_NOT_ACCESSED'));
  for(const [index,serial] of serials.entries()){
   try{checks.push(assessAdbReverse(command(adb,['-s',serial,'reverse','--list']),index+1));}
   catch{checks.push(unavailable('adb_device_'+(index+1),'DEVICE_QUERY_UNAVAILABLE'));}
  }
 });
 checks.push({check:'android_physical_isolation',status:'NOT_EXECUTED',reason:'ADB_CONNECTIVITY_IS_NOT_EXPO_GO_OR_SECURESTORE_VALIDATION'});
 // All network probes above use fixed loopback destinations. This does not inspect loaded app state.
 checks.push(check('diagnostic_network_destinations',true,'ONLY_FIXED_LOOPBACK_NO_INSTITUTIONAL_API_REQUESTS'));
 const report={checkpoint:'BCH-05/CCD-AUTH-I1B-OPS',at:new Date().toISOString(),head:head??null,dirty_entries:dirty??null,read_only:true,checks,
  counts:Object.fromEntries(['PASS','FAIL','NOT_EVALUABLE','NOT_EXECUTED'].map(s=>[s,checks.filter(c=>c.status===s).length]))};
 console.log(JSON.stringify(report,null,2));
 if(args.includes('--report'))await writeFile(new URL(`eval/auth/results/bch05-ccd-auth-i1b-ops-preflight-${Date.now()}.json`,root),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 process.exitCode=checks.some(c=>c.status==='FAIL')?2:checks.some(c=>c.status==='NOT_EVALUABLE')?3:0;
}
await main().catch(()=>{console.log(JSON.stringify({status:'NOT_EVALUABLE',reason:'PREFLIGHT_ABORTED_NO_RAW_ERROR'}));process.exitCode=3;});
