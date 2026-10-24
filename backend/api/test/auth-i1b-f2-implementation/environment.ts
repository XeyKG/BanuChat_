/** F2 uses existing fictitious F1 fixtures, never operator accounts or setup. */
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {Pool} from 'pg';
import {environment,pool,root,storage,fingerprint,evidence as save,type Environment} from '../auth-i1b/environment.js';
import {f1Accounts} from '../auth-i1b-f1/environment.js';
export {environment,pool,root,storage,fingerprint};
const run=Date.now();
export const evidence=(name:string,result:unknown,privateOnly=false)=>save(`f2-implementation-${name}-${run}`,result,privateOnly);
export async function accounts(){
 await access(new URL('infra/local/auth-i1b/f1/accounts.dpapi',root));
 const e=await environment(),db=pool(e);
 try{assert.equal((await db.query("SELECT count(*)::int n FROM banuchat_auth.sessions s JOIN banuchat_auth.accounts a ON a.id=s.principal_id WHERE a.synthetic_uid=ANY($1::text[]) AND s.revoked_at IS NULL",[['U08000005','U08000006']])).rows[0].n,0,'F1 fixtures have active sessions; do not interfere');}
 finally{await db.end();}
 return f1Accounts();
}
export async function integrityGuard(e:Environment){
 const db=new Pool({host:'127.0.0.1',port:e.port,database:e.database,user:e.admin,password:e.adminPassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});
 try{
  const ids=(await db.query('SELECT id FROM banuchat.conversations')).rows.map(r=>r.id);
  const history=async()=>(await db.query(`SELECT md5(COALESCE(string_agg(row_text,E'\n' ORDER BY row_text),'')) digest FROM (SELECT to_jsonb(c)::text row_text FROM banuchat.conversations c WHERE c.id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(m)::text FROM banuchat.messages m WHERE m.conversation_id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(mc)::text FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=ANY($1::uuid[])) t`,[ids])).rows[0].digest;
  const corpus=await fingerprint(db,true),previous=await history();
  return{async verify(){try{assert.equal(await fingerprint(db,true),corpus);assert.equal(await history(),previous);return{corpus_sha256:corpus,corpus_unchanged:true,previous_history_unchanged:true};}finally{await db.end();}}};
 }catch(error){await db.end();throw error;}
}
