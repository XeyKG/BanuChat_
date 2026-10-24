/** O4 read-only divergence audit. It emits counts and hashes, never row values. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {candidateEnvironment,candidatePool} from './ccd-candidate-o3/environment.js';
import {environment,pool,root} from './auth-i1b/environment.js';

const tables=[
 ['banuchat','conversations'],['banuchat','messages'],['banuchat','message_citations'],
 ['banuchat_auth','accounts'],['banuchat_auth','password_credentials'],['banuchat_auth','profile_bindings'],
 ['banuchat_auth','corpus_grants'],['banuchat_auth','sessions'],['banuchat_auth','refresh_tokens'],
 ['banuchat_auth','security_events'],['banuchat_auth','auth_rate_limits'],
] as const;
const candidate=await candidateEnvironment(),source=await environment();
const candidateDb=candidatePool(candidate,'admin',true),sourceDb=pool(source,'admin');

async function primaryKey(db:any,schema:string,table:string){
 const result=await db.query(`SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid=($1||'.'||$2)::regclass AND i.indisprimary ORDER BY array_position(i.indkey,a.attnum)`,[schema,table]);
 assert.ok(result.rows.length>0,`${schema}.${table} has no primary key`);return result.rows.map((r:any)=>r.attname as string);
}
async function rows(db:any,schema:string,table:string,key:string[]){
 const result=await db.query(`SELECT to_jsonb(t) AS row FROM ${schema}.${table} t`),map=new Map<string,string>();
 for(const {row} of result.rows){const id=key.map(k=>JSON.stringify(row[k])).join('|');map.set(id,createHash('sha256').update(JSON.stringify(row)).digest('hex'));}
 return map;
}
function compare(left:Map<string,string>,right:Map<string,string>){
 const only_source=[...left.keys()].filter(k=>!right.has(k)),only_candidate=[...right.keys()].filter(k=>!left.has(k));
 const changed=[...left.keys()].filter(k=>right.has(k)&&left.get(k)!==right.get(k));
 return{source:left.size,candidate:right.size,only_source:only_source.length,only_candidate:only_candidate.length,changed_common:changed.length,
  source_sha256:createHash('sha256').update(JSON.stringify([...left].sort())).digest('hex'),candidate_sha256:createHash('sha256').update(JSON.stringify([...right].sort())).digest('hex')};
}
const report:any={checkpoint:'BANUCHAT-O4-PREFLIGHT',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 source:{container:source.name,port:source.port,volume:source.volume,network:source.network},candidate:{container:candidate.name,port:candidate.port,volume:candidate.volume,network:candidate.network},tables:{}};
try{
 for(const [schema,table] of tables){const key=await primaryKey(candidateDb,schema,table);assert.deepEqual(await primaryKey(sourceDb,schema,table),key);report.tables[`${schema}.${table}`]=compare(await rows(sourceDb,schema,table,key),await rows(candidateDb,schema,table,key));}
 const c=report.tables;
 report.classification={
  controlled_o3_candidate_writes:c['banuchat.conversations'].only_candidate===2&&c['banuchat.messages'].only_candidate===6&&c['banuchat.message_citations'].only_candidate===1,
  possible_operator_history_on_i1b:['banuchat.conversations','banuchat.messages','banuchat.message_citations'].some(t=>c[t].only_source>0||c[t].changed_common>0),
  possible_operator_auth_on_i1b:['banuchat_auth.sessions','banuchat_auth.refresh_tokens','banuchat_auth.security_events','banuchat_auth.auth_rate_limits'].some(t=>c[t].only_source>0||c[t].changed_common>0),
  account_state_equal:['banuchat_auth.accounts','banuchat_auth.password_credentials','banuchat_auth.profile_bindings','banuchat_auth.corpus_grants'].every(t=>c[t].only_source===0&&c[t].only_candidate===0&&c[t].changed_common===0),
 };
 report.safe_to_promote_without_reconciliation=report.classification.controlled_o3_candidate_writes&&!report.classification.possible_operator_history_on_i1b&&!report.classification.possible_operator_auth_on_i1b&&report.classification.account_state_equal;
}finally{await Promise.all([candidateDb.end(),sourceDb.end()]);}
await writeFile(new URL('eval/auth/results/banuchat-o4-preflight.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({classification:report.classification,safe_to_promote_without_reconciliation:report.safe_to_promote_without_reconciliation,tables:report.tables}));
