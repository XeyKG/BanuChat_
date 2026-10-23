import {randomBytes,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import type {Environment} from './environment.js';
import {local,pool} from './environment.js';
import {SyntheticAccountProvisioner} from '../../src/auth/provision-account.js';
import {LocalPasswordAdministrator} from '../../src/auth/local-password-administrator.js';
export interface DemoAccount {uid:string;name:string;password:string;}
const protect=`Add-Type -AssemblyName System.Security; $i1bBytes=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($i1bBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
const unprotect=`Add-Type -AssemblyName System.Security; $i1bBytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($i1bBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
export async function provisionDemoAccounts(e:Environment){
 const runtime=pool(e,'runtime'),provisioner=pool(e,'provisioner');
 try{
 const administrator=await LocalPasswordAdministrator.create({pool:runtime,database:e.database,deployment:e.deployment,evidence_mode:e.mode});
 const accounts:DemoAccount[]=[{uid:'U08000001',name:'Alba Ficticia CCD',password:randomBytes(30).toString('base64url')},{uid:'U08000002',name:'Bruno Ficticio CCD',password:randomBytes(30).toString('base64url')}];
 for(const a of accounts){await new SyntheticAccountProvisioner(provisioner,e.database,e.mode).provision({synthetic_uid:a.uid,synthetic_display_name:a.name,profile_key:'ccd-local-demo',recovery_email:'demo-'+a.uid.toLowerCase()+'@banuchat.test'},randomUUID());await administrator.establish(a.uid,a.password);}
 const encrypted=execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',protect],{input:JSON.stringify(accounts),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 const path=fileURLToPath(new URL('operator-accounts.dpapi',local));await writeFile(path,encrypted);
 const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];execFileSync('icacls',[path,'/inheritance:r','/grant:r',`*${sid}:(F)`],{stdio:'ignore'});
 return accounts;
 }finally{await runtime.end();await provisioner.end();}
}
export async function demoAccounts():Promise<DemoAccount[]>{
 const bytes=await readFile(new URL('operator-accounts.dpapi',local),'utf8');
 return JSON.parse(execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',unprotect],{input:bytes,encoding:'utf8',stdio:['pipe','pipe','pipe']})) as DemoAccount[];
}
