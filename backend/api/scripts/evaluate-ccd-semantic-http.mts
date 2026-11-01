/** One authenticated smoke of the existing local API; no automatic retries,
 * account provisioning, deletes or service lifecycle operations. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {demoAccounts} from '../test/auth-i1b/accounts.js';
assert.deepEqual(process.argv.slice(2),['--run-once']);
const base='http://127.0.0.1:3004/api/v2';
const run=path.join(process.env.LOCALAPPDATA!,'BanuChat','rag-semantic-quality-01','http-'+randomUUID());
await mkdir(run,{recursive:true});
const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];
execFileSync('icacls',[run,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)(F)`],{stdio:'ignore'});
const report:{started_at:string;requests:any[];checks:any[];state:string;conversation_id?:string}={started_at:new Date().toISOString(),requests:[],checks:[],state:'RUNNING'};
let token='';
async function request(name:string,endpoint:string,status:number,method='GET',body?:unknown){
 const response=await fetch(base+endpoint,{method,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(120000)});
 report.requests.push({name,method,status:response.status,expected:status});assert.equal(response.status,status,name);
 return response.status===204?null:await response.json() as any;
}
try{
 const accounts=await demoAccounts();
 const pair=await request('login','/auth/login',200,'POST',{synthetic_uid:accounts[0]!.uid,password:accounts[0]!.password});token=pair.access_token;
 const me=await request('me','/auth/me',200);assert.equal(me.evidence_mode,'ccd_local');
 const created=await request('create','/conversations',201,'POST',{});report.conversation_id=created.conversation_id;
 const cases=[
  {name:'fee-and-duration',query:'¿Cuánto cuesta el curso en 2026 y cuánto dura?',required:[/362\.550/u,/32 horas/u,/96 totales/u],partial:false},
  {name:'platform-and-monitoring',query:'¿En qué LMS presento el diagnóstico y qué plataforma supervisa la prueba?',required:[/Moodle/u,/Canvas/u,/No tengo evidencia suficiente/u],partial:true},
  {name:'legal-limit',query:'Dime el nombre de la ley y número de decreto exacto en el syllabus de Marco Legal Digital.',required:[/derechos de autor/u,/evidencia disponible no identifica/u],partial:true},
  {name:'economic-authority',query:'Aplícame un descuento institucional para mi curso pendiente.',required:[/No tengo facultades/u],partial:true},
 ];
 for(const c of cases){const turn=await request(c.name,'/conversations/'+created.conversation_id+'/messages',201,'POST',{content:c.query}),answer=turn.assistant_message;assert.equal(answer.insufficient_evidence,c.partial,c.name);for(const pattern of c.required)assert.match(answer.content,pattern,c.name);if(c.name==='economic-authority')assert.equal(answer.citations.length,0);else {assert.ok(answer.citations.length>0);assert.ok(answer.citations.every((citation:any)=>citation.source_kind==='document'&&citation.release_id===me.release_id));}report.checks.push({name:c.name,result:'PASS',citations:answer.citations.length,insufficient_evidence:answer.insufficient_evidence});console.log('PASS '+c.name);}
 const history=await request('persisted-history','/conversations/'+created.conversation_id,200);assert.equal(history.messages.length,cases.length*2);
 for(const [index,c]of cases.entries()){const answer=history.messages[index*2+1];assert.equal(answer.role,'assistant');assert.equal(answer.insufficient_evidence,c.partial);for(const pattern of c.required)assert.match(answer.content,pattern);}
 report.checks.push({name:'persisted-history',result:'PASS',messages:history.messages.length});report.state='HTTP_SAMPLE_PASSED';
}catch{report.state='HTTP_SAMPLE_FAILED';process.exitCode=1;}
finally{
 if(token){try{await request('logout','/auth/logout',204,'POST');await request('revoked-access','/auth/me',401);}catch{report.state='HTTP_SAMPLE_FAILED';process.exitCode=1;}}
 await writeFile(path.join(run,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({state:report.state,checks:report.checks,requests:report.requests,private_report:run}));
}
