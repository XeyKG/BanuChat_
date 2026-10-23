/** F1 fixtures are separate from operator accounts. Never reset or reuse their sessions. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {environment,pool,local,root,evidence as originalEvidence,fingerprint,type Environment} from '../auth-i1b/environment.js';
import {SyntheticAccountProvisioner} from '../../src/auth/provision-account.js';
import {LocalPasswordAdministrator} from '../../src/auth/local-password-administrator.js';
export {environment,pool,root,fingerprint};
const dir=new URL('f1/',local),credentials=new URL('accounts.dpapi',dir),state=new URL('state.json',dir);
export const evidence=(name:string,result:unknown,privateOnly=false)=>originalEvidence('503-f1-'+name,result,privateOnly);
interface Account{uid:string;password:string;}
const protect=`Add-Type -AssemblyName System.Security; $f1=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($f1,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
const unprotect=`Add-Type -AssemblyName System.Security; $f1=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($f1,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
async function exists(path:URL){try{await access(path);return true;}catch{return false;}}
async function history(db:Pool,ids:string[]){return(await db.query(`SELECT md5(COALESCE(string_agg(row_text,E'\n' ORDER BY row_text),'')) AS digest FROM (SELECT to_jsonb(c)::text row_text FROM banuchat.conversations c WHERE c.id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(m)::text FROM banuchat.messages m WHERE m.conversation_id=ANY($1::uuid[]) UNION ALL SELECT to_jsonb(mc)::text FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=ANY($1::uuid[])) t`,[ids])).rows[0].digest as string;}
export async function f1Accounts():Promise<Account[]>{
 const e=await environment();assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);
 if(await exists(credentials)){
  const bytes=await readFile(credentials,'utf8');const accounts=JSON.parse(execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',unprotect],{input:bytes,encoding:'utf8',stdio:['pipe','pipe','pipe']})) as Account[];
  assert.deepEqual(accounts.map(a=>a.uid),['U08000005','U08000006']);return accounts;
 }
 assert.equal(await exists(state),false,'Partial F1 setup retained; inspect it rather than resetting accounts');
 const db=pool(e),runtime=pool(e,'runtime'),provision=pool(e,'provisioner');
 try{
  const ids=(await db.query('SELECT id FROM banuchat.conversations ORDER BY id')).rows.map(r=>r.id as string);
  const baseline={ids,history:await history(db,ids),corpus:await fingerprint(db,true)};
  for(const uid of ['U08000005','U08000006'])assert.equal((await db.query('SELECT count(*)::int n FROM banuchat_auth.accounts WHERE synthetic_uid=$1',[uid])).rows[0].n,0);
  await mkdir(dir,{recursive:true});await writeFile(state,JSON.stringify(baseline));
  const administrator=await LocalPasswordAdministrator.create({pool:runtime,database:e.database,deployment:e.deployment,evidence_mode:'ccd_local'});
  const accounts=['U08000005','U08000006'].map(uid=>({uid,password:randomBytes(30).toString('base64url')}));
  for(const [index,a] of accounts.entries()){
   await new SyntheticAccountProvisioner(provision,e.database,'ccd_local').provision({synthetic_uid:a.uid,synthetic_display_name:`Cuenta Ficticia F1 ${index+1}`,profile_key:'ccd-local-demo',recovery_email:`f1-${a.uid.toLowerCase()}@banuchat.test`},randomUUID());
   await administrator.establish(a.uid,a.password);
  }
  const encrypted=execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',protect],{input:JSON.stringify(accounts),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();await writeFile(credentials,encrypted);
  const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];execFileSync('icacls',[fileURLToPath(credentials),'/inheritance:r','/grant:r',`*${sid}:(F)`],{stdio:'ignore'});
  return accounts;
 }finally{await Promise.all([db,runtime,provision].map(p=>p.end()));}
}
export async function auditF1(e:Environment){
 const db=new Pool({host:'127.0.0.1',port:e.port,database:e.database,user:e.admin,password:e.adminPassword,options:'-c default_transaction_read_only=on'});
 try{const baseline=JSON.parse(await readFile(state,'utf8')) as {ids:string[];history:string;corpus:string};
  const corpus=await fingerprint(db,true),existing=await history(db,baseline.ids);assert.equal(corpus,baseline.corpus);assert.equal(existing,baseline.history);
  return{corpus_sha256:corpus,corpus_unchanged:true,previous_history_unchanged:true};
 }finally{await db.end();}
}
