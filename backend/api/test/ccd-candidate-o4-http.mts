/** O4 canonical API regression. Controlled writes are retained only in the promoted candidate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {candidateEnvironment,candidatePool} from './ccd-candidate-o3/environment.js';
import {demoAccounts} from './auth-i1b/accounts.js';
import {environment,fingerprint,pool,root} from './auth-i1b/environment.js';

const base='http://127.0.0.1:3003/api/v2',candidate=await candidateEnvironment(),i1b=await environment(),fixtures=await demoAccounts();
const candidateDb=candidatePool(candidate,'admin',true),i1bDb=pool(i1b,'admin');
const digest=async(db:any)=>{const rows=await db.query(`SELECT row_text FROM (SELECT to_jsonb(c)::text row_text FROM banuchat.conversations c UNION ALL SELECT to_jsonb(m)::text FROM banuchat.messages m UNION ALL SELECT to_jsonb(mc)::text FROM banuchat.message_citations mc) q ORDER BY row_text`);return createHash('sha256').update(JSON.stringify(rows.rows)).digest('hex');};
const request=async(path:string,token?:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const response=await fetch(base+path,{method,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(120000)});return{status:response.status,body:response.status===204?null:await response.json() as any};};
const report:any={checkpoint:'BANUCHAT-O4',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),configuration:{api_port:3003,database_port:55453,container:candidate.name,volume:candidate.volume,network:candidate.network},checks:{},created:{conversations:0,messages:0,citations:0}};
let accessA:string|undefined,accessB:string|undefined;
try{
 const before={candidateCorpus:await fingerprint(candidateDb,true),candidateHistory:await digest(candidateDb),i1bCorpus:await fingerprint(i1bDb,true),i1bHistory:await digest(i1bDb)};
 assert.equal((await request('/auth/me')).status,401);
 const loginA=await request('/auth/login',undefined,{synthetic_uid:fixtures[0]!.uid,password:fixtures[0]!.password});assert.equal(loginA.status,200);
 const oldAccess=loginA.body.access_token as string;
 const refreshed=await request('/auth/refresh',undefined,{refresh_token:loginA.body.refresh_token});assert.equal(refreshed.status,200);accessA=refreshed.body.access_token;
 assert.equal((await request('/auth/me',oldAccess)).status,401);const meA=await request('/auth/me',accessA);assert.equal(meA.status,200);assert.equal(meA.body.synthetic_uid,fixtures[0]!.uid);report.checks.login_refresh_restore=true;
 const loginB=await request('/auth/login',undefined,{synthetic_uid:fixtures[1]!.uid,password:fixtures[1]!.password});assert.equal(loginB.status,200);accessB=loginB.body.access_token;const meB=await request('/auth/me',accessB);assert.equal(meB.status,200);assert.notEqual(meB.body.principal_id,meA.body.principal_id);
 const chat=await request('/conversations',accessA,{});assert.equal(chat.status,201);const chatId=String(chat.body.conversation_id);report.created.conversations++;
 const answer=await request('/conversations/'+chatId+'/messages',accessA,{content:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'});assert.equal(answer.status,201);assert.equal(answer.body.assistant_message.insufficient_evidence,false);assert.ok(answer.body.assistant_message.citations.some((c:any)=>c.locator==='unit:M02:DOC-101'));report.created.messages+=2;report.created.citations+=answer.body.assistant_message.citations.length;
 const history=await request('/conversations/'+chatId,accessA);assert.equal(history.status,200);assert.deepEqual(history.body.messages,[answer.body.user_message,answer.body.assistant_message]);const list=await request('/conversations',accessA);assert.equal(list.status,200);assert.ok(list.body.conversations.some((c:any)=>c.conversation_id===chatId&&c.message_count===2));
 assert.equal((await request('/conversations/'+chatId,accessB)).status,404);assert.equal((await request('/conversations/'+chatId+'/messages',accessB,{content:'Consulta ajena controlada'})).status,404);assert.ok(!(await request('/conversations',accessB)).body.conversations.some((c:any)=>c.conversation_id===chatId));report.checks.account_isolation_and_ownership=true;
 const citation=answer.body.assistant_message.citations[0];const artifact=await fetch(`http://127.0.0.1:3003${citation.artifact_url}`,{headers:{Authorization:'Bearer '+accessA},signal:AbortSignal.timeout(15000)});assert.equal(artifact.status,200);assert.ok((await artifact.arrayBuffer()).byteLength>0);assert.equal((await fetch(`http://127.0.0.1:3003${citation.artifact_url}`,{signal:AbortSignal.timeout(15000)})).status,401);
 const persisted=(await candidateDb.query(`SELECT o.principal_id,count(DISTINCT m.id)::int messages,count(mc.*)::int citations,bool_and(mc.source_sha256=v.source_sha256 AND mc.source_locator=dc.locator AND mc.dataset_release_id=dc.dataset_release_id) provenance_ok FROM banuchat_auth.conversation_owners o JOIN banuchat.messages m ON m.conversation_id=o.conversation_id LEFT JOIN banuchat.message_citations mc ON mc.message_id=m.id LEFT JOIN banuchat.document_versions v ON v.id=mc.document_version_id LEFT JOIN banuchat.document_chunks dc ON dc.id=mc.chunk_id WHERE o.conversation_id=$1 GROUP BY o.principal_id`,[chatId])).rows[0];assert.equal(persisted.principal_id,meA.body.principal_id);assert.equal(persisted.messages,2);assert.equal(persisted.citations,report.created.citations);assert.equal(persisted.provenance_ok,true);report.checks.rag_history_citations_document=true;
 const abstentionChat=await request('/conversations',accessA,{});assert.equal(abstentionChat.status,201);report.created.conversations++;
 const abstention=await request('/conversations/'+abstentionChat.body.conversation_id+'/messages',accessA,{content:'Describe el mantenimiento de motores de aeronaves.'});assert.equal(abstention.status,201);assert.equal(abstention.body.assistant_message.insufficient_evidence,true);assert.deepEqual(abstention.body.assistant_message.citations,[]);report.created.messages+=2;assert.equal((await request('/conversations/not-a-uuid',accessA)).status,400);report.checks.errors_and_abstention=true;
 assert.equal(await fingerprint(candidateDb,true),before.candidateCorpus);assert.notEqual(await digest(candidateDb),before.candidateHistory);assert.equal(await fingerprint(i1bDb,true),before.i1bCorpus);assert.equal(await digest(i1bDb),before.i1bHistory);report.checks.candidate_only_writes_and_i1b_unchanged=true;
 report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error instanceof Error?error.name:'UNKNOWN';process.exitCode=1;}
finally{
 for(const token of [accessA,accessB])if(token)await request('/auth/logout',token,undefined,'POST').catch(()=>undefined);
 await Promise.all([candidateDb.end(),i1bDb.end()]);
 await writeFile(new URL('eval/auth/results/banuchat-o4-canonical-http.json',root),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,checks:report.checks,created:report.created,failure:report.failure??null}));
}
