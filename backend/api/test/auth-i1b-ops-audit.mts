/** Filesystem/secret audit; never queries original databases or operator conversations. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {root} from './auth-i1b/environment.js';
const git=(args:string[])=>execFileSync('git',args,{cwd:fileURLToPath(root),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
try{
 const head=git(['rev-parse','HEAD']);assert.equal(head,'1583457cf818d8f7c359671c51093ab7832587df');
 const protectedPaths=['backend/api/src/chat','backend/api/src/application','backend/api/src/auth','backend/api/src/generation','backend/api/src/retrieval','backend/api/src/http','backend/api/api-contract-v2.md','backend/api/openapi-v2.yaml','infra/db','data','mobile/src','mobile/package.json','mobile/package-lock.json','backend/api/package-lock.json','eval/integration','docs/academic'];
 git(['diff','--exit-code','HEAD','--',...protectedPaths]);
 const tracked=git(['diff','--name-only']).split(/\r?\n/u).filter(Boolean);assert.deepEqual(tracked,['backend/api/package.json']);
 const added=git(['ls-files','--others','--exclude-standard']).split(/\r?\n/u).filter(Boolean);
 const allow=(p:string)=>/^backend\/api\/(?:src\/operations\/ccd-preflight\.ts|test\/(?:auth-i1b-(?:f2|ops)[\w/.-]*|ccd-(?:context-adversarial|preflight)\.test\.ts))$/u.test(p)||/^eval\/auth\/results\/bch05-ccd-auth-i1b-(?:f2|ops)-[\w-]+\.json$/u.test(p)||/^docs\/(?:operations\/ccd-auth-i1b-ops\.md|transition\/bch05-ccd-auth-i1b-(?:f2|ops|mission)-checkpoint\.md)$/u.test(p)||p==='mobile/test/ccd-session-ownership.test.ts';
 assert.ok(added.every(allow),'OUT_OF_SCOPE_FILE');
 const config=JSON.parse(await readFile(new URL('infra/local/auth-i1b/ccd-deployment.json',root),'utf8'));
 // Offline audit: decrypt existing fixtures in memory only. Never invoke the
 // fixture helper, which requires Docker and also contains a provisioning branch.
 const encrypted=await readFile(new URL('infra/local/auth-i1b/f1/accounts.dpapi',root),'utf8');
 const unprotect=`Add-Type -AssemblyName System.Security; $auditBytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($auditBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
 const accounts=JSON.parse(execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',unprotect],{input:encrypted,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:10000})) as Array<{uid:string;password:string}>;
 assert.deepEqual(accounts.map(a=>a.uid),['U08000005','U08000006']);
 const secrets=[config.adminPassword,config.runtimePassword,config.provisionPassword,config.rateKey,...accounts.map(a=>a.password)];
 assert.ok(secrets.every(s=>typeof s==='string'&&s.length>0),'PRIVATE_SCAN_INPUT_UNAVAILABLE');
 const files=[];for(const path of [...tracked,...added]){const bytes=await readFile(new URL(path,root));const text=bytes.toString();assert.ok(secrets.every(secret=>!text.includes(secret)),'SECRET_FOUND');files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
 git(['diff','--check']);
 const report={checkpoint:'BCH-05/CCD-AUTH-I1B-OPS',at:new Date().toISOString(),head,protected_runtime_and_historical_paths_unchanged:true,protected_paths:protectedPaths,scanned_files:files,secrets_found:false,secret_scan_scope:'Exact private I1B credentials/rate key and existing F1 fixture passwords; code review for other sensitive output',git_diff_check:'PASS',no_commit_or_push:true};
 await writeFile(new URL(`eval/auth/results/bch05-ccd-auth-i1b-ops-audit-${Date.now()}.json`,root),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({head,files_scanned:files.length,secrets_found:false,protected_runtime_unchanged:true}));
}catch{console.log(JSON.stringify({status:'FAIL',reason:'AUDIT_ASSERTION_OR_PRIVATE_ACCESS_UNAVAILABLE'}));process.exitCode=1;}
