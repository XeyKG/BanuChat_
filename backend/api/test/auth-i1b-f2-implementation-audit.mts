/** Final F2 audit: exact scope, private-value scan and read-only I1B corpus/session checks. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {root,environment,fingerprint} from './auth-i1b/environment.js';
const git=(args:string[])=>execFileSync('git',args,{cwd:fileURLToPath(root),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
try{
 const head=git(['rev-parse','HEAD']);assert.equal(head,'bbfcd9d54350cc51c16b9a6d2bcb30a6c057f52d');
 const tracked=git(['diff','--name-only']).split(/\r?\n/u).filter(Boolean);
 assert.deepEqual([...tracked].sort(),['backend/api/src/chat/document-evidence.ts','backend/api/src/chat/document-rag.ts','backend/api/src/generation/generator-client.ts','backend/api/src/generation/ollama-generator-client.ts','backend/api/test/ccd-context-adversarial.test.ts','backend/api/test/document-evidence.test.ts','backend/api/test/document-rag.test.ts','backend/api/test/messages.test.ts']);
 git(['diff','--exit-code','HEAD','--','backend/api/src/auth','backend/api/src/http','backend/api/src/application','backend/api/src/retrieval','backend/api/src/operations','backend/api/package.json','backend/api/package-lock.json','backend/api/openapi-v2.yaml','backend/api/api-contract-v2.md','mobile','infra/db','data','docs/academic','docs/operations']);
 const added=git(['ls-files','--others','--exclude-standard']).split(/\r?\n/u).filter(Boolean);
 for(const path of added)assert.ok(/^backend\/api\/test\/auth-i1b-f2-implementation[\w/.-]*$/u.test(path)||/^eval\/integration\/ccd-auth-i1b-f2-implementation(?:-review)?\.mts$/u.test(path)||/^eval\/auth\/results\/bch05-ccd-auth-i1b-f2-implementation-[\w-]+\.json$/u.test(path)||path==='docs/transition/bch05-ccd-auth-i1b-f2-implementation-checkpoint.md','UNEXPECTED_FILE');
 const config=JSON.parse(await readFile(new URL('infra/local/auth-i1b/ccd-deployment.json',root),'utf8'));
 const bytes=await readFile(new URL('infra/local/auth-i1b/f1/accounts.dpapi',root),'utf8');
 const decrypt=`Add-Type -AssemblyName System.Security; $f2Audit=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($f2Audit,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
 const accounts=JSON.parse(execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',decrypt],{input:bytes,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:10000})) as Array<{uid:string;password:string}>;
 assert.deepEqual(accounts.map(a=>a.uid),['U08000005','U08000006']);const secrets=[config.adminPassword,config.runtimePassword,config.provisionPassword,config.rateKey,...accounts.map(a=>a.password)];assert.ok(secrets.every(s=>typeof s==='string'&&s.length>0));
 const files=[];for(const path of [...tracked,...added]){const bytes=await readFile(new URL(path,root));assert.ok(secrets.every(s=>!bytes.toString().includes(s)),'SECRET_FOUND');files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const baselineConfig=git(['show','HEAD:backend/api/src/generation/generator-client.ts']).split('const GENERATOR_MODEL')[1];
 assert.equal((await readFile(new URL('backend/api/src/generation/generator-client.ts',root),'utf8')).trim().split('const GENERATOR_MODEL')[1],baselineConfig);
 const e=await environment();const db=new Pool({host:'127.0.0.1',port:e.port,database:e.database,user:e.admin,password:e.adminPassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});
 let integrity;try{
  const corpus=await fingerprint(db,true);assert.equal(corpus,'db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963');
  const sessions=(await db.query('SELECT count(*)::int n FROM banuchat_auth.sessions s JOIN banuchat_auth.accounts a ON a.id=s.principal_id WHERE a.synthetic_uid=ANY($1::text[]) AND s.revoked_at IS NULL',[accounts.map(a=>a.uid)])).rows[0].n;assert.equal(sessions,0);
  integrity={corpus_sha256:corpus,corpus_unchanged:true,unrevoked_fixture_sessions:sessions,sql_read_only:true};
 }finally{await db.end();}
 git(['diff','--check']);
 const result={checkpoint:'BCH-05/CCD-AUTH-I1B-F2 implementation',at:new Date().toISOString(),head,integrity,files,private_values_found:false,secret_scan_scope:'Exact private I1B passwords/rate key and F1 fixture passwords; manual review of output fields',contracts_sql_auth_mobile_ops_unchanged:true,generator_configuration_unchanged:true,git_diff_check:'PASS',android_executed_by_agent:false,no_commit_or_push:true};
 await writeFile(new URL(`eval/auth/results/bch05-ccd-auth-i1b-f2-implementation-audit-${Date.now()}.json`,root),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({files_scanned:files.length,private_values_found:false,integrity}));
}catch{console.log(JSON.stringify({status:'FAIL',reason:'F2_AUDIT_ASSERTION_OR_ACCESS_UNAVAILABLE'}));process.exitCode=1;}
