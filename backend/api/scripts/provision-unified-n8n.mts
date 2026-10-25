import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=new URL('../../../',import.meta.url);
const run=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const source=JSON.parse(run(['inspect','banuchat-oe6-local-n8n-1']))[0];
const env=source.Config.Env as string[],key=env.find(x=>x.startsWith('N8N_ENCRYPTION_KEY='));
if(!key||source.Mounts[0].Name!=='banuchat-schema-test_n8n_data')throw new Error('n8n_source_rejected');
const name='banuchat-unified-n8n',volume='banuchat-unified-n8n-data';
const workflowOnly=process.argv.includes('--workflow-only');
if(workflowOnly){const existing=JSON.parse(run(['inspect',name]))[0];if(existing.Config.Labels['banuchat.scope']!=='unified-isolated'||existing.Mounts[0].Name!==volume)throw new Error('n8n_target_rejected');}
if(!workflowOnly){
if(run(['ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}']).trim())throw new Error('n8n_target_exists');
run(['volume','create','--label','banuchat.scope=unified-isolated',volume]);
run(['run','--rm','--user','0','--entrypoint','sh','--mount','type=volume,src=banuchat-schema-test_n8n_data,dst=/from,readonly','--mount','type=volume,src='+volume+',dst=/to',source.Config.Image,'-c','cp -a /from/. /to/']);
const path=fileURLToPath(new URL('infra/local/unified/n8n.env',root));
await writeFile(path,[key,'N8N_LISTEN_ADDRESS=0.0.0.0','N8N_HOST=localhost','N8N_PORT=5678','N8N_PROTOCOL=http','N8N_RUNNERS_MODE=internal','N8N_UNVERIFIED_PACKAGES_ENABLED=false','N8N_DIAGNOSTICS_ENABLED=false','N8N_VERSION_NOTIFICATIONS_ENABLED=false'].join('\n')+'\n');
run(['run','-d','--name',name,'--label','banuchat.scope=unified-isolated','--env-file',path,'-p','127.0.0.1:15679:5678','--mount','type=volume,src='+volume+',dst=/home/node/.n8n',source.Config.Image]);
}
run(['exec',name,'n8n','export:workflow','--id=BanuChatOe4Conversation1','--output=/tmp/unified-export.json']);
const prior=JSON.parse(run(['exec',name,'node','-e',"process.stdout.write(require('fs').readFileSync('/tmp/unified-export.json','utf8'))"]))[0];
const workflow=JSON.parse(await readFile(new URL('n8n/workflows/oe4-conversation-v1.json',root),'utf8'));
workflow.nodes.find((n:{type:string})=>n.type==='n8n-nodes-base.webhook').credentials=prior.nodes.find((n:{type:string})=>n.type==='n8n-nodes-base.webhook').credentials;
workflow.versionId=randomUUID();
const importPath=fileURLToPath(new URL('infra/local/unified/n8n-workflow.json',root));await writeFile(importPath,JSON.stringify(workflow));
run(['cp',importPath,name+':/tmp/unified-import.json']);
run(['exec',name,'n8n','import:workflow','--input=/tmp/unified-import.json']);
run(['exec',name,'n8n','publish:workflow','--id=BanuChatOe4Conversation1']);
run(['restart',name]);
console.log(JSON.stringify({status:'PASS',name,volume,port:15679,canonical_source_read_only:true}));

