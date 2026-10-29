import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export const root=new URL('../../../../',import.meta.url);
export const container='banuchat-unified-n8n';
export const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});
export const dockerAsync=async(args:string[])=>(await promisify(execFile)('docker',args,{encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024,timeout:60_000})).stdout;
export const categories=['academic_offer','calls','news'] as const;
export type Category=typeof categories[number];
const slugs=['academic-offer','calls','news'];
export const workflowHash=(w:Record<string,unknown>)=>createHash('sha256').update(JSON.stringify({id:w.id,active:w.active,nodes:w.nodes,connections:w.connections,settings:w.settings,versionId:w.versionId,activeVersionId:w.activeVersionId})).digest('hex');

export function guardContainer(){
 const c=JSON.parse(docker(['inspect',container]))[0];
 assert.equal(c.State.Running,true);assert.equal(c.Config.Labels['banuchat.scope'],'unified-isolated');
 assert.deepEqual(c.Mounts.map((m:{Name:string})=>m.Name),['banuchat-unified-n8n-data']);
 assert.deepEqual(c.HostConfig.PortBindings['5678/tcp'],[{HostIp:'127.0.0.1',HostPort:'15679'}]);
}
export function exportWorkflows(){
 docker(['exec',container,'n8n','export:workflow','--all','--output=/tmp/oe2-automation-export.json']);
 return JSON.parse(docker(['exec',container,'cat','/tmp/oe2-automation-export.json'])) as Array<Record<string,any>>;
}
export async function importTestWorkflows(directory:URL,token:string,baseUrl:string){
 guardContainer();const before=exportWorkflows();
 await writeFile(new URL('workflows-before.json',directory),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
 const suffix=Date.now().toString(36),credentialId='BchOe2A01Credential'+suffix;
 const credentials=[{id:credentialId,name:'BanuChat OE2 Automation01 TEST '+suffix,type:'httpHeaderAuth',data:{name:'Authorization',value:'Bearer '+token}}];
 const credentialsPath=new URL('credentials.json',directory);await writeFile(credentialsPath,JSON.stringify(credentials),{flag:'wx'});
 docker(['cp',fileURLToPath(credentialsPath),container+':/tmp/oe2-automation-credentials.json']);
 docker(['exec',container,'n8n','import:credentials','--input=/tmp/oe2-automation-credentials.json']);
 // docker cp creates a root-owned file under sticky /tmp; remove only this
 // exact credential import created above, without touching the N8N volume.
 docker(['exec','--user','0',container,'node','-e',"require('fs').unlinkSync('/tmp/oe2-automation-credentials.json')"]);
 const workflows=[];
 for(let i=0;i<categories.length;i++){
  const w=JSON.parse(await readFile(new URL('n8n/workflows/oe2-'+slugs[i]+'-fixture-v1.json',root),'utf8'));
  w.id='BchOe2A01'+i+suffix;assert.ok(!before.some(prior=>prior.id===w.id));
  w.name='BanuChat OE2 Automation01 TEST '+categories[i]+' '+suffix;
  w.versionId=randomUUID();w.active=false;
  const trigger=w.nodes.find((n:{type:string})=>n.type==='n8n-nodes-base.scheduleTrigger');
  trigger.name='Accelerated Test Every 10 Seconds';trigger.parameters.rule.interval=[{field:'seconds',secondsInterval:10}];
  w.connections[trigger.name]=w.connections['Every 6 Hours'];delete w.connections['Every 6 Hours'];
  w.nodes.find((n:{name:string})=>n.name==='Fixture Configuration').parameters.assignments.assignments.find((a:{name:string})=>a.name==='base_url').value=baseUrl;
  for(const node of w.nodes)if(node.credentials)node.credentials.httpHeaderAuth={id:credentialId,name:credentials[0]!.name};
  workflows.push(w);
 }
 const path=new URL('workflows-test.json',directory);await writeFile(path,JSON.stringify(workflows),{flag:'wx'});
 docker(['cp',fileURLToPath(path),container+':/tmp/oe2-automation-workflows.json']);
 docker(['exec',container,'n8n','import:workflow','--input=/tmp/oe2-automation-workflows.json']);
 return {before,workflows,ids:workflows.map(w=>w.id as string)};
}

export function executions(ids:readonly string[],includeData=false):Record<string,any>[] {
 assert.ok(ids.length===3&&ids.every(id=>/^BchOe2A01[0-2][a-z0-9]+$/u.test(id)));
 const script=`const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});
 const rows=db.prepare('SELECT e.*${includeData?',d.data,d.workflowData':''} FROM execution_entity e ${includeData?'LEFT JOIN execution_data d ON d.executionId=e.id':''} WHERE e.workflowId IN (?,?,?) ORDER BY e.id').all(...${JSON.stringify(ids)});
 ${includeData?"const parse=require(require.resolve('flatted',{paths:['/usr/local/lib/node_modules/n8n']})).parse;for(const r of rows){if(r.data)r.data=parse(r.data);if(r.workflowData)r.workflowData=JSON.parse(r.workflowData);}":''}
 db.close();process.stdout.write(JSON.stringify(rows));`;
 return JSON.parse(docker(['exec',container,'node','-e',script]));
}

export async function waitN8n(){
 for(let n=0;;n++){
  try{assert.equal((await fetch('http://127.0.0.1:15679/healthz',{signal:AbortSignal.timeout(1000)})).status,200);return;}
  catch{if(n===59)throw new Error('n8n_readiness_failed');await new Promise(r=>setTimeout(r,250));}
 }
}

export async function stopTestSchedules(ids:readonly string[]){
 for(const id of ids){assert.match(id,/^BchOe2A01[0-2][a-z0-9]+$/u);await dockerAsync(['exec',container,'n8n','unpublish:workflow','--id='+id]);}
 await dockerAsync(['restart',container]);await waitN8n();
 const after=exportWorkflows();assert.ok(ids.every(id=>after.find(w=>w.id===id)?.active===false));
 return after;
}
