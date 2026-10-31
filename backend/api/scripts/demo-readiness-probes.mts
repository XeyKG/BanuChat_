import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Pool} from 'pg';
import {loadLocalOe2Reader} from '../src/operations/oe2-local-reader.js';
import {validateOe2Publication} from '../src/application/oe2-demo.js';
import {compareOe2History} from '../src/application/oe2-changes.js';
import {loadN8nConversationRuntimeConfig} from '../src/orchestration/n8n-conversation.js';
import type {Check} from '../src/operations/ccd-preflight.js';

export type ReadinessStatus='READY'|'NOT_READY'|'OPTIONAL_UNAVAILABLE'|'NOT_TESTED';
export interface Readiness {component:string;status:ReadinessStatus;required:boolean;reason:string;details?:Record<string,unknown>}
export function readiness(component:string,available:boolean,required:boolean,reason:string,details?:Record<string,unknown>):Readiness {
 return {component,status:available?'READY':required?'NOT_READY':'OPTIONAL_UNAVAILABLE',required,reason,...(details?{details}:{})};
}
export function readinessStatus(checks:readonly Readiness[]):ReadinessStatus {
 if(checks.some(c=>c.required&&c.status==='NOT_READY'))return 'NOT_READY';
 if(checks.some(c=>c.required&&c.status==='NOT_TESTED'))return 'NOT_TESTED';
 return 'READY';
}
export function workflowReady(value:unknown):boolean {
 const v=value as {active?:unknown;published?:unknown;registered?:unknown}|null;
 return !!v&&v.active===true&&v.published===true&&v.registered===true;
}
export function baseReadiness(c:Check):Readiness {
 const optional=(c.check.startsWith('adb')||c.check==='development_build'||c.check==='metro')&&!/NON_LOOPBACK|UNEXPECTED_OR_UNHEALTHY|INSPECTION_INVALID/u.test(c.reason);
 if(c.status==='NOT_EXECUTED'||c.status==='NOT_EVALUABLE')return {component:c.check,status:'NOT_TESTED',required:!optional,reason:c.reason};
 return readiness(c.check,c.status==='PASS',!optional,c.reason);
}
/** Dependency readiness only. No login, generation, source publication or workflow invocation. */
export async function extendedReadiness(root:string,config:Record<string,any>|undefined):Promise<Readiness[]> {
 const result:Readiness[]=[];
 const probe=async(name:string,required:boolean,work:()=>Promise<Readiness>)=>{try{result.push(await work());}catch{result.push(readiness(name,false,required,'DEPENDENCY_UNAVAILABLE_DETAILS_SUPPRESSED'));}};
 const command=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',timeout:12000,windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
 await probe('n8n_conversation',true,async()=>{
  const c=JSON.parse(command(['inspect','banuchat-unified-n8n']))[0],bindings=c.NetworkSettings?.Ports?.['5678/tcp'];
  const safe=c.Name==='/banuchat-unified-n8n'&&c.State?.Running===true&&bindings?.length===1&&bindings[0].HostIp==='127.0.0.1'&&bindings[0].HostPort==='15679'&&c.Mounts?.some((m:any)=>m.Name==='banuchat-unified-n8n-data');
  if(!safe)return readiness('n8n_conversation',false,true,'EXISTING_RUNNING_LOOPBACK_N8N_AND_VOLUME_REQUIRED');
  const env:Record<string,string>={};for(const line of (await readFile(join(root,'infra/local/oe6/n8n-conversation.env'),'utf8')).split(/\r?\n/u)){const m=/^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);if(m)env[m[1]!]=m[2]!;}
  env.BANUCHAT_N8N_CONVERSATION_URL='http://127.0.0.1:15679/webhook/banuchat/internal/oe4/conversation';loadN8nConversationRuntimeConfig(env);
  const health=await fetch('http://127.0.0.1:15679/healthz',{redirect:'error',signal:AbortSignal.timeout(4000)});
  const script=`const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});const w=d.prepare("SELECT active,activeVersionId FROM workflow_entity WHERE id=?").get('BanuChatOe4Conversation1');const h=d.prepare("SELECT method,webhookPath FROM webhook_entity WHERE workflowId=?").all('BanuChatOe4Conversation1');d.close();process.stdout.write(JSON.stringify({active:w?.active===1,published:!!w?.activeVersionId,registered:h.some(x=>x.method==='POST'&&x.webhookPath==='banuchat/internal/oe4/conversation')}));`;
  const state=JSON.parse(command(['exec','banuchat-unified-n8n','node','-e',script]));
  return readiness('n8n_conversation',health.status===200&&workflowReady(state),true,'HEALTH_ACTIVE_PUBLISHED_WEBHOOK_AND_PRIVATE_CONFIG_CHECKED_NOT_E2E');
 });
 await probe('mcp_agent_preparation',true,async()=>{
  if(!config)throw Error();for(const f of ['backend/mcp-server/src/unified-main.ts','backend/mcp-server/node_modules/@modelcontextprotocol/server/package.json'])await access(join(root,f));
  const contract=JSON.parse(await readFile(join(root,'backend/mcp-server/tools.contract.json'),'utf8'));if(contract.tools?.length!==6)throw Error();
  const db=new Pool({host:'127.0.0.1',port:55463,database:config.database,user:config.mcp_user,password:config.mcp_password,connectionTimeoutMillis:4000,statement_timeout:5000,options:'-c default_transaction_read_only=on'});
  try{const c=await db.connect();try{await c.query('BEGIN READ ONLY');
   const r=await c.query("SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_auth'::regnamespace,'banuchat_aux'::regnamespace) AND c.relkind='r' AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(c.oid,'INSERT,UPDATE'))) AND has_function_privilege('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)','EXECUTE') AS safe FROM pg_roles WHERE rolname=current_user");
   return readiness('mcp_agent_preparation',r.rows[0]?.safe===true,true,'SIX_TOOL_CONTRACT_ENTRYPOINT_AND_READ_ONLY_ROLE_READY_NOT_STDIO_E2E');
  }finally{await c.query('ROLLBACK').catch(()=>{});c.release();}}finally{await db.end();}
 });
 let reader:Awaited<ReturnType<typeof loadLocalOe2Reader>>;
 await probe('oe2_current',false,async()=>{
  reader=await loadLocalOe2Reader(pathToFileURL(join(root,'infra/local/unified/oe2-reader.json')));
  if(!reader)throw Error();const p=await reader.read();validateOe2Publication(p);
  return readiness('oe2_current',true,false,'EXISTING_ISOLATED_PUBLICATION_AND_PROJECTIONS_VALIDATED',{current_release_id:p.release_id});
 });
 await probe('banu_al_dia',false,async()=>{
  if(!reader?.readHistory)throw Error();const history=await reader.readHistory(),comparison=compareOe2History(history);
  return readiness('banu_al_dia',true,false,'APPROVED_CONSISTENT_HISTORY_VALIDATED_NO_PUBLICATION',{ready_releases:history.timeline.length,current_release_id:comparison.current_release_id,previous_release_id:comparison.previous_release_id,comparison_status:comparison.comparison_status,counts:comparison.counts});
 });
 await probe('local_notification_dependencies',false,async()=>{
  const p=JSON.parse(await readFile(join(root,'mobile/package.json'),'utf8'));
  for(const name of ['expo-notifications','expo-device','expo-secure-store']){const installed=JSON.parse(await readFile(join(root,'mobile/node_modules',name,'package.json'),'utf8'));if(!/^~?57\./u.test(p.dependencies[name])||!/^57\./u.test(installed.version))throw Error();}
  return readiness('local_notification_dependencies',true,false,'EXPO57_NATIVE_PACKAGES_PRESENT_DEVICE_RECEIPT_NOT_TESTED');
 });
 result.push({component:'authenticated_product_e2e',status:'NOT_TESTED',required:false,reason:'RUN_BOUNDED_AUTHENTICATED_SMOKE_SEPARATELY'});
 result.push({component:'physical_notification_receipt',status:'NOT_TESTED',required:false,reason:'REQUIRES_DEVICE_UI_NOT_A_PREFLIGHT_API_CALL'});
 return result;
}
