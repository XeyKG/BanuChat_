import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

// Deliberately does not provision containers, credentials or copy any volume.
const root=new URL('../../../',import.meta.url),name='banuchat-unified-n8n';
const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
const target=JSON.parse(docker(['inspect',name]))[0];
assert.equal(target.Config.Labels['banuchat.scope'],'unified-isolated');
assert.equal(target.State.Running,true);
assert.deepEqual(target.Mounts.map((m:{Name:string})=>m.Name),['banuchat-unified-n8n-data']);
assert.deepEqual(target.HostConfig.PortBindings['5678/tcp'],[{HostIp:'127.0.0.1',HostPort:'15679'}]);
const directory=new URL('infra/local/oe3-oe4-increment-01/',root);
execFileSync('git',['check-ignore','--quiet',fileURLToPath(new URL('workflow-backup.json',directory))],{stdio:'ignore'});
await mkdir(directory,{recursive:true});
docker(['exec',name,'n8n','export:workflow','--id=BanuChatOe4Conversation1','--output=/tmp/oe3-oe4-backup.json']);
const previous=docker(['exec',name,'cat','/tmp/oe3-oe4-backup.json']);
const backup=new URL('workflow-backup-'+Date.now()+'.json',directory);
await writeFile(backup,previous,{flag:'wx'});
const prior=JSON.parse(previous)[0];assert.equal(prior.active,true);
const workflow=JSON.parse(await readFile(new URL('n8n/workflows/oe4-conversation-v1.json',root),'utf8'));
const webhook=workflow.nodes.find((n:{type:string})=>n.type==='n8n-nodes-base.webhook');
webhook.credentials=prior.nodes.find((n:{type:string})=>n.type==='n8n-nodes-base.webhook').credentials;
assert.ok(webhook.credentials.httpHeaderAuth.id!=='__RELINK_AFTER_IMPORT__');
workflow.versionId=randomUUID();
const candidate=new URL('workflow-candidate.json',directory);
await writeFile(candidate,JSON.stringify(workflow));
let phase='import';
try{
 docker(['cp',fileURLToPath(candidate),name+':/tmp/oe3-oe4-candidate.json']);
 docker(['exec',name,'n8n','import:workflow','--input=/tmp/oe3-oe4-candidate.json']);
 docker(['exec',name,'n8n','publish:workflow','--id=BanuChatOe4Conversation1']);
 docker(['restart',name]);
 phase='health';
 for(let attempt=0;;attempt++){
  try{assert.equal((await fetch('http://127.0.0.1:15679/healthz',{signal:AbortSignal.timeout(1000)})).status,200);break;}
  catch{if(attempt===39)throw new Error('n8n_restart_unavailable');await new Promise(r=>setTimeout(r,250));}
 }
 const env=await readFile(new URL('infra/local/oe6/n8n-conversation.env',root),'utf8');
 const token=env.split(/\r?\n/u).find(l=>l.startsWith('BANUCHAT_N8N_SERVICE_TOKEN='))?.slice('BANUCHAT_N8N_SERVICE_TOKEN='.length);
 assert.ok(token);
 for(const sources of [2,3]){
  phase='admission_'+sources;
  const operation_id=randomUUID(),release_id=randomUUID();
  let response:Response;
  // Health becomes ready before published webhooks finish registering. This is
  // deployment readiness polling only, never a retry of a product query.
  for(let attempt=0;;attempt++){
   response=await fetch('http://127.0.0.1:15679/webhook/banuchat/internal/oe4/conversation',{
   method:'POST',signal:AbortSignal.timeout(4000),headers:{'Content-Type':'application/json','X-BanuChat-Service-Token':token},
    body:JSON.stringify({operation_id,release_id,required_sources:sources,demo_mode:'ccd_local',route:'agent_fallback',requested_capability:'bounded_mcp_agent'})});
   if(response.status!==404||attempt===39)break;
   await response.arrayBuffer();await new Promise(r=>setTimeout(r,250));
  }
  const raw=await response.text();
  console.log(JSON.stringify({phase,status:response.status,response_bytes:Buffer.byteLength(raw)}));
  const result=JSON.parse(raw);
  console.log(JSON.stringify({phase,status:response.status,state:result.state,directive:result.directive,error_code:result.error_code}));
  assert.equal(response.status,200);
  assert.deepEqual(result,{operation_id,release_id,workflow:'oe4-conversation-v1',
   state:sources>2?'clarification_required':'authorized',directive:sources>2?'request_clarification':'invoke_bounded_mcp_agent'});
 }
 console.log(JSON.stringify({status:'UPDATED_AND_PROBED',backup_saved_privately:true,volume_preserved:true,credentials_preserved:true,admission_states:2}));
}catch{
 console.error(JSON.stringify({status:'UPDATE_FAILED_ROLLING_BACK',phase}));
 // Restore only this workflow, using the saved exact prior export.
 docker(['cp',fileURLToPath(backup),name+':/tmp/oe3-oe4-rollback.json']);
 docker(['exec',name,'n8n','import:workflow','--input=/tmp/oe3-oe4-rollback.json']);
 docker(['exec',name,'n8n','publish:workflow','--id=BanuChatOe4Conversation1']);
 docker(['restart',name]);
 throw new Error('workflow_update_failed_prior_workflow_restored');
}
