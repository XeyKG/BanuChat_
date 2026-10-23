/** F1 final audit: only the isolated CCD laboratory, no historical/source databases. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {environment,pool,root,evidence,f1Accounts,auditF1} from './auth-i1b-f1/environment.js';
const git=(args:string[])=>execFileSync('git',args,{cwd:fileURLToPath(root),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(git(['rev-parse','HEAD']),'762efcde1c5cb89e6ca505abcd0e5161c40e787d');
const tracked=git(['diff','--name-only']).split(/\r?\n/u).filter(Boolean);
assert.deepEqual(tracked.sort(),['backend/api/src/chat/document-evidence.ts','backend/api/test/document-evidence.test.ts','backend/api/test/document-rag.test.ts']);
const e=await environment(),db=pool(e),accounts=await f1Accounts();
try{
 const integrity=await auditF1(e);
 const counts=(await db.query(`SELECT (SELECT count(*)::int FROM banuchat_auth.accounts WHERE synthetic_uid=ANY($1::text[])) AS fixture_accounts,(SELECT count(*)::int FROM banuchat_auth.sessions s JOIN banuchat_auth.accounts a ON a.id=s.principal_id WHERE a.synthetic_uid=ANY($1::text[]) AND s.revoked_at IS NULL) AS unrevoked_fixture_sessions`,[accounts.map(a=>a.uid)])).rows[0];assert.equal(counts.fixture_accounts,2);assert.equal(counts.unrevoked_fixture_sessions,0);
 const protectedFiles=['backend/api/src/chat/document-rag.ts','backend/api/src/chat/conversation-context.ts','backend/api/src/generation/generator-client.ts','backend/api/src/generation/ollama-generator-client.ts','backend/api/src/retrieval/ollama-query-embedding-client.ts',...git(['ls-files','infra/db']).split(/\r?\n/u).filter(p=>/^infra\/db\/(?:00[1-9]|010|011)_/u.test(p))];
 git(['diff','--exit-code','HEAD','--',...protectedFiles,'backend/api/src/auth','backend/api/src/application','backend/api/openapi-v2.yaml','backend/api/api-contract-v2.md','mobile','data/synthetic','data/ccd/schemas']);
 const hashes=await Promise.all(protectedFiles.map(async path=>({path,sha256:createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')})));
 const added=git(['ls-files','--others','--exclude-standard']).split(/\r?\n/u).filter(Boolean),secrets=[e.adminPassword,e.runtimePassword,e.provisionPassword,e.rateKey,...accounts.map(a=>a.password)];
 for(const path of [...tracked,...added]){
  assert.ok(tracked.includes(path)||path.startsWith('backend/api/test/auth-i1b-503-f1-')||path.startsWith('backend/api/test/auth-i1b-f1/')||path.startsWith('eval/integration/ccd-auth-i1b-503-f1')||path.startsWith('eval/auth/results/bch05-ccd-auth-i1b-503-f1-')||path==='docs/transition/bch05-ccd-auth-i1b-503-f1-checkpoint.md',path);
  const content=await readFile(new URL(path,root),'utf8');assert.ok(secrets.every(secret=>!content.includes(secret)),'Private value in versionable file');
 }
 await evidence('audit',{checkpoint:'BCH-05/CCD-AUTH-I1B-503-F1',at:new Date().toISOString(),integrity,counts,protected_files:hashes,versionable_files_scanned:tracked.length+added.length,secrets_found:false,original_databases_accessed:false,operator_accounts_changed:false,android_executed:false});
 console.log(JSON.stringify({integrity,counts,protected_files:hashes.length,secrets_found:false}));
}finally{await db.end();}
